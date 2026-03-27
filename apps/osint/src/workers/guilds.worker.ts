import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { forkJoin, lastValueFrom } from 'rxjs';

import {
  formatWorkerLog,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
  WorkerStats,
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
  GuildMemberService,
  GuildLogService,
  GuildMasterService,
} from '../services';

@Injectable()
@Processor(guildsQueue)
export class GuildsWorker extends WorkerHost {
  private readonly logger = new Logger(GuildsWorker.name, {
    timestamp: true,
  });

  private stats: WorkerStats = {
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
    private readonly guildMemberService: GuildMemberService,
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

      const isNotEuRegion = !isEuRegion(message.region);
      if (isNotEuRegion) {
        this.logger.log(formatWorkerLog(WorkerLogStatus.INFO, this.stats.total, guildEntity.guid, 0, 'not EU region'));
        return;
      }

      if (message.updatedBy) {
        guildEntity.updatedBy = message.updatedBy;
      }

      const [summaryResult, rosterResult] = await lastValueFrom(
        forkJoin([
          this.guildSummaryService.getSummary(nameSlug, guildEntity.realm),
          this.guildRosterService.fetchRoster(guildEntity),
        ]),
      );

      Object.assign(guildEntity, summaryResult);

      let logStatus = '-----';
      let masterStatus = '-----';

      rosterResult.updatedAt = guildEntity.updatedAt;
      await this.guildMemberService.updateRoster(guildSnapshot, rosterResult, isNew);

      const [logStatusResult, masterStatusResult] = await lastValueFrom(
        forkJoin([
          isNew
            ? this.guildService.findById(guildSnapshot.id, guildSnapshot.realm).then((guildById) => {
                if (!guildById) return '-----' as const;
                return this.guildLogService.detectAndLogChanges(guildById, guildEntity);
              })
            : this.guildLogService.detectAndLogChanges(guildSnapshot, guildEntity),
          this.guildMasterService.detectAndLogGuildMasterChange(guildSnapshot, rosterResult),
        ]),
      );

      logStatus = logStatusResult;
      masterStatus = masterStatusResult;

      const operationStatuses = {
        roster: rosterResult.status,
        logs: logStatus,
        master: masterStatus,
      };

      guildEntity.status = this.aggregateGuildStatus(guildEntity.status, operationStatuses);

      const hasErrors = hasAnyGuildErrorInString(guildEntity.status);
      const isSuccess = isAllGuildSuccessInString(guildEntity.status);

      if (!hasErrors && isSuccess) {
        this.stats.success++;
      }

      await this.guildService.save(guildEntity);

      const duration = Date.now() - startTime;
      this.logGuildResult(guildEntity, duration);

      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${message.name}@${message.realm}` : 'unknown';

      this.stats.errors++;
      this.logger.error(
        formatWorkerErrorLog(this.stats.total, guid, duration, errorOrException.message, message.updatedBy),
      );

      throw errorOrException;
    }
  }

  private aggregateGuildStatus(currentStatus: string, operationStatuses: Record<string, string | undefined>): string {
    let aggregated = currentStatus || '-----';

    const operations: Array<{
      name: 'ROSTER' | 'MEMBERS' | 'LOGS' | 'MASTER';
      statusString: string | undefined;
      errorIndicator: string;
    }> = [
      {
        name: 'ROSTER',
        statusString: operationStatuses.roster,
        errorIndicator: 'r',
      },
      {
        name: 'MEMBERS',
        statusString: operationStatuses.roster,
        errorIndicator: 'm',
      },
      {
        name: 'LOGS',
        statusString: operationStatuses.logs,
        errorIndicator: 'l',
      },
      {
        name: 'MASTER',
        statusString: operationStatuses.master,
        errorIndicator: 'g',
      },
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
    const statusCode = guild.statusCode;
    const status = guild.status;
    const guid = guild.guid;

    if (status) {
      const hasErrors = hasAnyGuildErrorInString(status);
      const isSuccess = isAllGuildSuccessInString(status);

      if (isSuccess) {
        this.logger.log(
          formatWorkerLog(WorkerLogStatus.SUCCESS, this.stats.total, guid, duration, `status: ${status}`),
        );
      } else if (hasErrors) {
        this.logger.warn(
          formatWorkerLog(WorkerLogStatus.PARTIAL, this.stats.total, guid, duration, `status: ${status}`),
        );
      } else {
        this.logger.log(formatWorkerLog(WorkerLogStatus.INFO, this.stats.total, guid, duration, `status: ${status}`));
      }
      return;
    }

    if (statusCode === 200 || statusCode === 204) {
      this.stats.success++;
      this.logger.log(
        formatWorkerLog(WorkerLogStatus.SUCCESS, this.stats.total, guid, duration, statusCode.toString()),
      );
    } else if (statusCode === 404) {
      this.stats.notFound++;
      this.logger.warn(formatWorkerLog(WorkerLogStatus.NOT_FOUND, this.stats.total, guid, duration));
    } else if (statusCode === 429) {
      this.stats.rateLimit++;
      this.logger.warn(formatWorkerLog(WorkerLogStatus.RATE_LIMITED, this.stats.total, guid, duration));
    } else {
      this.logger.log(formatWorkerLog(WorkerLogStatus.INFO, this.stats.total, guid, duration, statusCode?.toString()));
    }
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('GuildsWorker', this.stats, 'guilds'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('GuildsWorker', this.stats, 'guilds'));
  }
}
