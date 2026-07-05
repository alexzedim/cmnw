import { Injectable, Logger } from '@nestjs/common';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import {
  ACTION_LOG,
  GuildStatusState,
  IGuildMember,
  IGuildRoster,
  OSINT_GM_RANK,
  OSINT_SOURCE,
  setGuildStatusString,
} from '@app/resources';
import { CharactersEntity, CharactersGuildsMembersEntity, CharactersGuildsLogsEntity, GuildsEntity } from '@app/pg';

@Injectable()
export class GuildMasterService {
  private readonly logger = new Logger(GuildMasterService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly guildMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {}

  async detectAndLogGuildMasterChange(guildEntity: GuildsEntity, updatedRoster: IGuildRoster): Promise<string> {
    try {
      const originalGM = await this.guildMembersRepository.findOneBy({
        guildGuid: guildEntity.guid,
        rank: OSINT_GM_RANK,
      });

      if (!originalGM) {
        return setGuildStatusString('-----', 'MASTER', GuildStatusState.SUCCESS);
      }

      const newGM = updatedRoster.members.find((member) => member.rank === OSINT_GM_RANK);

      if (!newGM) {
        this.logger.warn(`No new Guild Master found for ${guildEntity.guid}`);
        return setGuildStatusString('-----', 'MASTER', GuildStatusState.SUCCESS);
      }

      const isGMChanged = Number(originalGM.characterId) !== Number(newGM.id);

      if (!isGMChanged) {
        this.logger.debug(`No GM change for ${guildEntity.guid} | GM: ${originalGM.characterId}`);
        return setGuildStatusString('-----', 'MASTER', GuildStatusState.SUCCESS);
      }

      const previousGMInRoster = updatedRoster.members.find((member) => member.id === Number(originalGM.characterId));
      const previousGMNewRank = previousGMInRoster ? previousGMInRoster.rank : null;

      await this.applyGuildMasterTransition(guildEntity, originalGM, newGM, previousGMNewRank, updatedRoster.updatedAt);

      return setGuildStatusString('-----', 'MASTER', GuildStatusState.SUCCESS);
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'detectAndLogGuildMasterChange',
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
      return setGuildStatusString('-----', 'MASTER', GuildStatusState.ERROR);
    }
  }

  private async applyGuildMasterTransition(
    guildEntity: GuildsEntity,
    originalGM: CharactersGuildsMembersEntity,
    newGM: IGuildMember,
    previousGMNewRank: number | null,
    timestamp: Date | undefined,
  ): Promise<void> {
    const [originalGMChar, newGMChar] = await Promise.all([
      this.charactersRepository.findOneBy({
        guid: originalGM.characterGuid,
        hashA: Not(IsNull()),
      }),
      this.charactersRepository.findOneBy({
        guid: newGM.guid,
        hashA: Not(IsNull()),
      }),
    ]);

    const action = this.determineGMTransitionAction(originalGMChar, newGMChar);

    const scannedAt = guildEntity.updatedAt;
    const createdAt = timestamp;

    const logEntities = [
      {
        guildGuid: guildEntity.guid,
        characterGuid: originalGM.characterGuid,
        original: originalGM.characterGuid,
        updated: newGM.guid,
        action,
        scannedAt,
        createdAt,
      },
      {
        guildGuid: guildEntity.guid,
        characterGuid: newGM.guid,
        original: originalGM.characterGuid,
        updated: newGM.guid,
        action,
        scannedAt,
        createdAt,
      },
    ];

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(CharactersGuildsMembersEntity)
        .set({ rank: newGM.rank, updatedBy: OSINT_SOURCE.GUILD_ROSTER })
        .where('guild_guid = :guildGuid AND character_id = :characterId', {
          guildGuid: guildEntity.guid,
          characterId: newGM.id,
        })
        .execute();

      if (previousGMNewRank !== null) {
        await manager
          .createQueryBuilder()
          .update(CharactersGuildsMembersEntity)
          .set({ rank: previousGMNewRank, updatedBy: OSINT_SOURCE.GUILD_ROSTER })
          .where('guild_guid = :guildGuid AND character_id = :characterId', {
            guildGuid: guildEntity.guid,
            characterId: Number(originalGM.characterId),
          })
          .execute();

        await manager.update(
          CharactersEntity,
          { guid: originalGM.characterGuid },
          { guildRank: previousGMNewRank, updatedBy: OSINT_SOURCE.GUILD_ROSTER },
        );
      }

      await manager.update(
        CharactersEntity,
        { guid: newGM.guid },
        { guildRank: newGM.rank, updatedBy: OSINT_SOURCE.GUILD_ROSTER },
      );

      await manager.insert(CharactersGuildsLogsEntity, logEntities);
    });

    this.logger.debug(
      `Guild ${guildEntity.guid} GM transition applied: ${action} (${originalGM.characterGuid} → ${newGM.guid})`,
    );
  }

  private determineGMTransitionAction(originalGM: CharactersEntity | null, newGM: CharactersEntity | null): ACTION_LOG {
    const areBothGMsFound = Boolean(originalGM) && Boolean(newGM);

    if (areBothGMsFound) {
      const isSameFamily = originalGM.hashA === newGM.hashA;
      return isSameFamily ? ACTION_LOG.GUILD_INHERIT : ACTION_LOG.GUILD_OWNERSHIP;
    }

    return ACTION_LOG.GUILD_TRANSIT;
  }
}
