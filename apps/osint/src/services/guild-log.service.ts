import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { ACTION_LOG } from '@app/resources';
import { CharactersGuildsLogsEntity, GuildsEntity } from '@app/pg';

@Injectable()
export class GuildLogService {
  private readonly logger = new Logger(GuildLogService.name, { timestamp: true });

  constructor(
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {}

  async logNameChange(
    original: GuildsEntity,
    updated: GuildsEntity,
  ): Promise<void> {
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
  ): Promise<void> {
    const logEntity = this.logsRepository.create({
      guildGuid: updated.guid,
      original: original.faction,
      updated: updated.faction,
      action: ACTION_LOG.FACTION,
      scannedAt: original.updatedAt,
      createdAt: updated.updatedAt,
    });

    await this.logsRepository.save(logEntity);
    this.logger.debug(`Guild ${updated.guid} faction changed: ${original.faction} → ${updated.faction}`);
  }

  async updateGuildGuidForAllLogs(oldGuid: string, newGuid: string): Promise<void> {
    await this.logsRepository.update({ guildGuid: oldGuid }, { guildGuid: newGuid });
  }

  async detectAndLogChanges(
    original: GuildsEntity,
    updated: GuildsEntity,
  ): Promise<void> {
    const isNameChanged = original.name !== updated.name;
    const isFactionChanged = original.faction !== updated.faction;

    if (!isNameChanged && !isFactionChanged) {
      this.logger.debug(`Guild ${original.guid} - no changes detected`);
      return;
    }

    if (isNameChanged) {
      await this.updateGuildGuidForAllLogs(original.guid, updated.guid);
      await this.logNameChange(original, updated);
    }

    if (isFactionChanged) {
      await this.logFactionChange(original, updated);
    }
  }
}
