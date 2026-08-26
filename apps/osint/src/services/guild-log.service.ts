import { formatServiceErrorLog } from '@app/logger';
import { CharactersGuildsLogsEntity, type GuildsEntity } from '@app/pg';
import { ACTION_LOG, GuildStatusState, setGuildStatusString, toNormalizedString } from '@app/resources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

@Injectable()
export class GuildLogService {
  private readonly logger = new Logger(GuildLogService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {}

  async logNameChange(original: GuildsEntity, updated: GuildsEntity): Promise<void> {
    const logEntity = this.logsRepository.create({
      guildGuid: updated.guid,
      original: original.name,
      updated: updated.name,
      action: ACTION_LOG.NAME,
      scannedAt: original.updatedAt,
      createdAt: updated.updatedAt,
    });

    await this.logsRepository.save(logEntity);
    this.logger.debug(`Guild ${updated.guid} name changed: ${original.name} → ${updated.name}`);
  }

  async logFactionChange(
    original: GuildsEntity,
    updated: GuildsEntity,
    originalFaction: string,
    updatedFaction: string,
  ): Promise<void> {
    const logEntity = this.logsRepository.create({
      guildGuid: updated.guid,
      original: originalFaction,
      updated: updatedFaction,
      action: ACTION_LOG.FACTION,
      scannedAt: original.updatedAt,
      createdAt: updated.updatedAt,
    });

    await this.logsRepository.save(logEntity);
    this.logger.debug(`Guild ${updated.guid} faction changed: ${originalFaction} → ${updatedFaction}`);
  }

  async updateGuildGuidForAllLogs(oldGuid: string, newGuid: string): Promise<void> {
    await this.logsRepository.update({ guildGuid: oldGuid }, { guildGuid: newGuid });
  }

  async detectAndLogChanges(original: GuildsEntity, updated: GuildsEntity): Promise<string> {
    try {
      const originalFaction = toNormalizedString(original.faction);
      const updatedFaction = toNormalizedString(updated.faction);

      const isNameChanged = original.name !== updated.name;
      const isFactionChanged =
        Boolean(originalFaction) && Boolean(updatedFaction) && originalFaction !== updatedFaction;

      if (!isNameChanged && !isFactionChanged) {
        this.logger.debug(`Guild ${original.guid} - no changes detected`);
        return setGuildStatusString('-----', 'LOGS', GuildStatusState.SUCCESS);
      }

      if (isNameChanged) {
        await this.updateGuildGuidForAllLogs(original.guid, updated.guid);
        await this.logNameChange(original, updated);
      }

      if (isFactionChanged) {
        await this.logFactionChange(original, updated, originalFaction ?? '', updatedFaction ?? '');
      }

      return setGuildStatusString('-----', 'LOGS', GuildStatusState.SUCCESS);
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'detectAndLogChanges',
          original.guid,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
      return setGuildStatusString('-----', 'LOGS', GuildStatusState.ERROR);
    }
  }
}
