import { BATTLE_NET_KEY_TAG_OSINT, BattleNetService, type IBattleNetClientConfig } from '@app/battle-net';
import {
  formatFinalSummary,
  formatProgressReport,
  formatWorkerErrorLog,
  formatWorkerLog,
  WorkerLogStatus,
} from '@app/logger';
import type { GuildsEntity } from '@app/pg';
import {
  FeedEventCategory,
  FeedStatus,
  GuildStatusState,
  guildsQueue,
  hasCoreGuildErrorInString,
  type IGuildMessageBase,
  type IGuildRoster,
  type IGuildSummary,
  type IRefreshContext,
  isCoreGuildSuccessInString,
  isEuRegion,
  isGuildOperationErrorInString,
  PROGRESS_LOG_INTERVAL,
  setGuildStatusString,
  toSlug,
} from '@app/resources';
import { FeedService } from '@app/resources/services/feed.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  GuildLogService,
  GuildMasterService,
  GuildMemberService,
  GuildRosterService,
  GuildService,
  GuildSummaryService,
} from '../services';

@Injectable()
@Processor(guildsQueue)
export class GuildsWorker extends WorkerHost {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private stats = {
    total: 0,
    success: 0,
    errors: 0,
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
    private readonly battleNetService: BattleNetService,
    private readonly feedService: FeedService,
  ) {
    super();
  }

  async process(job: Job<IGuildMessageBase>): Promise<void> {
    const message = job.data;
    const startTime = Date.now();
    this.stats.total++;

    const refreshCtx = message.sessionId
      ? { sessionId: message.sessionId, requestId: message.requestId, guid: message.guid }
      : null;

    try {
      if (refreshCtx) {
        await this.emitRefresh(refreshCtx, FeedStatus.INFO, `refresh started`, { phase: 'started' });
      }

      const { guildEntity, isNew, isNotReadyToUpdate, isCreateOnlyUnique } =
        await this.guildService.findOrCreate(message);

      if (isNotReadyToUpdate) {
        this.stats.skipped++;
        const duration = Date.now() - startTime;
        this.logger.log(
          formatWorkerLog(WorkerLogStatus.SKIPPED, this.stats.total, guildEntity.guid, duration, 'not ready'),
        );
        if (refreshCtx) {
          await this.emitRefresh(refreshCtx, FeedStatus.SKIPPED, `refresh skipped: notReady`, {
            phase: 'skipped',
            durationMs: duration,
            reason: 'notReady',
          });
        }
        return;
      }

      if (isCreateOnlyUnique) {
        this.stats.skipped++;
        const duration = Date.now() - startTime;
        this.logger.log(
          formatWorkerLog(WorkerLogStatus.SKIPPED, this.stats.total, guildEntity.guid, duration, 'createOnly'),
        );
        if (refreshCtx) {
          await this.emitRefresh(refreshCtx, FeedStatus.SKIPPED, `refresh skipped: createOnly`, {
            phase: 'skipped',
            durationMs: duration,
            reason: 'createOnly',
          });
        }
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

      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_OSINT);

      const guildData = await this.fetchGuildData(nameSlug, guildEntity, config);

      const { status: summaryStatus, ...summaryFields } = guildData.summaryResult;
      Object.assign(guildEntity, summaryFields);

      guildData.rosterResult.updatedAt = guildEntity.updatedAt;
      await this.guildMemberService.updateRoster(guildEntity, guildData.rosterResult, isNew);

      const logStatusResult = isNew
        ? this.getLogStatusForNewGuild(guildSnapshot, guildEntity)
        : this.guildLogService.detectAndLogChanges(guildSnapshot, guildEntity);

      const masterStatusResult = this.guildMasterService.detectAndLogGuildMasterChange(
        guildSnapshot,
        guildData.rosterResult,
      );

      const [logStatusResolved, masterStatusResolved] = await Promise.allSettled([logStatusResult, masterStatusResult]);

      const logStatus = logStatusResolved.status === 'fulfilled' ? logStatusResolved.value : undefined;
      const masterStatus = masterStatusResolved.status === 'fulfilled' ? masterStatusResolved.value : undefined;

      const operationStatuses = {
        summary: summaryStatus,
        roster: guildData.rosterResult.status,
        logs: logStatus,
        master: masterStatus,
      };

      guildEntity.status = this.aggregateGuildStatus(guildEntity.status, operationStatuses);
      guildEntity.updatedAt = new Date();
      await this.guildService.save(guildEntity);

      if (!hasCoreGuildErrorInString(guildEntity.status) && isCoreGuildSuccessInString(guildEntity.status)) {
        this.stats.success++;
      }

      const duration = Date.now() - startTime;
      this.logGuildResult(guildEntity, duration, refreshCtx);

      if (this.stats.total % PROGRESS_LOG_INTERVAL === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${message.name}@${message.realm}` : 'unknown';
      const error = errorOrException instanceof Error ? errorOrException.message : String(errorOrException);

      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, duration, error, message.updatedBy));
      if (refreshCtx) {
        await this.emitRefresh(refreshCtx, FeedStatus.ERROR, `refresh error`, {
          phase: 'error',
          durationMs: duration,
          error,
        });
      }
      throw errorOrException;
    }
  }

  private async getLogStatusForNewGuild(guildSnapshot: GuildsEntity, guildEntity: GuildsEntity): Promise<string> {
    const guildById = await this.guildService.findById(guildSnapshot.id, guildSnapshot.realm);
    if (!guildById) return '-----' as const;
    return this.guildLogService.detectAndLogChanges(guildById, guildEntity);
  }

  private async fetchGuildData(
    nameSlug: string,
    guildEntity: GuildsEntity,
    config: IBattleNetClientConfig,
  ): Promise<{
    summaryResult: Partial<IGuildSummary>;
    rosterResult: IGuildRoster;
  }> {
    const [summaryResult, rosterResult] = await Promise.allSettled([
      this.guildSummaryService.getSummary(nameSlug, guildEntity.realm, config),
      this.guildRosterService.fetchRoster(guildEntity, config),
    ]);

    return {
      summaryResult: summaryResult.status === 'fulfilled' ? summaryResult.value : {},
      rosterResult:
        rosterResult.status === 'fulfilled'
          ? rosterResult.value
          : ({
              members: [],
              updatedAt: new Date(),
              status: setGuildStatusString('-----', 'ROSTER', GuildStatusState.ERROR),
            } as IGuildRoster),
    };
  }

  private aggregateGuildStatus(
    currentStatus: string,
    operationStatuses: { summary?: string; roster?: string; logs?: string; master?: string },
  ): string {
    let aggregated = currentStatus || '-----';

    const operations: Array<{
      name: 'SUMMARY' | 'ROSTER' | 'MEMBERS' | 'LOGS' | 'MASTER';
      statusString: string | undefined;
    }> = [
      { name: 'SUMMARY', statusString: operationStatuses.summary },
      { name: 'ROSTER', statusString: operationStatuses.roster },
      { name: 'MEMBERS', statusString: operationStatuses.roster },
      { name: 'LOGS', statusString: operationStatuses.logs },
      { name: 'MASTER', statusString: operationStatuses.master },
    ];

    for (const operation of operations) {
      if (!operation.statusString) {
        continue;
      }
      const hasError = isGuildOperationErrorInString(operation.statusString, operation.name);
      aggregated = setGuildStatusString(
        aggregated,
        operation.name,
        hasError ? GuildStatusState.ERROR : GuildStatusState.SUCCESS,
      );
    }

    return aggregated;
  }

  private logGuildResult(guild: GuildsEntity, duration: number, refreshCtx: IRefreshContext | null): void {
    const status = guild.status;
    const guid = guild.guid;

    const hasErrors = hasCoreGuildErrorInString(status);
    const isSuccess = isCoreGuildSuccessInString(status);

    let feedStatus: FeedStatus;
    let logStatus: WorkerLogStatus;

    if (isSuccess) {
      feedStatus = FeedStatus.SUCCESS;
      logStatus = WorkerLogStatus.SUCCESS;
    } else if (hasErrors) {
      feedStatus = FeedStatus.PARTIAL;
      logStatus = WorkerLogStatus.PARTIAL;
    } else {
      feedStatus = FeedStatus.INFO;
      logStatus = WorkerLogStatus.INFO;
    }

    this.logger.log(formatWorkerLog(logStatus, this.stats.total, guid, duration, `status: ${status}`));

    if (refreshCtx) {
      // Client-driven refresh: route terminal event only to the originating session.
      void this.emitRefresh(refreshCtx, feedStatus, `refresh finished`, {
        phase: 'finished',
        durationMs: duration,
        status,
      });
    } else {
      // Background indexing: broadcast to everyone.
      this.feedService.emitWorker(
        feedStatus,
        this.stats.total,
        `guild ${guid}`,
        duration,
        'osint.guilds',
        FeedEventCategory.GUILD,
        { guid, status },
      );
    }
  }

  private emitRefresh(
    ctx: IRefreshContext,
    status: FeedStatus,
    message: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    return this.feedService.emit({
      category: FeedEventCategory.GUILD,
      status,
      message,
      source: 'osint.guilds.refresh',
      meta: { ...ctx, ...meta },
    });
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('GuildsWorker', this.stats, 'guilds'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('GuildsWorker', this.stats, 'guilds'));
  }
}
