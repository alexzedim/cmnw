import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { get } from 'lodash';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  CharacterJobQueue,
  charactersQueue,
  GUILD_WORKER_CONSTANTS,
  IGuildRoster,
  incErrorCount,
  IRGuildRoster,
  isGuildRoster,
  OSINT_GM_RANK,
  PLAYABLE_CLASS,
  STATUS_CODES,
  toGuid,
  toSlug,
  CharacterJobQueueDto,
  characterAsGuildMember,
  ICharacterGuildMember,
} from '@app/resources';
import {
  CharactersEntity,
  GuildsEntity,
  KeysEntity,
  RealmsEntity,
} from '@app/pg';

@Injectable()
export class GuildRosterService {
  private readonly logger = new Logger(GuildRosterService.name, {
    timestamp: true,
  });

  constructor(
    @InjectQueue(charactersQueue.name)
    private readonly characterQueue: Queue<CharacterJobQueue, number>,
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

      // @todo better validation for guildMembers, realmSlug required
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
      return this.handleRosterError(
        errorOrException,
        roster,
        guildEntity,
        BNet,
      );
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
      const isMember = 'character' in member && 'rank' in member;
      if (!isMember) {
        return;
      }

      const isGM = member.rank === OSINT_GM_RANK;
      const realmSlug = member.character.realm.slug ?? guildEntity.realm;
      const guid = toGuid(member.character.name, realmSlug);
      const level = member.character.level || null;
      const characterClass = PLAYABLE_CLASS.has(
        member.character.playable_class.id,
      )
        ? PLAYABLE_CLASS.get(member.character.playable_class.id)
        : null;

      if (isGM) {
        await this.queueGuildMasterUpdate(
          member,
          guildEntity,
          guildNameSlug,
          guid,
          realmSlug,
          level,
          characterClass,
          BNet,
        );
      } else {
        // Queue non-GM guild members for processing by CharactersWorker
        await this.saveCharacterAsGuildMember(
          member,
          guildEntity,
          guildNameSlug,
          guid,
          realmSlug,
          level,
          characterClass,
        );
      }

      roster.members.push({
        guid,
        id: member.character.id,
        rank: member.rank,
        level,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'processRosterMember',
        member: member.character?.id,
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  private async queueGuildMasterUpdate(
    member: any,
    guildEntity: GuildsEntity,
    guildNameSlug: string,
    guid: string,
    realmSlug: string,
    level: number | null,
    characterClass: string | null,
    BNet: BlizzAPI,
  ): Promise<void> {
    const dto = CharacterJobQueueDto.fromGuildMaster({
      name: member.character.name,
      realm: realmSlug,
      guild: guildEntity.name,
      guildNameSlug,
      guildId: guildEntity.id,
      class: characterClass,
      faction: guildEntity.faction,
      level,
      lastModified: guildEntity.lastModified,
      clientId: BNet.clientId,
      clientSecret: BNet.clientSecret,
      accessToken: BNet.accessTokenObject.access_token,
    });

    await this.characterQueue.add(dto.guid, dto, {
      jobId: dto.guid,
      priority: GUILD_WORKER_CONSTANTS.QUEUE_PRIORITY.GUILD_MASTER,
    });
  }

  private async saveCharacterAsGuildMember(
    member: any,
    guildEntity: GuildsEntity,
    guildNameSlug: string,
    guid: string,
    realmSlug: string,
    level: number | null,
    characterClass: string | null,
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
    roster.statusCode = get(
      errorOrException,
      'status',
      STATUS_CODES.ERROR_ROSTER,
    );

    const isTooManyRequests =
      roster.statusCode ===
      GUILD_WORKER_CONSTANTS.TOO_MANY_REQUESTS_STATUS_CODE;

    if (isTooManyRequests) {
      incErrorCount(this.keysRepository, BNet.accessTokenObject.access_token);
    }

    this.logger.error({
      logTag: 'fetchRoster',
      guildGuid: guildEntity.guid,
      statusCode: roster.statusCode,
      error: JSON.stringify(errorOrException),
    });

    return roster;
  }
}
