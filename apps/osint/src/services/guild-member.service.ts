import { formatServiceErrorLog } from '@app/logger';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersGuildsMembersEntity,
  type GuildsEntity,
} from '@app/pg';
import {
  ACTION_LOG,
  GuildStatusState,
  type IGuildMember,
  type IGuildRoster,
  OSINT_GM_RANK,
  OSINT_SOURCE,
  type RosterComparisonResult,
  setGuildStatusString,
} from '@app/resources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { difference, intersection } from 'lodash';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { Repository } from 'typeorm';

@Injectable()
export class GuildMemberService {
  private readonly logger = new Logger(GuildMemberService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly characterGuildsMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly charactersGuildsLogsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {}

  async updateRoster(guildEntity: GuildsEntity, roster: IGuildRoster, isNew: boolean): Promise<void> {
    try {
      const { members: updatedRosterMembers } = roster;

      if (!updatedRosterMembers.length) {
        this.logger.debug(`Guild roster for ${guildEntity.guid} was not found!`);
        roster.status = setGuildStatusString('-----', 'MEMBERS', GuildStatusState.SUCCESS);
        return;
      }

      if (!guildEntity.id) {
        this.logger.error(formatServiceErrorLog('updateRoster', guildEntity.guid, 0, 'Guild id is not resolved'));
        roster.status = setGuildStatusString('-----', 'MEMBERS', GuildStatusState.ERROR);
        return;
      }

      const comparison = await this.compareRosters(guildEntity, updatedRosterMembers);
      const rosterUpdateAt = roster.updatedAt;

      await this.processRosterChanges(guildEntity, comparison, rosterUpdateAt, isNew);

      roster.status = setGuildStatusString('-----', 'MEMBERS', GuildStatusState.SUCCESS);
    } catch (errorOrException) {
      roster.status = setGuildStatusString('-----', 'MEMBERS', GuildStatusState.ERROR);
      this.logger.error(
        formatServiceErrorLog(
          'updateRoster',
          guildEntity.guid,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
    }
  }

  private async compareRosters(
    guildEntity: GuildsEntity,
    updatedRosterMembers: IGuildRoster['members'],
  ): Promise<RosterComparisonResult> {
    const guildsMembersEntities = await this.characterGuildsMembersRepository.findBy({
      guildGuid: guildEntity.guid,
    });

    const originalRoster = new Map(guildsMembersEntities.map((guildMember) => [guildMember.characterId, guildMember]));

    const updatedRoster = new Map<number, IGuildMember>(updatedRosterMembers.map((member) => [member.id, member]));

    const originalRosterCharIds = Array.from(originalRoster.keys());
    const updatedRosterCharIds = Array.from(updatedRoster.keys());

    return {
      originalRoster,
      updatedRoster,
      membersIntersectIds: intersection(updatedRosterCharIds, originalRosterCharIds),
      membersJoinedIds: difference(updatedRosterCharIds, originalRosterCharIds),
      membersLeaveIds: difference(originalRosterCharIds, updatedRosterCharIds),
      isFirstTimeRosterIndexed: originalRoster.size === 0,
    };
  }

  private async processRosterChanges(
    guildEntity: GuildsEntity,
    comparison: RosterComparisonResult,
    rosterUpdateAt: Date,
    _isNew: boolean,
  ): Promise<void> {
    const {
      originalRoster,
      updatedRoster,
      membersIntersectIds,
      membersJoinedIds,
      membersLeaveIds,
      isFirstTimeRosterIndexed,
    } = comparison;

    if (membersIntersectIds.length) {
      await lastValueFrom(
        from(membersIntersectIds).pipe(
          mergeMap((guildMemberId) =>
            this.processIntersectionMember(guildEntity, rosterUpdateAt, guildMemberId, originalRoster, updatedRoster),
          ),
        ),
        { defaultValue: undefined },
      );
    }

    const shouldProcessJoins = membersJoinedIds.length > 0;
    if (shouldProcessJoins) {
      await lastValueFrom(
        from(membersJoinedIds).pipe(
          mergeMap((guildMemberId) =>
            this.processJoinMember(guildEntity, rosterUpdateAt, guildMemberId, updatedRoster, isFirstTimeRosterIndexed),
          ),
        ),
        { defaultValue: undefined },
      );
    }

    if (membersLeaveIds.length) {
      await lastValueFrom(
        from(membersLeaveIds).pipe(
          mergeMap((guildMemberId) =>
            this.processLeaveMember(guildEntity, rosterUpdateAt, guildMemberId, originalRoster),
          ),
        ),
        { defaultValue: undefined },
      );
    }
  }

  private async processIntersectionMember(
    guildEntity: GuildsEntity,
    rosterUpdatedAt: Date,
    guildMemberId: number,
    originalRoster: Map<number, CharactersGuildsMembersEntity>,
    updatedRoster: Map<number, IGuildMember>,
  ): Promise<void> {
    try {
      const guildMemberOriginal = originalRoster.get(guildMemberId);
      const guildMemberUpdated = updatedRoster.get(guildMemberId);
      const isRankChanged = guildMemberUpdated.rank !== guildMemberOriginal.rank;

      if (!isRankChanged) {
        return;
      }

      const isOriginalGuildMaster = guildMemberOriginal.rank === OSINT_GM_RANK;
      const isUpdatedGuildMaster = guildMemberUpdated.rank === OSINT_GM_RANK;
      const isEitherGuildMaster = isOriginalGuildMaster || isUpdatedGuildMaster;

      if (isEitherGuildMaster) {
        return;
      }

      const isDemote = guildMemberUpdated.rank > guildMemberOriginal.rank;
      const eventAction = isDemote ? ACTION_LOG.DEMOTE : ACTION_LOG.PROMOTE;

      const logEntityGuildMemberDemote = this.charactersGuildsLogsRepository.create({
        characterGuid: guildMemberOriginal.characterGuid,
        guildGuid: guildEntity.guid,
        original: String(guildMemberOriginal.rank),
        updated: String(guildMemberUpdated.rank),
        action: eventAction,
        scannedAt: guildEntity.updatedAt,
        createdAt: rosterUpdatedAt,
      });

      await this.settleAndLog(
        [
          {
            name: 'log.save',
            promise: this.charactersGuildsLogsRepository.save(logEntityGuildMemberDemote),
          },
          {
            name: 'character.update',
            promise: this.charactersRepository.update(
              { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
              {
                guildRank: guildMemberUpdated.rank,
                updatedBy: OSINT_SOURCE.GUILD_ROSTER,
              },
            ),
          },
          {
            name: 'member.update',
            promise: this.characterGuildsMembersRepository.update(
              {
                characterGuid: guildMemberOriginal.characterGuid,
                guildGuid: guildEntity.guid,
              },
              {
                rank: guildMemberUpdated.rank,
                updatedBy: OSINT_SOURCE.GUILD_ROSTER,
              },
            ),
          },
        ],
        {
          logTag: 'processIntersectionMember',
          guildGuid: guildEntity.guid,
          characterGuid: guildMemberOriginal.characterGuid,
        },
      );
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'processIntersectionMember',
          guildEntity.guid,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
    }
  }

  async processJoinMember(
    guildEntity: GuildsEntity,
    rosterUpdatedAt: Date,
    guildMemberId: number,
    updatedRoster: Map<number, IGuildMember>,
    isFirstTimeRosterIndexed: boolean = false,
  ): Promise<void> {
    try {
      const guildMemberUpdated = updatedRoster.get(guildMemberId);
      const isNotGuildMaster = guildMemberUpdated.rank !== OSINT_GM_RANK;

      const charactersGuildsMembersEntity = this.characterGuildsMembersRepository.create({
        guildGuid: guildEntity.guid,
        guildId: guildEntity.id,
        characterId: guildMemberUpdated.id,
        characterGuid: guildMemberUpdated.guid,
        realmId: guildMemberUpdated.realmId,
        realm: guildMemberUpdated.realmSlug,
        rank: guildMemberUpdated.rank,
        createdBy: OSINT_SOURCE.GUILD_ROSTER,
        updatedBy: OSINT_SOURCE.GUILD_ROSTER,
        lastModified: rosterUpdatedAt,
      });

      /**
       * When a guild is indexed for the first time, we don't log JOIN events
       * for existing members because they didn't just join - they were already
       * in the guild. We only log JOIN events when a member actually joins
       * an already-indexed guild (isFirstTimeRosterIndexed = false).
       * Guild Masters are excluded from JOIN logs as their membership is tracked
       * through guild ownership events instead.
       */
      const shouldLogJoin = isNotGuildMaster && !isFirstTimeRosterIndexed;
      if (shouldLogJoin) {
        const logEntityGuildMemberJoin = this.charactersGuildsLogsRepository.create({
          characterGuid: guildMemberUpdated.guid,
          guildGuid: guildEntity.guid,
          updated: String(guildMemberUpdated.rank),
          action: ACTION_LOG.JOIN,
          scannedAt: guildEntity.updatedAt,
          createdAt: rosterUpdatedAt,
        });

        await this.charactersGuildsLogsRepository.save(logEntityGuildMemberJoin);
      }

      await this.settleAndLog(
        [
          {
            name: 'member.save',
            promise: this.characterGuildsMembersRepository.save(charactersGuildsMembersEntity),
          },
          {
            name: 'character.update',
            promise: this.charactersRepository.update(
              { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
              {
                guild: guildEntity.name,
                guildId: guildEntity.id,
                guildGuid: guildEntity.guid,
                guildRank: guildMemberUpdated.rank,
                updatedBy: OSINT_SOURCE.GUILD_ROSTER,
              },
            ),
          },
        ],
        {
          logTag: 'processJoinMember',
          guildGuid: guildEntity.guid,
          characterGuid: guildMemberUpdated.guid,
        },
      );
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'processJoinMember',
          guildEntity.guid,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
    }
  }

  private async processLeaveMember(
    guildEntity: GuildsEntity,
    rosterUpdatedAt: Date,
    guildMemberId: number,
    originalRoster: Map<number, CharactersGuildsMembersEntity>,
  ): Promise<void> {
    try {
      const guildMemberOriginal = originalRoster.get(guildMemberId);
      const isNotGuildMaster = guildMemberOriginal.rank !== OSINT_GM_RANK;

      if (isNotGuildMaster) {
        const logEntityGuildMemberLeave = this.charactersGuildsLogsRepository.create({
          characterGuid: guildMemberOriginal.characterGuid,
          guildGuid: guildEntity.guid,
          original: String(guildMemberOriginal.rank),
          action: ACTION_LOG.LEAVE,
          scannedAt: guildEntity.updatedAt,
          createdAt: rosterUpdatedAt,
        });

        await this.charactersGuildsLogsRepository.save(logEntityGuildMemberLeave);
      }

      await this.settleAndLog(
        [
          {
            name: 'member.delete',
            promise: this.characterGuildsMembersRepository.delete({
              guildGuid: guildEntity.guid,
              characterGuid: guildMemberOriginal.characterGuid,
            }),
          },
          {
            name: 'character.update',
            promise: this.charactersRepository.update(
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
          },
        ],
        {
          logTag: 'processLeaveMember',
          guildGuid: guildEntity.guid,
          characterGuid: guildMemberOriginal.characterGuid,
        },
      );
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'processLeaveMember',
          guildEntity.guid,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
    }
  }

  private async settleAndLog(
    operations: ReadonlyArray<{ name: string; promise: Promise<unknown> }>,
    context: { logTag: string; guildGuid: string; characterGuid: string },
  ): Promise<void> {
    const results = await Promise.allSettled(operations.map((operation) => operation.promise));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const operation = operations[index].name;
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.error(
          formatServiceErrorLog(`${context.logTag}:${operation}`, context.guildGuid, 0, reason, context.characterGuid),
        );
      }
    });
  }
}
