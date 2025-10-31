import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GuildsEntity,
  CharactersGuildsMembersEntity,
  CharactersGuildsLogsEntity,
} from '@app/pg';
import { ACTION_LOG, OSINT_GM_RANK, OSINT_SOURCE } from '@app/resources';

@Injectable()
export class TestsWorker {
  private readonly logger = new Logger(TestsWorker.name, { timestamp: true });

  constructor(
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly charactersGuildsLogsRepository: Repository<CharactersGuildsLogsEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly characterGuildsMembersRepository: Repository<CharactersGuildsMembersEntity>,
  ) {}

  /**
   * Test intersection logic - member rank change
   */
  async processIntersectionMember(
    guildEntity: GuildsEntity,
    rosterUpdateAt: Date,
    guildMemberId: number,
    originalRoster: Map<number, CharactersGuildsMembersEntity>,
    updatedRoster: Map<number, any>,
  ): Promise<any> {
    try {
      const guildMemberOriginal = originalRoster.get(guildMemberId);
      const guildMemberUpdated = updatedRoster.get(guildMemberId);
      const isRankChanged =
        guildMemberUpdated.rank !== guildMemberOriginal.rank;

      if (!isRankChanged) return { action: 'no_change' };

      const isNotGuildMaster =
        guildMemberOriginal.rank !== OSINT_GM_RANK ||
        guildMemberUpdated.rank !== OSINT_GM_RANK;
      const isDemote = guildMemberUpdated.rank > guildMemberOriginal.rank;

      const eventAction = isDemote ? ACTION_LOG.DEMOTE : ACTION_LOG.PROMOTE;

      if (isNotGuildMaster) {
        const logEntity = this.charactersGuildsLogsRepository.create({
          characterGuid: guildMemberOriginal.characterGuid,
          guildGuid: guildEntity.guid,
          original: String(guildMemberOriginal.rank),
          updated: String(guildMemberUpdated.rank),
          action: eventAction,
          scannedAt: guildEntity.updatedAt,
          createdAt: rosterUpdateAt,
        });

        return {
          action: eventAction,
          original: guildMemberOriginal.rank,
          updated: guildMemberUpdated.rank,
          logEntity,
        };
      }

      return { action: 'guild_master_skip' };
    } catch (error) {
      this.logger.error('processIntersectionMember error', error);
      return { error: error.message };
    }
  }

  /**
   * Test join logic - new member joining
   */
  async processJoinMember(
    guildEntity: GuildsEntity,
    rosterUpdateAt: Date,
    guildMemberId: number,
    updatedRoster: Map<number, any>,
  ): Promise<any> {
    try {
      const guildMemberUpdated = updatedRoster.get(guildMemberId);
      const isNotGuildMaster = guildMemberUpdated.rank !== OSINT_GM_RANK;

      const memberEntity = this.characterGuildsMembersRepository.create({
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
        lastModified: rosterUpdateAt,
      });

      let logEntity = null;
      if (isNotGuildMaster) {
        logEntity = this.charactersGuildsLogsRepository.create({
          characterGuid: guildMemberUpdated.guid,
          guildGuid: guildEntity.guid,
          updated: String(guildMemberUpdated.rank),
          action: ACTION_LOG.JOIN,
          scannedAt: guildEntity.updatedAt,
          createdAt: rosterUpdateAt,
        });
      }

      return {
        action: ACTION_LOG.JOIN,
        memberEntity,
        logEntity,
        isGuildMaster: !isNotGuildMaster,
      };
    } catch (error) {
      this.logger.error('processJoinMember error', error);
      return { error: error.message };
    }
  }

  /**
   * Test leave logic - member leaving guild
   */
  async processLeaveMember(
    guildEntity: GuildsEntity,
    rosterUpdateAt: Date,
    guildMemberId: number,
    originalRoster: Map<number, CharactersGuildsMembersEntity>,
  ): Promise<any> {
    try {
      const guildMemberOriginal = originalRoster.get(guildMemberId);
      const isNotGuildMaster = guildMemberOriginal.rank !== OSINT_GM_RANK;

      let logEntity = null;
      if (isNotGuildMaster) {
        logEntity = this.charactersGuildsLogsRepository.create({
          characterGuid: guildMemberOriginal.characterGuid,
          guildGuid: guildEntity.guid,
          original: String(guildMemberOriginal.rank),
          action: ACTION_LOG.LEAVE,
          scannedAt: guildEntity.updatedAt,
          createdAt: rosterUpdateAt,
        });
      }

      return {
        action: ACTION_LOG.LEAVE,
        originalMember: guildMemberOriginal,
        logEntity,
        isGuildMaster: !isNotGuildMaster,
      };
    } catch (error) {
      this.logger.error('processLeaveMember error', error);
      return { error: error.message };
    }
  }
}
