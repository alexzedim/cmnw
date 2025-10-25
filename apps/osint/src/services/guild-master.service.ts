import { Injectable, Logger } from '@nestjs/common';
import { Repository, IsNull, Not } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { ACTION_LOG, IGuildRoster, OSINT_GM_RANK } from '@app/resources';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersGuildsLogsEntity,
  GuildsEntity,
} from '@app/pg';

@Injectable()
export class GuildMasterService {
  private readonly logger = new Logger(GuildMasterService.name, { timestamp: true });

  constructor(
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly guildMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {}

  async detectAndLogGuildMasterChange(
    guildEntity: GuildsEntity,
    updatedRoster: IGuildRoster,
  ): Promise<void> {
    try {
      const originalGM = await this.guildMembersRepository.findOneBy({
        guildGuid: guildEntity.guid,
        rank: OSINT_GM_RANK,
      });

      if (!originalGM) {
        return;
      }

      const newGM = updatedRoster.members.find(
        (member) => member.rank === OSINT_GM_RANK,
      );

      if (!newGM) {
        this.logger.warn(`No new Guild Master found for ${guildEntity.guid}`);
        return;
      }

      const isGMChanged = Number(originalGM.characterId) !== Number(newGM.id);

      if (!isGMChanged) {
        this.logger.debug(
          `No GM change for ${guildEntity.guid} | GM: ${originalGM.characterId}`,
        );
        return;
      }

      await this.logGuildMasterTransition(
        guildEntity,
        originalGM.characterGuid,
        newGM.guid,
        updatedRoster.updatedAt,
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'detectAndLogGuildMasterChange',
        guildGuid: guildEntity.guid,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  private async logGuildMasterTransition(
    guildEntity: GuildsEntity,
    originalGMGuid: string,
    newGMGuid: string,
    timestamp: Date,
  ): Promise<void> {
    const [originalGMChar, newGMChar] = await Promise.all([
      this.charactersRepository.findOneBy({
        guid: originalGMGuid,
        hashA: Not(IsNull()),
      }),
      this.charactersRepository.findOneBy({
        guid: newGMGuid,
        hashA: Not(IsNull()),
      }),
    ]);

    const action = this.determineGMTransitionAction(originalGMChar, newGMChar);

    const logEntities = [
      this.logsRepository.create({
        guildGuid: guildEntity.guid,
        characterGuid: originalGMGuid,
        original: originalGMGuid,
        updated: newGMGuid,
        action,
        scannedAt: guildEntity.updatedAt,
        createdAt: timestamp,
      }),
      this.logsRepository.create({
        guildGuid: guildEntity.guid,
        characterGuid: newGMGuid,
        original: originalGMGuid,
        updated: newGMGuid,
        action,
        scannedAt: guildEntity.updatedAt,
        createdAt: timestamp,
      }),
    ];

    await this.logsRepository.save(logEntities);
    
    this.logger.debug(
      `Guild ${guildEntity.guid} GM transition logged: ${action} (${originalGMGuid} → ${newGMGuid})`,
    );
  }

  private determineGMTransitionAction(
    originalGM: CharactersEntity | null,
    newGM: CharactersEntity | null,
  ): ACTION_LOG {
    const areBothGMsFound = Boolean(originalGM) && Boolean(newGM);

    if (areBothGMsFound) {
      const isSameFamily = originalGM.hashA === newGM.hashA;
      return isSameFamily ? ACTION_LOG.GUILD_INHERIT : ACTION_LOG.GUILD_OWNERSHIP;
    }

    return ACTION_LOG.GUILD_TRANSIT;
  }
}
