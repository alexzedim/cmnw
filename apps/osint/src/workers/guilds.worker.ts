import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Job, Queue } from 'bullmq';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { difference, get, intersection } from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import * as changeCase from 'change-case';

import {
  ACTION_LOG,
  API_HEADERS_ENUM,
  apiConstParams,
  capitalize,
  characterAsGuildMember,
  CharacterJobQueue,
  charactersQueue,
  FACTION,
  findRealm,
  getRandomProxy,
  GuildExistsOrCreate,
  GuildJobQueue,
  guildsQueue,
  ICharacterGuildMember,
  IGuildRoster,
  IGuildSummary,
  incErrorCount,
  IRGuildRoster,
  isEuRegion,
  isGuildRoster,
  OSINT_4_HOURS_MS,
  OSINT_GM_RANK,
  OSINT_SOURCE,
  PLAYABLE_CLASS, STATUS_CODES,
  toGuid,
  toSlug,
} from '@app/resources';

import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  GuildsEntity,
  KeysEntity,
  CharactersGuildsLogsEntity,
  RealmsEntity,
} from '@app/pg';

import { coreConfig } from '@app/configuration';

@Processor(guildsQueue.name, guildsQueue.workerOptions)
@Injectable()
export class GuildsWorker extends WorkerHost {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectQueue(charactersQueue.name)
    private readonly characterQueue: Queue<CharacterJobQueue, number>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly characterGuildsMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly charactersGuildsLogsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {
    super();
  }

  public async process(job: Job<GuildJobQueue, number>): Promise<number> {
    try {
      const { data: args } = job;

      const { guildEntity, isNew, isNotReadyToUpdate, isCreateOnlyUnique} = await this.guildExistOrCreate(args);

      if (isNotReadyToUpdate) {
        await job.updateProgress(100);
        this.logger.warn(`isNotReadyToUpdate: ${guildEntity.guid} | ${isNotReadyToUpdate}`);
        return guildEntity.statusCode;
      }

      if (isCreateOnlyUnique) {
        await job.updateProgress(100);
        this.logger.warn(`createOnlyUnique: ${guildEntity.guid} | ${isCreateOnlyUnique}`);
        return guildEntity.statusCode;
      }

      const guildEntityOriginal = this.guildsRepository.create(guildEntity);
      const nameSlug = toSlug(guildEntity.name);

      const isNotEuRegion = !isEuRegion(args.region);
      if (isNotEuRegion) {
        this.logger.log('Not EU region');
        await job.updateProgress(100);
        return 305;
      }

      await job.updateProgress(5);

      this.BNet = new BlizzAPI({
        region: args.region || 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        httpsAgent: coreConfig.useProxy ? await getRandomProxy(this.keysRepository) : undefined,
      });
      /**
       * Inherit safe values
       * from args in any case
       * summary overwrites later
       */
      if (args.updatedBy) guildEntity.updatedBy = args.updatedBy;
      await job.updateProgress(10);

      const summary = await this.getSummary(nameSlug, guildEntity.realm, this.BNet);
      Object.assign(guildEntity, summary);
      await job.updateProgress(25);

      const roster = await this.getRoster(guildEntity, this.BNet);
      roster.updatedAt = guildEntity.updatedAt;
      await this.updateRoster(guildEntityOriginal, roster, isNew);
      await job.updateProgress(50);

      if (isNew) {
        // --- Check was guild renamed --- //
        const guildEntityById = await this.guildsRepository.findOneBy({
          id: guildEntityOriginal.id,
          realm: guildEntityOriginal.realm,
        });

        if (guildEntityById) {
          await this.diffGuildEntity(guildEntityById, guildEntity);
          await this.updateGuildMaster(guildEntityById, roster);
        }
      } else {
        await this.diffGuildEntity(guildEntityOriginal, guildEntity);
        await this.updateGuildMaster(guildEntityOriginal, roster);
      }

      await job.updateProgress(90);
      await this.guildsRepository.save(guildEntity);

      await job.updateProgress(100);

      this.logger.log(`${guildEntityOriginal.statusCode} >> guild: ${guildEntityOriginal.guid}`);

      return guildEntity.statusCode;
    } catch (errorOrException) {
      await job.log(errorOrException);

      this.logger.error(
        {
          logTag: 'GuildsWorker',
          guid: `${job.data.name}@${job.data.realm}`,
          error: errorOrException,
        }
      );

      return 500;
    }
  }

  private async updateRoster(guildEntity: GuildsEntity, roster: IGuildRoster, isNew: boolean) {
    try {
      const { members: updatedRosterMembers } = roster;

      if (!updatedRosterMembers.length) {
        this.logger.debug(`Guild roster for ${guildEntity.guid} was not found!`);
        return;
      }

      const guildsMembersEntities =
        await this.characterGuildsMembersRepository.findBy({
          guildGuid: guildEntity.guid,
        });

      const [originalRoster, updatedRoster] = [
        new Map(
          guildsMembersEntities.map((guildMember) => [
            guildMember.characterId,
            guildMember,
          ]),
        ),
        new Map(
          updatedRosterMembers.map((member) => [member.id, member]),
        )
      ];

      const originalRosterCharIds = Array.from(originalRoster.keys());
      const updatedRosterCharIds = Array.from(updatedRoster.keys());

      const membersIntersectIds = intersection(
          updatedRosterCharIds,
          originalRosterCharIds,
        );

      const membersJoinedIds = difference(updatedRosterCharIds, originalRosterCharIds);
      const membersLeaveIds = difference(originalRosterCharIds, updatedRosterCharIds);

      const interLength = membersIntersectIds.length;
      const joinsLength = membersJoinedIds.length;
      const leaveLength = membersLeaveIds.length;

      if (interLength) {
        await lastValueFrom(
          from(membersIntersectIds).pipe(
            mergeMap(async (guildMemberId) => {
              try {
                const guildMemberOriginal = originalRoster.get(guildMemberId);
                const guildMemberUpdated = updatedRoster.get(guildMemberId);
                const isRankChanged =
                  guildMemberUpdated.rank !== guildMemberOriginal.rank;

                if (!isRankChanged) return;

                const isNotGuildMaster =
                  guildMemberOriginal.rank !== OSINT_GM_RANK || guildMemberUpdated.rank !== OSINT_GM_RANK;
                const isDemote = guildMemberUpdated.rank > guildMemberOriginal.rank;
                // const isPromote = guildMemberUpdated.rank < guildMemberOriginal.rank;

                const eventAction = isDemote
                  ? ACTION_LOG.DEMOTE
                  : ACTION_LOG.PROMOTE;

                if (isNotGuildMaster) {
                  const logEntityGuildMemberDemote =
                    this.charactersGuildsLogsRepository.create({
                    characterGuid: guildMemberOriginal.characterGuid,
                    guildGuid: guildEntity.guid,
                    original: String(guildMemberOriginal.rank),
                    updated: String(guildMemberUpdated.rank),
                    action: eventAction,
                    scannedAt: guildEntity.updatedAt,
                    createdAt: roster.updatedAt,
                  });

                  await Promise.allSettled([
                    this.charactersGuildsLogsRepository.save(logEntityGuildMemberDemote),
                    this.charactersRepository.update(
                      { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
                      {
                        guildRank : guildMemberUpdated.rank,
                        updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                      },
                    ),
                    this.characterGuildsMembersRepository.update(
                      {
                        characterGuid: guildMemberOriginal.characterGuid,
                        guildGuid: guildEntity.guid,
                      },
                      {
                        rank: guildMemberUpdated.rank,
                        updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                      },
                    ),
                  ]);
                }
              } catch (errorOrException) {
                this.logger.error(
                  {
                    logTag: 'membersIntersectIds',
                    guildGuid: guildEntity.guid,
                    error: JSON.stringify(errorOrException),
                  }
                );
              }
            }),
          ),
        );
      }

      if (joinsLength && !isNew) {
        await lastValueFrom(
          from(membersJoinedIds).pipe(
            mergeMap(async (guildMemberId) => {
              try {
                const guildMemberUpdated = updatedRoster.get(guildMemberId);
                const isNotGuildMaster = guildMemberUpdated.rank !== OSINT_GM_RANK;

                const charactersGuildsMembersEntity =
                  this.characterGuildsMembersRepository.create({
                    guildGuid: guildEntity.guid,
                    guildId: guildEntity.id,
                    characterId: guildMemberUpdated.id,
                    characterGuid: guildMemberUpdated.guid,
                    realmId: guildEntity.realmId,
                    realmName: guildEntity.realmName,
                    realm: guildEntity.realm,
                    rank: guildMemberUpdated.rank,
                    createdBy: OSINT_SOURCE.GUILD_ROSTER,
                    updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    lastModified: roster.updatedAt,
                  });

                if (isNotGuildMaster) {
                  const logEntityGuildMemberJoin =
                    this.charactersGuildsLogsRepository.create({
                      characterGuid: guildMemberUpdated.guid,
                      guildGuid: guildEntity.guid,
                      updated: String(guildMemberUpdated.rank),
                      action: ACTION_LOG.JOIN,
                      scannedAt: guildEntity.updatedAt,
                      createdAt: roster.updatedAt,
                    });

                  await this.charactersGuildsLogsRepository.save(logEntityGuildMemberJoin);
                }
                await Promise.allSettled([
                  this.characterGuildsMembersRepository.save(
                    charactersGuildsMembersEntity,
                  ),
                  this.charactersRepository.update(
                    { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
                    {
                      guild: guildEntity.name,
                      guildId: guildEntity.id,
                      guildGuid: guildEntity.guid,
                      guildRank: guildMemberUpdated.rank,
                      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    },
                  ),
                ]);
              } catch (errorOrException) {
                this.logger.error(
                  {
                    logTag: 'membersJoinedIds',
                    guildGuid: guildEntity.guid,
                    error: JSON.stringify(errorOrException),
                  }
                );
              }
            }),
          ),
        );
      }

      if (leaveLength) {
        await lastValueFrom(
          from(membersLeaveIds).pipe(
            mergeMap(async (guildMemberId) => {
              try {
                const guildMemberOriginal = originalRoster.get(guildMemberId);
                const isNotGuildMaster = guildMemberOriginal.rank !== OSINT_GM_RANK;

                if (isNotGuildMaster) {
                  const logEntityGuildMemberLeave =
                    this.charactersGuildsLogsRepository.create({
                      characterGuid: guildMemberOriginal.characterGuid,
                      guildGuid: guildEntity.guid,
                      original: String(guildMemberOriginal.rank),
                      action: ACTION_LOG.LEAVE,
                      scannedAt: guildEntity.updatedAt,
                      createdAt: roster.updatedAt,
                    })
                  await this.charactersGuildsLogsRepository.save(logEntityGuildMemberLeave);
                }
                await Promise.allSettled([
                  this.characterGuildsMembersRepository.delete({
                    guildGuid: guildEntity.guid,
                    characterGuid: guildMemberOriginal.characterGuid,
                  }),
                  this.charactersRepository.update(
                    {
                      guid: guildMemberOriginal.characterGuid,
                      guildGuid: guildEntity.guid,
                    },
                    {
                      guild: null,
                      guildId: null,
                      guildGuid: null,
                      guildRank: null,
                      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    },
                  ),
                ]);
              } catch (errorOrException) {
                this.logger.error(
                  {
                    logTag: 'membersLeaveIds',
                    guildGuid: guildEntity.guid,
                    error: JSON.stringify(errorOrException),
                  }
                );
              }
            }),
          ),
        );
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: 'updateRoster',
          guildGuid: guildEntity.guid,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async getSummary(
    guildNameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IGuildSummary>> {
    const summary: Partial<IGuildSummary> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/data/wow/guild/${realmSlug}/${guildNameSlug}`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      if (!response || typeof response !== 'object') return summary;

      const keys = ['id', 'name', 'achievement_points'];

      Object.entries(response).map(([key, value]) => {
        if (keys.includes(key) && value !== null) summary[changeCase.camelCase(key)] = value;

        if (key === 'faction' && typeof value === 'object' && value !== null) {
          if (value.type && value.name === null) {
            if (value.type.toString().startsWith('A')) summary.faction = FACTION.A;
            if (value.type.toString().startsWith('H')) summary.faction = FACTION.H;
          } else {
            summary.faction = value.name;
          }
        }

        if (key === 'realm' && typeof value === 'object' && value !== null) {
          if (value.id && value.name && value.slug) {
            summary.realmId = value.id;
            summary.realmName = value.name;
            summary.realm = value.slug;
          }
        }

        if (key === 'member_count') {
          summary.membersCount = value;
        }

        if (key === 'last_modified') summary.lastModified = new Date(value);
        if (key === 'created_timestamp') summary.createdTimestamp = new Date(value);
      });

      summary.statusCode = 200;
      return summary;
    } catch (errorOrException) {
      summary.statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_GUILD);
      const isTooManyRequests = summary.statusCode === 429;
      if (isTooManyRequests)
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );

      this.logger.error(
        {
          logTag: 'getSummary',
          guildGuid: `${guildNameSlug}@${realmSlug}`,
          statusCode: summary.statusCode,
          error: JSON.stringify(errorOrException),
        }
      );

      return summary;
    }
  }

  private async getRoster(
    guildEntity: GuildsEntity,
    BNet: BlizzAPI,
  ): Promise<IGuildRoster> {
    const roster: IGuildRoster = { members: [] };
    try {
      const guildNameSlug = toSlug(guildEntity.name);

      const response = await BNet.query<Readonly<IRGuildRoster>>(
        `/data/wow/guild/${guildEntity.realm}/${guildNameSlug}/roster`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      if (!isGuildRoster(response)) return roster;

      await lastValueFrom(
        from(response.members).pipe(
          mergeMap(async (member) => {
            try {
              const isMember = 'character' in member && 'rank' in member;
              if (!isMember) return;

              const isGM = member.rank === OSINT_GM_RANK;
              const realmSlug = member.character.realm.slug ?? guildEntity.realm;
              const guid = toSlug(`${member.character.name}@${realmSlug}`);
              const level = member.character.level ? member.character.level : null;
              const characterClass = PLAYABLE_CLASS.has(
                member.character.playable_class.id,
              )
                ? PLAYABLE_CLASS.get(member.character.playable_class.id)
                : null;

              if (isGM) {
                // --- Force update GM character for further diff compare --- //
                await this.characterQueue.add(
                  guid,
                  {
                    guid,
                    name: member.character.name,
                    realm: guildEntity.realm,
                    guild: guildEntity.name,
                    guildGuid: toGuid(guildNameSlug, guildEntity.realm),
                    guildId: guildEntity.id,
                    class: characterClass,
                    faction: guildEntity.faction,
                    level,
                    lastModified: guildEntity.lastModified,
                    updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    createdBy: OSINT_SOURCE.GUILD_ROSTER,
                    accessToken: BNet.accessTokenObject.access_token,
                    clientId: BNet.clientId,
                    clientSecret: BNet.clientSecret,
                    createOnlyUnique: false,
                    forceUpdate: 1,
                    guildRank: 0,
                    region: 'eu',
                  },
                  {
                    jobId: guid,
                    priority: 2,
                  },
                );
              }

              const guildMember: ICharacterGuildMember = {
                guid,
                id: member.character.id,
                name: member.character.name,
                guildNameSlug,
                rank: Number(member.rank),
                level,
                class: characterClass,
              };

              await characterAsGuildMember(
                this.charactersRepository,
                guildEntity,
                guildMember,
              );

              roster.members.push({
                guid,
                id: member.character.id,
                rank: member.rank,
                level,
              });
            } catch (errorOrException) {
              this.logger.error(
                {
                  logTag: 'getRoster',
                  member: member.character.id,
                  guildGuid: guildEntity.guid,
                  error: JSON.stringify(errorOrException),
                }
              );
            }
          }, 20),
        ),
      );

      return roster;
    } catch (errorOrException) {
      roster.statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_ROSTER);

      const isTooManyRequests = roster.statusCode === 429;
      if (isTooManyRequests)
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );

      this.logger.error(
        {
          logTag: 'getRoster',
          guildGuid: guildEntity.guid,
          statusCode: roster.statusCode,
          error: JSON.stringify(errorOrException),
        }
      );

      return roster;
    }
  }

  // @todo research tests on data sample!!
  private async updateGuildMaster(
    guildEntity: GuildsEntity,
    updatedRoster: IGuildRoster,
  ) {
    try {
      const originalGM =
        await this.characterGuildsMembersRepository.findOneBy({
          guildGuid: guildEntity.guid,
          rank: OSINT_GM_RANK,
        });

      if (!originalGM) return;

      const newGM = updatedRoster.members.find(
        (guildMember) => guildMember.rank === OSINT_GM_RANK,
      );

      const isGMChanged =
        Number(originalGM.characterId) !== Number(newGM.id);

      if (!isGMChanged) {
        this.logger.debug(
          `No guild transit ${guildEntity.guid} | GMs: ${originalGM.characterId} :: ${newGM.id}`,
        );
        return;
      }

      const [characterGM, newCharacterGM] = await Promise.all([
        this.charactersRepository.findOneBy({
          guid: originalGM.characterGuid,
          hashA: Not(IsNull()),
        }),
        this.charactersRepository.findOneBy({
          guid: newGM.guid,
          hashA: Not(IsNull()),
        }),
      ]);

      const logEntityGuildMasterEvents: CharactersGuildsLogsEntity[] = [];
      const isCharactersGMFound =
        Boolean(characterGM) && Boolean(newCharacterGM);

      if (isCharactersGMFound) {
        const isCharacterGMFamily =
          characterGM.hashA === newCharacterGM.hashA;

        const logEntityInheritGuildMaster = [
          this.charactersGuildsLogsRepository.create({
            guildGuid: guildEntity.guid,
            characterGuid: originalGM.characterGuid,
            original: originalGM.characterGuid,
            updated: newGM.guid,
            action: isCharacterGMFamily
              ? ACTION_LOG.GUILD_INHERIT
              : ACTION_LOG.GUILD_OWNERSHIP,
            scannedAt: guildEntity.updatedAt,
            createdAt: updatedRoster.updatedAt,
          }),
          this.charactersGuildsLogsRepository.create({
            guildGuid: guildEntity.guid,
            characterGuid: newGM.guid,
            original: originalGM.characterGuid,
            updated: newGM.guid,
            action: isCharacterGMFamily
              ? ACTION_LOG.GUILD_INHERIT
              : ACTION_LOG.GUILD_OWNERSHIP,
            scannedAt: guildEntity.updatedAt,
            createdAt: updatedRoster.updatedAt,
          })
        ];

        logEntityGuildMasterEvents.push(...logEntityInheritGuildMaster);
      } else {
        const logEntityInheritGuildMaster = [
          this.charactersGuildsLogsRepository.create({
            guildGuid: guildEntity.guid,
            characterGuid: originalGM.characterGuid,
            original: originalGM.characterGuid,
            updated: newGM.guid,
            action: ACTION_LOG.GUILD_TRANSIT,
            scannedAt: guildEntity.updatedAt,
            createdAt: updatedRoster.updatedAt,
          }),
          this.charactersGuildsLogsRepository.create({
            guildGuid: guildEntity.guid,
            characterGuid: newGM.guid,
            original: originalGM.characterGuid,
            updated: newGM.guid,
            action: ACTION_LOG.GUILD_TRANSIT,
            scannedAt: guildEntity.updatedAt,
            createdAt: updatedRoster.updatedAt,
          }),
        ];

        logEntityGuildMasterEvents.push(...logEntityInheritGuildMaster);
      }

      await this.charactersGuildsLogsRepository.save(logEntityGuildMasterEvents);

      const [logEvent] = logEntityGuildMasterEvents;
      this.logger.debug(
        `Guild ${guildEntity.guid} action event ${logEvent.action} has been logged`,
      );
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: 'updateGuildMaster',
          guildGuid: guildEntity.guid,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async guildExistOrCreate(
    guild: GuildJobQueue,
  ): Promise<GuildExistsOrCreate> {
    const forceUpdate = guild.forceUpdate || OSINT_4_HOURS_MS;

    const nameSlug = toSlug(guild.name);
    const timestampNow = new Date().getTime();

    const realmEntity = await findRealm(this.realmsRepository, guild.realm);
    if (!realmEntity) {
      throw new NotFoundException(`Realm ${guild.realm} not found`);
    }

    const guid = toGuid(nameSlug, realmEntity.slug);

    const guildEntity = await this.guildsRepository.findOneBy({
      guid,
    });

    if (!guildEntity) {

      const createdBy = guild.createdBy ? guild.createdBy : OSINT_SOURCE.GUILD_GET;

      const guildNew = this.guildsRepository.create({
        guid: guid,
        id: Number(guild.id) || null,
        name: capitalize(guild.name),
        realm: realmEntity.slug,
        realmId: realmEntity.id,
        realmName: realmEntity.name,
        statusCode: STATUS_CODES.DEFAULT_STATUS,
        createdBy: createdBy,
        updatedBy: OSINT_SOURCE.GUILD_GET,
      });

      return { guildEntity: guildNew, isNew: true, isNotReadyToUpdate: false, isCreateOnlyUnique: false };
    }

    // --- If guild exists and createOnlyUnique initiated --- //
    if (guild.createOnlyUnique) {
      return { guildEntity, isNew: false, isCreateOnlyUnique: guild.createOnlyUnique, isNotReadyToUpdate: false };
    }
    // --- ...or guild was updated recently --- //
    const updateSafe = timestampNow - forceUpdate;
    const updatedAt = guildEntity.updatedAt.getTime();
    const isNotReadyToUpdate = updateSafe < updatedAt;
    if (isNotReadyToUpdate) {
      return { guildEntity, isNew: false, isNotReadyToUpdate, isCreateOnlyUnique: guild.createOnlyUnique };
    }

    guildEntity.statusCode = STATUS_CODES.DEFAULT_STATUS;

    return { guildEntity, isNew: false, isNotReadyToUpdate, isCreateOnlyUnique: guild.createOnlyUnique };
  }

  // @todo check diff
  private async diffGuildEntity(original: GuildsEntity, updated: GuildsEntity) {
    try {
      const logEntities: CharactersGuildsLogsEntity[] = [];
      const isNameChanged = original.name !== updated.name;
      const isFactionChanged = original.faction !== updated.faction;

      if (!isNameChanged && !isFactionChanged) {
        this.logger.debug(`Guild ${original.guid} diffs are not detected!`);
        return;
      }

      if (isNameChanged) {
        await this.charactersGuildsLogsRepository.update(
          {
            guildGuid: original.guid,
          },
          {
            guildGuid: updated.guid,
          },
        );

        const logEntityNameChanged = this.charactersGuildsLogsRepository.create({
          guildGuid: updated.guid,
          original: original.name,
          updated: updated.name,
          action: ACTION_LOG.NAME,
          scannedAt: original.updatedAt,
          createdAt: updated.updatedAt,
        });

        logEntities.push(logEntityNameChanged);
      }

      if (isFactionChanged) {
        const logEntityFactionChanged = this.charactersGuildsLogsRepository.create({
          guildGuid: updated.guid,
          original: original.name,
          updated: updated.name,
          action: ACTION_LOG.FACTION,
          scannedAt: original.updatedAt,
          createdAt: updated.updatedAt,
        });

        logEntities.push(logEntityFactionChanged);
      }

      await this.charactersGuildsLogsRepository.save(logEntities);
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: 'diffGuildEntity',
          guildGuid: original.guid,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }
}
