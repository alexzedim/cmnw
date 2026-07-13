import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersProfileEntity,
  GuildsEntity,
  RealmsEntity,
} from '@app/pg';

import { FindOptionsWhere, In, MoreThanOrEqual, Repository } from 'typeorm';

import {
  CHARACTER_HASH_FIELDS,
  CharacterHashDto,
  CharacterHashFieldType,
  CharacterIdDto,
  CharacterMessageDto,
  CharacterLfgDto,
  charactersQueue,
  GuildMessageDto,
  guildsQueue,
  IAddonScanEntry,
  IAddonScanEntryWithStatus,
  IAddonScanGuild,
  ICharacterMessageBase,
  IGuildMessageBase,
  LFG_STATUS,
  toGuid,
  findRealm,
} from '@app/resources';
import { CharacterResponseDto } from '@app/resources/dto/character/character-response.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { REDIS_CONNECTION } from '@app/configuration';
import { BattleNetService } from '@app/battle-net';
import { S3Service } from '@app/s3';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CharacterOsintService {
  private readonly logger = new Logger(CharacterOsintService.name, {
    timestamp: true,
  });
  private readonly queueEvents = new QueueEvents(charactersQueue.name, {
    connection: REDIS_CONNECTION,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsRepository: Repository<AnalyticsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacter: Queue<ICharacterMessageBase>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuild: Queue<IGuildMessageBase>,
    private readonly battleNetService: BattleNetService,
    private readonly s3Service: S3Service,
    private readonly realmsCache: RealmsCacheService,
  ) {}

  private async requestCharacterFromQueue(params: {
    name: string;
    realm: string;
    guid: string;
    logTag: string;
    sessionId?: string;
    requestId?: string;
  }): Promise<CharactersEntity | null> {
    let requestedCharacter: CharactersEntity | null = null;

    try {
      const characterMessage =
        params.sessionId && params.requestId
          ? CharacterMessageDto.fromCharacterForceRefresh({
              name: params.name,
              realm: params.realm,
              sessionId: params.sessionId,
              requestId: params.requestId,
            })
          : CharacterMessageDto.fromCharacterRequest({
              name: params.name,
              realm: params.realm,
            });

      const job = await this.queueCharacter.add(characterMessage.name, characterMessage.data, characterMessage.opts);

      requestedCharacter = await job.waitUntilFinished(this.queueEvents, 60000);
    } catch (errorOrException) {
      this.logger.warn({
        logTag: params.logTag,
        characterGuid: params.guid,
        message: `Character request timed out or failed for ${params.guid}`,
        error: errorOrException?.message,
      });
    }

    return requestedCharacter;
  }

  async getCharacter(input: CharacterIdDto): Promise<CharacterResponseDto> {
    const logTag = 'getCharacter';
    try {
      this.logger.log({
        logTag,
        characterGuid: input.guid,
        message: `Fetching character: ${input.guid}`,
      });
      const [nameSlug, realmSlug] = input.guid.split('@');

      const realmEntity = await findRealm(this.realmsRepository, realmSlug);

      if (!realmEntity) {
        throw new BadRequestException(`Realm: ${realmSlug} for character ${input.guid} not found!`);
      }

      const guid = toGuid(nameSlug, realmEntity.slug);

      let character = await this.charactersRepository.findOneBy({
        guid,
      });

      const [globalAnalytics, realmAnalytics] = await Promise.all([
        this.analyticsRepository.findOne({
          where: {
            category: 'characters',
            metricType: 'extremes',
            realmId: null,
          },
          order: { createdAt: 'DESC' },
        }),
        this.analyticsRepository.findOne({
          where: {
            category: 'characters',
            metricType: 'extremes',
            realmId: character?.realmId,
          },
          order: { createdAt: 'DESC' },
        }),
      ]);

      if (!character) {
        character = await this.requestCharacterFromQueue({
          name: nameSlug,
          realm: realmEntity.slug,
          guid,
          logTag,
          sessionId: input.sessionId,
          requestId: input.requestId,
        });
      }

      if (!character) {
        this.logger.warn({
          logTag,
          characterGuid: guid,
          message: `Character not found but queued for indexing: ${guid}`,
        });

        throw new NotFoundException(`Character: ${guid} not found, but will be added to OSINT-DB on existence`);
      }

      const updatedAt = character.updatedAt?.getTime?.();
      const isStale = typeof updatedAt === 'number' ? Date.now() - updatedAt > 1000 * 60 * 60 * 48 : false;

      if (isStale) {
        await this.battleNetService.getAvailableKey();

        const characterMessage =
          input.sessionId && input.requestId
            ? CharacterMessageDto.fromCharacterForceRefresh({
                name: nameSlug,
                realm: realmEntity.slug,
                sessionId: input.sessionId,
                requestId: input.requestId,
              })
            : CharacterMessageDto.fromCharacterRequest({
                name: nameSlug,
                realm: realmEntity.slug,
              });

        await this.queueCharacter.add(characterMessage.name, characterMessage.data, characterMessage.opts);

        this.logger.log({
          logTag,
          characterGuid: guid,
          message: `Character is stale; queued for refresh: ${guid}`,
        });
      } else if (input.sessionId && input.requestId) {
        // Character is fresh enough for a normal GET, but the client explicitly
        // requested a force-refresh (sessionId/requestId present). Re-queue with
        // FORCE so the worker always re-fetches from Blizzard and emits
        // session-routed WS progress events.
        const characterMessage = CharacterMessageDto.fromCharacterForceRefresh({
          name: nameSlug,
          realm: realmEntity.slug,
          sessionId: input.sessionId,
          requestId: input.requestId,
        });

        await this.queueCharacter.add(characterMessage.name, characterMessage.data, characterMessage.opts);

        this.logger.log({
          logTag,
          characterGuid: guid,
          message: `Character force-refresh queued via GET: ${guid}`,
        });
      }

      const characterResponse = CharacterResponseDto.fromCharacter(character, globalAnalytics, realmAnalytics);

      this.logger.log({
        logTag,
        characterGuid: guid,
        message: `Successfully fetched character: ${guid}`,
      });
      return characterResponse;
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException || errorOrException instanceof NotFoundException) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        characterGuid: input.guid,
        errorOrException,
        message: `Error fetching character: ${input.guid}`,
      });

      throw new ServiceUnavailableException(`Error fetching character data for ${input.guid}`);
    }
  }

  async getCharactersByHash(input: CharacterHashDto) {
    const logTag = 'getCharactersByHash';
    try {
      if (!input.hashQuery || input.hashQuery.length < 2) {
        throw new BadRequestException(`Hash value must be at least 2 characters (type + hash)`);
      }

      const hashType1 = input.hashQuery.charAt(0).toLowerCase();
      const hashValue1 = input.hashQuery.slice(1);

      if (!/^[ab]$/.test(hashType1)) {
        throw new BadRequestException(`Hash value must start with 'a' or 'b', got '${hashType1}'`);
      }

      let characters: CharactersEntity[];

      if (input.hashQuery2) {
        if (input.hashQuery2.length < 2) {
          throw new BadRequestException(`Hash value 2 must be at least 2 characters (type + hash)`);
        }

        const hashType2 = input.hashQuery2.charAt(0).toLowerCase();
        const hashValue2 = input.hashQuery2.slice(1);

        if (!/^[ab]$/.test(hashType2)) {
          throw new BadRequestException(`Hash value 2 must start with 'a' or 'b', got '${hashType2}'`);
        }

        const hashFieldType1 = CHARACTER_HASH_FIELDS.get(<CharacterHashFieldType>hashType1);
        const hashFieldType2 = CHARACTER_HASH_FIELDS.get(<CharacterHashFieldType>hashType2);

        if (!hashFieldType1 || !hashFieldType2) {
          throw new BadRequestException(`Could not determine hash fields for types '${hashType1}' and '${hashType2}'`);
        }

        const hashLabel = `${input.hashQuery}/${input.hashQuery2}`;
        this.logger.log({
          logTag,
          hashType1,
          hashFieldType1,
          hashValue1,
          hashType2,
          hashFieldType2,
          hashValue2,
          message: `Fetching characters by combined hash: ${hashLabel}`,
        });

        characters = await this.charactersRepository
          .createQueryBuilder('c')
          .where(`c.${hashFieldType1} = :hashValue1 AND c.${hashFieldType2} = :hashValue2`, {
            hashValue1,
            hashValue2,
          })
          .take(100)
          .getMany();

        this.logger.log({
          logTag,
          characterCount: characters.length,
          message: `Found ${characters.length} characters by combined hash: ${hashLabel}`,
        });
      } else {
        const hashFieldType = CHARACTER_HASH_FIELDS.get(<CharacterHashFieldType>hashType1);

        if (!hashFieldType) {
          throw new BadRequestException(`Could not determine hash field for type '${hashType1}'`);
        }

        const hashLabel = `${input.hashQuery}`;
        this.logger.log({
          logTag,
          hashType: hashType1,
          hashValue: hashValue1,
          message: `Fetching characters by hash: ${hashLabel}`,
        });

        const whereQuery: FindOptionsWhere<CharactersEntity> = {
          [hashFieldType]: hashValue1,
        };

        characters = await this.charactersRepository.find({
          where: whereQuery,
          take: 100,
        });

        this.logger.log({
          logTag,
          hashType: hashType1,
          hashValue: hashValue1,
          characterCount: characters.length,
          message: `Found ${characters.length} characters by hash: ${hashLabel}`,
        });
      }

      return characters;
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        hashQuery: input.hashQuery,
        hashQuery2: input.hashQuery2,
        errorOrException,
        message: `Error fetching characters by hash: ${input.hashQuery}${input.hashQuery2 ? '/' + input.hashQuery2 : ''}`,
      });

      throw new ServiceUnavailableException(
        `Error processing hash query: ${input.hashQuery}${input.hashQuery2 ? '/' + input.hashQuery2 : ''}`,
      );
    }
  }

  async getCharactersLfg(input: CharacterLfgDto) {
    const logTag = 'getCharactersLfg';
    try {
      this.logger.log({
        logTag,
        filters: input,
        message: 'Fetching characters looking for guild',
      });
      const where: FindOptionsWhere<CharactersProfileEntity> = {
        lfgStatus: LFG_STATUS.NEW,
      };

      if (input.raiderIoScore) where.raiderIoScore = MoreThanOrEqual(input.raiderIoScore);
      if (input.mythicLogs) where.mythicLogs = MoreThanOrEqual(input.mythicLogs);
      if (input.heroicLogs) where.heroicLogs = MoreThanOrEqual(input.heroicLogs);
      if (input.realmsId) {
        where.realmId = In(input.realmsId);
      }

      const characters = await this.charactersProfileRepository.findBy(where);

      this.logger.log({
        logTag,
        characterCount: characters.length,
        message: `Found ${characters.length} characters looking for guild`,
      });
      return characters;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error fetching LFG characters',
      });

      throw new ServiceUnavailableException('Error fetching characters looking for guild');
    }
  }

  async getCharacterLogs(input: CharacterIdDto) {
    const logTag = 'getCharacterLogs';
    try {
      this.logger.log({
        logTag,
        characterGuid: input.guid,
        message: `Fetching logs for character: ${input.guid}`,
      });

      const logs = await this.logsRepository.find({
        where: {
          characterGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log({
        logTag,
        characterGuid: input.guid,
        logCount: logs.length,
        message: `Found ${logs.length} logs for character: ${input.guid}`,
      });
      return logs;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        characterGuid: input.guid,
        errorOrException,
        message: `Error fetching character logs: ${input.guid}`,
      });

      throw new ServiceUnavailableException(`Error fetching logs for character ${input.guid}`);
    }
  }

  private async resolveRealmMap(entries: IAddonScanEntry[]): Promise<Map<number, RealmsEntity | null>> {
    const realmMap = new Map<number, RealmsEntity | null>();

    for (const entry of entries) {
      if (entry.realmId && !realmMap.has(entry.realmId)) {
        realmMap.set(entry.realmId, await this.realmsCache.findById(entry.realmId));
      }
    }

    return realmMap;
  }

  private async enrichEntriesWithRealms(
    entries: IAddonScanEntry[],
    realmMap: Map<number, RealmsEntity | null>,
  ): Promise<void> {
    const guildRealmCache = new Map<string, RealmsEntity | null>();

    for (const entry of entries) {
      const realmEntity = entry.realmId ? realmMap.get(entry.realmId) : null;
      if (realmEntity) {
        entry.realm = realmEntity.slug;
        entry.guid = toGuid(entry.name, realmEntity.slug);
      }

      if (entry.guild) {
        const lastDash = entry.guild.lastIndexOf('-');
        if (lastDash > 0) {
          const suffix = entry.guild.substring(lastDash + 1);
          let guildRealm = guildRealmCache.get(suffix);
          if (guildRealm === undefined) {
            guildRealm = await this.realmsCache.findRealm(suffix);
            guildRealmCache.set(suffix, guildRealm);
          }
          if (guildRealm) {
            entry.guild = entry.guild.substring(0, lastDash);
            entry.guildGuid = toGuid(entry.guild, guildRealm.slug);
          }
        }
      }
    }
  }

  private async checkNewCharacters(entries: IAddonScanEntry[]): Promise<IAddonScanEntryWithStatus[]> {
    const guids = entries.map((e) => e.guid);
    const existing = await this.charactersRepository.find({
      where: { guid: In(guids) },
      select: ['guid'],
    });
    const existingSet = new Set(existing.map((e) => e.guid));
    return entries.map((entry) => ({ ...entry, isNew: !existingSet.has(entry.guid) }));
  }

  private extractUniqueGuilds(entries: IAddonScanEntry[]): IAddonScanGuild[] {
    const guildMap = new Map<string, IAddonScanGuild>();

    for (const entry of entries) {
      if (entry.guildGuid && entry.guild && entry.realm) {
        if (!guildMap.has(entry.guildGuid)) {
          guildMap.set(entry.guildGuid, {
            guildGuid: entry.guildGuid,
            guild: entry.guild,
            realm: entry.realm,
          });
        }
      }
    }

    return Array.from(guildMap.values());
  }

  async processOsintJsonUpload(entries: IAddonScanEntry[]): Promise<{
    characters: IAddonScanEntryWithStatus[];
    guilds: IAddonScanGuild[];
    s3Key: string;
  }> {
    const logTag = 'processOsintJsonUpload';

    try {
      const validEntries = entries.filter((entry) => entry.name && entry.realm);

      const realmMap = await this.resolveRealmMap(validEntries);
      await this.enrichEntriesWithRealms(validEntries, realmMap);

      for (const entry of validEntries) {
        if (!entry.realmId && entry.realm) {
          const realm = await this.realmsCache.findRealm(entry.realm);
          if (realm) {
            entry.realm = realm.slug;
            entry.realmId = realm.id;
            entry.guid = toGuid(entry.name, realm.slug);
          }
        }
      }

      const seen = new Map<string, IAddonScanEntry>();
      for (const entry of validEntries) {
        if (!seen.has(entry.guid)) {
          seen.set(entry.guid, entry);
        }
      }
      const uniqueEntries = Array.from(seen.values());

      const guilds = this.extractUniqueGuilds(uniqueEntries);

      const s3Key = `cmnw-osint-${uuidv4()}.json`;
      await this.s3Service.writeJsonFile(s3Key, uniqueEntries, { bucketName: 'cmnw' });

      this.logger.log({
        logTag,
        s3Key,
        totalEntries: uniqueEntries.length,
        duplicatesRemoved: validEntries.length - uniqueEntries.length,
        message: `Uploaded OSINT data to S3: ${s3Key}`,
      });

      const characters = await this.checkNewCharacters(uniqueEntries);

      for (const entry of characters) {
        if (entry.isNew) {
          const dto = CharacterMessageDto.fromAddonScan({ ...entry });
          await this.queueCharacter.add(dto.name, dto.data, dto.opts);
        }
      }
      for (const guild of guilds) {
        const dto = GuildMessageDto.fromAddonScan({ name: guild.guild, realm: guild.realm });
        await this.queueGuild.add(dto.name, dto.data, dto.opts);
      }

      this.logger.log({
        logTag,
        totalEntries: validEntries.length,
        guildCount: guilds.length,
        newCount: characters.filter((c) => c.isNew).length,
        existingCount: characters.filter((c) => !c.isNew).length,
        message: `Extracted ${guilds.length} unique guilds from ${validEntries.length} entries`,
      });

      return { characters, guilds, s3Key };
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException) throw errorOrException;

      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error processing OSINT JSON upload',
      });

      throw new ServiceUnavailableException('Error processing OSINT JSON upload');
    }
  }
}
