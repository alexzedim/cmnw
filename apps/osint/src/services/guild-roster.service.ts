import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { get } from 'lodash';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  charactersQueue,
  FACTION,
  GUILD_WORKER_CONSTANTS,
  IGuildRoster,
  incErrorCount,
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
} from '@app/resources';
import { CharactersEntity, GuildsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { RabbitMQPublisherService } from '@app/rabbitmq';

@Injectable()
export class GuildRosterService {
  private readonly logger = new Logger(GuildRosterService.name, {
    timestamp: true,
  });

  constructor(
    private readonly publisher: RabbitMQPublisherService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
  ) {}

  async fetchRoster(
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

      if (!isGuildRoster(response)) {
        return roster;
      }

      await lastValueFrom(
        from(response.members).pipe(
          mergeMap(
            (member) =>
              this.processRosterMember(
                member,
                guildEntity,
                guildNameSlug,
                roster,
                BNet,
              ),
            GUILD_WORKER_CONSTANTS.ROSTER_CONCURRENCY,
          ),
        ),
      );

      return roster;
    } catch (errorOrException) {
      return this.handleRosterError(errorOrException, roster, guildEntity, BNet);
    }
  }

  private async processRosterMember(
    member: any,
    guildEntity: GuildsEntity,
    guildNameSlug: string,
    roster: IGuildRoster,
    BNet: BlizzAPI,
  ): Promise<void> {
    try {
      const isMember = isGuildMember(member);
      if (!isMember) {
        return;
      }

      const isCharacterGM = member.rank === OSINT_GM_RANK;

      const characterRealmId = get(
        member,
        'character.realm.id',
        guildEntity.realmId,
      );
      const characterRealmSlug = get(
        member,
        'character.realm.slug',
        guildEntity.realm,
      );

      const characterGuid = toGuid(member.character.name, characterRealmSlug);

      const level = member.character.level || null;
      const characterClass = PLAYABLE_CLASS.has(member.character.playable_class.id)
        ? PLAYABLE_CLASS.get(member.character.playable_class.id)
        : null;

      const characterRace = PLAYABLE_RACE.has(member.character.playable_race.id)
        ? PLAYABLE_RACE.get(member.character.playable_race.id)
        : null;

      // @todo
      const factionData = get(member, 'character.faction', null) as Record<
        string,
        any
      > | null;

      let resolvedFaction = guildEntity.faction ?? null;

      const isFactionObject =
        factionData !== null && typeof factionData === 'object';

      if (isFactionObject) {
        const hasFactionTypeWithoutName =
          factionData.type && factionData.name === null;

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
          guildNameSlug,
          characterGuid,
          characterRealmSlug,
          level,
          characterClass,
          characterRace,
          resolvedFaction,
          BNet,
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
    guildNameSlug: string,
    guid: string,
    realmSlug: string,
    level: number | null,
    characterClass: string | null,
    characterRace: string | null,
    faction: string | null,
    BNet: BlizzAPI,
  ): Promise<void> {
    const resolvedFaction = faction ?? guildEntity.faction ?? undefined;
    const dto = CharacterMessageDto.fromGuildMaster({
      id: member.character.id,
      name: member.character.name,
      realm: realmSlug,
      guild: guildEntity.name,
      guildGuid: `${guildNameSlug}@${guildEntity.realm}`,
      guildId: guildEntity.id,
      class: characterClass,
      race: characterRace,
      faction: resolvedFaction,
      level,
      lastModified: guildEntity.lastModified,
      clientId: BNet.clientId,
      clientSecret: BNet.clientSecret,
      accessToken: BNet.accessTokenObject.access_token,
    });

    await this.publisher.publishMessage(charactersQueue.exchange, dto);
  }

  private async saveCharacterAsGuildMember(
    member: any,
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

    await characterAsGuildMember(
      this.charactersRepository,
      this.realmsRepository,
      guildEntity,
      guildMember,
    );
  }

  private handleRosterError(
    errorOrException: any,
    roster: IGuildRoster,
    guildEntity: GuildsEntity,
    BNet: BlizzAPI,
  ): IGuildRoster {
    roster.statusCode = get(errorOrException, 'status', 400);

    const isTooManyRequests =
      roster.statusCode === GUILD_WORKER_CONSTANTS.TOO_MANY_REQUESTS_STATUS_CODE;

    if (isTooManyRequests) {
      incErrorCount(this.keysRepository, BNet.accessTokenObject.access_token);
    }

    this.logger.error({
      logTag: 'fetchRoster',
      guildGuid: guildEntity.guid,
      statusCode: roster.statusCode,
    });

    return roster;
  }
}
