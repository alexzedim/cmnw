import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { isAxiosError } from 'axios';

import {
  formatWorkerLog,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
} from '@app/logger';
import {
  isEuRegion,
  toSlug,
  hasAnyGuildErrorInString,
  isAllGuildSuccessInString,
  setGuildStatusString,
  GuildStatusState,
  guildsQueue,
  IGuildMessageBase,
} from '@app/resources';

import {
  GuildService,
  GuildSummaryService,
  GuildRosterService,
  GuildLogService,
  GuildMasterService,
} from '../services';

const PROGRESS_LOG_INTERVAL = 50;

@Injectable()
@Processor(guildsQueue)
export class GuildsWorker extends WorkerHost {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private stats = {
    total: 0,
    success: 0,
    errors: 0,
    rateLimit: 0,
    notFound: 0,
    skipped: 0,
    startTime: Date.now(),
  };

  constructor(
    private readonly guildService: GuildService,
    private readonly guildSummaryService: GuildSummaryService,
    private readonly guildRosterService: GuildRosterService,
    private readonly guildMemberService: any,
    private readonly guildLogService: GuildLogService,
    private readonly guildMasterService: GuildMasterService,
  ) {
    super();
  }

  async process(job: Job<IGuildMessageBase>): Promise<void> {
    const message = job.data;
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { guildEntity, isNew, isNotReadyToUpdate, isCreateOnlyUnique } =
        await this.guildService.findOrCreate(message);

      if (isNotReadyToUpdate) {
        this.stats.skipped++;
        this.logger.log(formatWorkerLog(WorkerLogStatus.SKIPPED, this.stats.total, guildEntity.guid, 0, 'not ready'));
        return;
      }

      if (isCreateOnlyUnique) {
        this.stats.skipped++;
        this.logger.log(formatWorkerLog(WorkerLogStatus.SKIPPED, this.stats.total, guildEntity.guid, 0, 'createOnly'));
        return;
      }

      const guildSnapshot = this.guildService.createSnapshot(guildEntity);
      const nameSlug = toSlug(guildEntity.name);

      if (!isEuRegion(message.region)) {
        this.logger.log(formatWorkerLog(WorkerLogStatus.INFO, this.stats.total, guildEntity.guid, 0, 'not EU region'));
        return;
      }

      if (message.updatedBy) {
        guildEntity.updatedBy = message.updatedBy;
      }

      const guildData = await this.fetchGuildData(nameSlug, guildEntity);

      Object.assign(guildEntity, guildData.summaryResult);

      guildData.rosterResult.updatedAt = guildEntity.updatedAt;
      await this.guildMemberService.updateRoster(guildSnapshot, guildData.rosterResult, isNew);

      const logStatusResult = isNew
        ? this.getLogStatusForNewGuild(guildSnapshot, guildEntity)
        : this.guildLogService.detectAndLogChanges(guildSnapshot, guildEntity);
      
      const masterStatusResult = this.guildMasterService.detectAndLogGuildMasterChange(
        guildSnapshot,
        guildData.rosterResult,
      );

      const [logStatusResolved, masterStatusResolved] = await Promise.allSettled([logStatusResult, masterStatusResult]);

      const logStatus = logStatusResolved.status === 'fulfilled' ? logStatusResolved.value : '-----';
      const masterStatus = masterStatusResolved.status === 'fulfilled' ? masterStatusResolved.value : '-----';

      const operationStatuses = {
        roster: guildData.rosterResult.status,
        logs: logStatus,
        master: masterStatus,
      };

      guildEntity.status = this.aggregateGuildStatus(guildEntity.status, operationStatuses);
      await this.guildService.save(guildEntity);

      if (!hasAnyGuildErrorInString(guildEntity.status) && isAllGuildSuccessInString(guildEntity.status)) {
        this.stats.success++;
      }

      const duration = Date.now() - startTime;
      this.logGuildResult(guildEntity, duration);

      if (this.stats.total % PROGRESS_LOG_INTERVAL === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${message.name}@${message.realm}` : 'unknown';

      this.stats.errors++;

      if (isAxiosError(errorOrException)) {
        const statusCode = errorOrException.response?.status;
        this.logger.error(
          formatWorkerErrorLog(
            this.stats.total,
            guid,
            duration,
            `HTTP ${statusCode}: ${errorOrException.message}`,
            message.updatedBy,
          ),
        );
      } else {
        this.logger.error(
          formatWorkerErrorLog(
            this.stats.total,
            guid,
            duration,
            errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
            message.updatedBy,
          ),
        );
      }

      throw errorOrException;
    }
  }

  private async getLogStatusForNewGuild(guildSnapshot: any, guildEntity: any): Promise<string> {
    const guildById = await this.guildService.findById(guildSnapshot.id, guildSnapshot.realm);
    if (!guildById) return '-----' as const;
    return this.guildLogService.detectAndLogChanges(guildById, guildEntity);
  }

  private async fetchGuildData(
    nameSlug: string,
    guildEntity: any,
  ): Promise<{
    summaryResult: any;
    rosterResult: any;
  }> {
    const [summaryResult, rosterResult] = await Promise.allSettled([
      this.guildSummaryService.getSummary(nameSlug, guildEntity.realm),
      this.guildRosterService.fetchRoster(guildEntity),
    ]);

    return {
      summaryResult: summaryResult.status === 'fulfilled' ? summaryResult.value : {},
      rosterResult:
        rosterResult.status === 'fulfilled' ? rosterResult.value : { status: '-----', updatedAt: new Date() },
    };
  }

  private aggregateGuildStatus(currentStatus: string, operationStatuses: Record<string, string | undefined>): string {
    let aggregated = currentStatus || '-----';

    const operations: Array<{
      name: 'ROSTER' | 'MEMBERS' | 'LOGS' | 'MASTER';
      statusString: string | undefined;
      errorIndicator: string;
    }> = [
      { name: 'ROSTER', statusString: operationStatuses.roster, errorIndicator: 'r' },
      { name: 'MEMBERS', statusString: operationStatuses.roster, errorIndicator: 'm' },
      { name: 'LOGS', statusString: operationStatuses.logs, errorIndicator: 'l' },
      { name: 'MASTER', statusString: operationStatuses.master, errorIndicator: 'g' },
    ];

    for (const operation of operations) {
      const hasError = operation.statusString?.includes(operation.errorIndicator.toLowerCase()) ?? false;
      aggregated = setGuildStatusString(
        aggregated,
        operation.name,
        hasError ? GuildStatusState.ERROR : GuildStatusState.SUCCESS,
      );
    }

    return aggregated;
  }

  private logGuildResult(guild: any, duration: number): void {
    const status = guild.status;
    const guid = guild.guid;

    const hasErrors = hasAnyGuildErrorInString(status);
    const isSuccess = isAllGuildSuccessInString(status);

    if (isSuccess) {
      this.logger.log(formatWorkerLog(WorkerLogStatus.SUCCESS, this.stats.total, guid, duration, `status: ${status}`));
    } else if (hasErrors) {
      this.logger.warn(formatWorkerLog(WorkerLogStatus.PARTIAL, this.stats.total, guid, duration, `status: ${status}`));
    } else {
      this.logger.log(formatWorkerLog(WorkerLogStatus.INFO, this.stats.total, guid, duration, `status: ${status}`));
    }
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('GuildsWorker', this.stats, 'guilds'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('GuildsWorker', this.stats, 'guilds'));
  }
}
