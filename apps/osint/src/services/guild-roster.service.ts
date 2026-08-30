import { BattleNetNamespace, BattleNetService, type IBattleNetClientConfig } from '@app/battle-net';
import { formatServiceErrorLog } from '@app/logger';
import { CharactersEntity, type GuildsEntity, RealmsEntity } from '@app/pg';
import {
  CharacterMessageDto,
  characterAsGuildMember,
  charactersQueue,
  FACTION,
  GUILD_WORKER_CONSTANTS,
  GuildStatusState,
  type ICharacterGuildMember,
  type ICharacterMessageBase,
  type IGuildRoster,
  type IRGuildRoster,
  type IRGuildRosterMember,
  isGuildMember,
  isGuildRoster,
  OSINT_GM_RANK,
  PLAYABLE_CLASS,
  PLAYABLE_RACE,
  parseHttpLastModified,
  setGuildStatusString,
  toGuid,
  toSlug,
} from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isAxiosError } from 'axios';
import type { Queue } from 'bullmq';
import { get } from 'lodash';
import { DateTime } from 'luxon';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { Repository } from 'typeorm';

@Injectable()
export class GuildRosterService {
  private readonly logger = new Logger(GuildRosterService.name, {
    timestamp: true,
  });

  constructor(
    private readonly battleNetService: BattleNetService,
    @InjectQueue(charactersQueue.name)
    private readonly characterQueue: Queue<ICharacterMessageBase>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    private readonly realmsCacheService: RealmsCacheService,
  ) {}

  async fetchRoster(
    guildEntity: GuildsEntity,
    config?: IBattleNetClientConfig,
    ifModifiedSince?: Date | null,
  ): Promise<IGuildRoster> {
    const roster: IGuildRoster = { members: [] };

    try {
      const guildNameSlug = toSlug(guildEntity.name);
      const headers = ifModifiedSince
        ? { 'If-Modified-Since': DateTime.fromJSDate(ifModifiedSince).toHTTP() }
        : undefined;

      const response = await this.battleNetService.queryWithResponse<IRGuildRoster>(
        `/data/wow/guild/${guildEntity.realm}/${guildNameSlug}/roster`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, undefined, undefined, headers),
        config,
      );

      if (!isGuildRoster(response.data)) {
        return this.handleRosterError(new Error('Invalid roster response'), roster, guildEntity);
      }

      guildEntity.id = response.data.guild.id ?? guildEntity.id;

      await lastValueFrom(
        from(response.data.members).pipe(
          mergeMap(
            (member) => this.processRosterMember(member, guildEntity, guildNameSlug, roster),
            GUILD_WORKER_CONSTANTS.ROSTER_CONCURRENCY,
          ),
        ),
        { defaultValue: undefined },
      );

      roster.dataLastModified = parseHttpLastModified(response.headers['last-modified']) ?? undefined;
      roster.status = setGuildStatusString('-----', 'ROSTER', GuildStatusState.SUCCESS);
      return roster;
    } catch (errorOrException) {
      if (isAxiosError(errorOrException) && errorOrException.response?.status === 304) {
        return {
          ...roster,
          notModified: true,
          status: setGuildStatusString('-----', 'ROSTER', GuildStatusState.SUCCESS),
        };
      }
      return this.handleRosterError(errorOrException, roster, guildEntity);
    }
  }

  private async processRosterMember(
    member: IRGuildRosterMember,
    guildEntity: GuildsEntity,
    guildNameSlug: string,
    roster: IGuildRoster,
  ): Promise<void> {
    try {
      const isMember = isGuildMember(member);
      if (!isMember) {
        return;
      }

      const isCharacterGM = member.rank === OSINT_GM_RANK;

      const characterRealmId = get(member, 'character.realm.id', guildEntity.realmId);
      const rawRealmSlug = get(member, 'character.realm.slug', guildEntity.realm);
      const characterRealmSlug = await CharacterMessageDto.resolveRealmSlug(this.realmsCacheService, rawRealmSlug);

      const characterGuid = toGuid(member.character.name, characterRealmSlug);

      const level = member.character.level || null;
      const characterClass = PLAYABLE_CLASS.has(member.character.playable_class.id)
        ? PLAYABLE_CLASS.get(member.character.playable_class.id)
        : null;

      const characterRace = PLAYABLE_RACE.has(member.character.playable_race.id)
        ? PLAYABLE_RACE.get(member.character.playable_race.id)
        : null;

      const factionData = get(member, 'character.faction', null) as Record<string, any> | null;

      let resolvedFaction = guildEntity.faction ?? null;

      const isFactionObject = factionData !== null && typeof factionData === 'object';

      if (isFactionObject) {
        const hasFactionTypeWithoutName = factionData.type && factionData.name === null;

        if (hasFactionTypeWithoutName) {
          const factionTypeStartsWithA = factionData.type.toString().startsWith('A');
          resolvedFaction = factionTypeStartsWithA ? FACTION.A : FACTION.H;
        } else if (factionData.name) {
          resolvedFaction = factionData.name;
        }
      }

      if (isCharacterGM) {
        await this.queueGuildMasterUpdate(
          member,
          guildEntity,
          characterRealmSlug,
          level,
          characterClass,
          characterRace,
          resolvedFaction,
        );
      }
      await this.saveCharacterAsGuildMember(
        member,
        guildEntity,
        guildNameSlug,
        characterGuid,
        characterRealmSlug,
        level,
        characterClass,
        characterRace,
        resolvedFaction,
      );

      roster.members.push({
        guid: characterGuid,
        id: member.character.id,
        rank: member.rank,
        level,
        isGM: isCharacterGM,
        realmId: characterRealmId,
        realmSlug: characterRealmSlug,
        class: characterClass,
        race: characterRace,
        faction: resolvedFaction,
      });
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'processRosterMember',
          guildEntity.guid,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
          `member ${member.character?.id}`,
        ),
      );
    }
  }

  private async queueGuildMasterUpdate(
    member: Readonly<IRGuildRosterMember>,
    guildEntity: GuildsEntity,
    realmSlug: string,
    level: number | null,
    characterClass: string | null,
    characterRace: string | null,
    faction: string | null,
  ): Promise<void> {
    const resolvedFaction = faction ?? guildEntity.faction ?? undefined;
    const dto = CharacterMessageDto.fromGuildMaster({
      id: member.character.id,
      name: member.character.name,
      realm: realmSlug,
      guild: guildEntity.name,
      guildGuid: toGuid(guildEntity.name, guildEntity.realm),
      guildId: guildEntity.id,
      class: characterClass,
      race: characterRace,
      faction: resolvedFaction,
      level,
      lastModified: guildEntity.lastModified,
    });

    await this.characterQueue.add(dto.name, dto.data, dto.opts);
  }

  private async saveCharacterAsGuildMember(
    member: IRGuildRosterMember,
    guildEntity: GuildsEntity,
    guildNameSlug: string,
    guid: string,
    realmSlug: string,
    level: number | null,
    characterClass: string | null,
    characterRace: string | null,
    faction: string | null,
  ): Promise<void> {
    const guildMember: ICharacterGuildMember = {
      guid,
      id: member.character.id,
      name: member.character.name,
      guildNameSlug,
      realmSlug,
      rank: Number(member.rank),
      level,
      class: characterClass,
      race: characterRace,
      faction,
    };

    await characterAsGuildMember(this.charactersRepository, this.realmsRepository, guildEntity, guildMember);
  }

  private handleRosterError(errorOrException: any, roster: IGuildRoster, guildEntity: GuildsEntity): IGuildRoster {
    const statusCode = isAxiosError(errorOrException)
      ? errorOrException.response?.status
      : get(errorOrException, 'status', 400);

    roster.statusCode = statusCode || 400;
    roster.status = setGuildStatusString('-----', 'ROSTER', GuildStatusState.ERROR);

    this.logger.error(formatServiceErrorLog('fetchRoster', guildEntity.guid, 0, `HTTP ${roster.statusCode}`));

    return roster;
  }
}
