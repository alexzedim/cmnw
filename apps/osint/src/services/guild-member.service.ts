import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { difference, intersection } from 'lodash';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import {
  ACTION_LOG,
  IGuildMember,
  IGuildRoster,
  OSINT_GM_RANK,
  OSINT_SOURCE,
  RosterComparisonResult,
} from '@app/resources';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersGuildsLogsEntity,
  GuildsEntity,
} from '@app/pg';


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

  async updateRoster(
    guildEntity: GuildsEntity,
    roster: IGuildRoster,
    isNew: boolean,
  ): Promise<void> {
    try {
      const { members: updatedRosterMembers } = roster;

      if (!updatedRosterMembers.length) {
        this.logger.debug(
          `Guild roster for ${guildEntity.guid} was not found!`,
        );
        return;
      }

      const comparison = await this.compareRosters(
        guildEntity,
        updatedRosterMembers,
      );
      const rosterUpdateAt = roster.updatedAt;

      await this.processRosterChanges(
        guildEntity,
        comparison,
        rosterUpdateAt,
        isNew,
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'updateRoster',
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  private async compareRosters(
    guildEntity: GuildsEntity,
    updatedRosterMembers: IGuildRoster['members'],
  ): Promise<RosterComparisonResult> {
    const guildsMembersEntities =
      await this.characterGuildsMembersRepository.findBy({
        guildGuid: guildEntity.guid,
      });

    const originalRoster = new Map(
      guildsMembersEntities.map((guildMember) => [
        guildMember.characterId,
        guildMember,
      ]),
    );

    const updatedRoster = new Map<number, IGuildMember>(
      updatedRosterMembers.map((member) => [member.id, member]),
    );

    const originalRosterCharIds = Array.from(originalRoster.keys());
    const updatedRosterCharIds = Array.from(updatedRoster.keys());

    return {
      originalRoster,
      updatedRoster,
      membersIntersectIds: intersection(
        updatedRosterCharIds,
        originalRosterCharIds,
      ),
      membersJoinedIds: difference(updatedRosterCharIds, originalRosterCharIds),
      membersLeaveIds: difference(originalRosterCharIds, updatedRosterCharIds),
      isFirstTimeRosterIndexed: originalRoster.size === 0,
    };
  }

  private async processRosterChanges(
    guildEntity: GuildsEntity,
    comparison: RosterComparisonResult,
    rosterUpdateAt: Date,
    isNew: boolean,
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
            this.processIntersectionMember(
              guildEntity,
              rosterUpdateAt,
              guildMemberId,
              originalRoster,
              updatedRoster,
            ),
          ),
        ),
      );
    }

    const shouldProcessJoins = membersJoinedIds.length && !isNew;
    if (shouldProcessJoins) {
      await lastValueFrom(
        from(membersJoinedIds).pipe(
          mergeMap((guildMemberId) =>
            this.processJoinMember(
              guildEntity,
              rosterUpdateAt,
              guildMemberId,
              updatedRoster,
              isFirstTimeRosterIndexed,
            ),
          ),
        ),
      );
    }

    if (membersLeaveIds.length) {
      await lastValueFrom(
        from(membersLeaveIds).pipe(
          mergeMap((guildMemberId) =>
            this.processLeaveMember(
              guildEntity,
              rosterUpdateAt,
              guildMemberId,
              originalRoster,
            ),
          ),
        ),
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
      const isRankChanged =
        guildMemberUpdated.rank !== guildMemberOriginal.rank;

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

      const logEntityGuildMemberDemote =
        this.charactersGuildsLogsRepository.create({
          characterGuid: guildMemberOriginal.characterGuid,
          guildGuid: guildEntity.guid,
          original: String(guildMemberOriginal.rank),
          updated: String(guildMemberUpdated.rank),
          action: eventAction,
          scannedAt: guildEntity.updatedAt,
          createdAt: rosterUpdatedAt,
        });

      await Promise.allSettled([
        this.charactersGuildsLogsRepository.save(logEntityGuildMemberDemote),
        this.charactersRepository.update(
          { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
          {
            guildRank: guildMemberUpdated.rank,
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
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'processIntersectionMember',
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
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

      const charactersGuildsMembersEntity =
        this.characterGuildsMembersRepository.create({
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
        const logEntityGuildMemberJoin =
          this.charactersGuildsLogsRepository.create({
            characterGuid: guildMemberUpdated.guid,
            guildGuid: guildEntity.guid,
            updated: String(guildMemberUpdated.rank),
            action: ACTION_LOG.JOIN,
            scannedAt: guildEntity.updatedAt,
            createdAt: rosterUpdatedAt,
          });

        await this.charactersGuildsLogsRepository.save(
          logEntityGuildMemberJoin,
        );
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
      this.logger.error({
        logTag: 'processJoinMember',
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
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
        const logEntityGuildMemberLeave =
          this.charactersGuildsLogsRepository.create({
            characterGuid: guildMemberOriginal.characterGuid,
            guildGuid: guildEntity.guid,
            original: String(guildMemberOriginal.rank),
            action: ACTION_LOG.LEAVE,
            scannedAt: guildEntity.updatedAt,
            createdAt: rosterUpdatedAt,
          });

        await this.charactersGuildsLogsRepository.save(
          logEntityGuildMemberLeave,
        );
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
      this.logger.error({
        logTag: 'processLeaveMember',
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
    }
  }
}
