import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { isAxiosError } from 'axios';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { get } from 'lodash';

import {
  charactersQueue,
  FACTION,
  GUILD_WORKER_CONSTANTS,
  IGuildRoster,
  IRGuildRoster,
  isGuildRoster,
  OSINT_GM_RANK,
  PLAYABLE_CLASS,
  toGuid,
  toSlug,
  CharacterMessageDto,
  characterAsGuildMember,
  ICharacterGuildMember,
  PLAYABLE_RACE,
  isGuildMember,
  IRGuildRosterMember,
  GuildStatusState,
  setGuildStatusString,
  ICharacterMessageBase,
} from '@app/resources';
import { CharactersEntity, GuildsEntity, RealmsEntity } from '@app/pg';
import { BattleNetService, BattleNetNamespace, IBattleNetClientConfig } from '@app/battle-net';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
  ) {}

  async fetchRoster(guildEntity: GuildsEntity, config?: IBattleNetClientConfig): Promise<IGuildRoster> {
    const roster: IGuildRoster = { members: [] };

    try {
      const guildNameSlug = toSlug(guildEntity.name);
      const response = await this.battleNetService.query<IRGuildRoster>(
        `/data/wow/guild/${guildEntity.realm}/${guildNameSlug}/roster`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC),
        config,
      );

      if (!isGuildRoster(response)) {
        return this.handleRosterError(new Error('Invalid roster response'), roster, guildEntity);
      }

      await lastValueFrom(
        from(response.members).pipe(
          mergeMap(
            (member) => this.processRosterMember(member, guildEntity, guildNameSlug, roster),
            GUILD_WORKER_CONSTANTS.ROSTER_CONCURRENCY,
          ),
        ),
      );

      roster.status = setGuildStatusString('-----', 'ROSTER', GuildStatusState.SUCCESS);
      return roster;
    } catch (errorOrException) {
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
      const characterRealmSlug = get(member, 'character.realm.slug', guildEntity.realm);

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
    } catch (_errorOrException) {
      this.logger.error({
        logTag: 'processRosterMember',
        member: member.character?.id,
        guildGuid: guildEntity.guid,
      });
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

    this.logger.error({
      logTag: 'fetchRoster',
      guildGuid: guildEntity.guid,
      statusCode: roster.statusCode,
    });

    return roster;
  }
}
