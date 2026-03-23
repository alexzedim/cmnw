import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { forkJoin, lastValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import chalk from 'chalk';

import {
  formatWorkerLog,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
  WorkerStats,
} from '@app/logger';
import { BlizzardApiService } from '@app/resources/services';
import {
  isEuRegion,
  toSlug,
  hasAnyGuildErrorInString,
  isAllGuildSuccessInString,
  setGuildStatusString,
  GuildStatusState,
  guildsQueue,
  IGuildMessageBase,
  RateLimitError,
} from '@app/resources';
import { KeysEntity } from '@app/pg';

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

  // TODO: Replace with new Blizzard API client implementation
  private BNet: any;
  private currentAccessToken: string | null = null;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly guildService: GuildService,
    private readonly guildSummaryService: GuildSummaryService,
    private readonly guildRosterService: GuildRosterService,
    private readonly guildMemberService: GuildMemberService,
    private readonly guildLogService: GuildLogService,
    private readonly guildMasterService: GuildMasterService,
    private readonly blizzardApiService: BlizzardApiService,
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

      const { client, accessToken } = await this.initializeApiClient(message);
      this.BNet = client;
      this.currentAccessToken = accessToken;

      if (message.updatedBy) {
        guildEntity.updatedBy = message.updatedBy;
      }

      const [summaryResult, rosterResult] = await lastValueFrom(
        forkJoin([
          this.callWithRetry(() => this.guildSummaryService.getSummary(nameSlug, guildEntity.realm, this.BNet)),
          this.callWithRetry(() => this.guildRosterService.fetchRoster(guildEntity, this.BNet)),
        ]),
      );

      if (this.currentAccessToken) {
        await this.blizzardApiService.recordSuccess(this.currentAccessToken);
      }

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

      if (errorOrException instanceof RateLimitError) {
        this.stats.rateLimit++;
        this.logger.warn(
          formatWorkerLog(
            WorkerLogStatus.RATE_LIMITED,
            this.stats.total,
            guid,
            duration,
            `Retry after: ${errorOrException.retryAfter || 'unknown'}s`,
          ),
        );
        throw errorOrException;
      }

      if (this.currentAccessToken) {
        const statusCode = isAxiosError(errorOrException) ? errorOrException.response?.status : 0;
        await this.blizzardApiService.recordError(this.currentAccessToken, statusCode);
      }

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

  // TODO: Replace with new Blizzard API client implementation
  private async initializeApiClient(args: IGuildMessageBase): Promise<{ client: any; accessToken: string }> {
    const pooledKey = await this.blizzardApiService.getNextKey({
      tag: 'blizzard',
      skipCooldown: true,
    });

    if (pooledKey && pooledKey.token) {
      const client = this.blizzardApiService.createClientFromKey(pooledKey, args.region || 'eu');
      return { client, accessToken: pooledKey.token };
    }

    const client = this.blizzardApiService.createClient(
      {
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        region: args.region || 'eu',
      },
      {
        keysRepository: this.keysRepository,
        keyTag: 'blizzard',
      },
    );
    return { client, accessToken: args.accessToken };
  }

  // TODO: Replace with new Blizzard API client implementation
  private async handleRateLimitAndRotate(
    currentAccessToken: string,
    currentClient: any,
  ): Promise<{ client: any; accessToken: string } | null> {
    const rotationResult = await this.blizzardApiService.rotateOnRateLimit(currentAccessToken, {
      tag: 'blizzard',
    });

    if (rotationResult.key && rotationResult.key.token) {
      const bnetClient = currentClient as any;
      if (bnetClient.accessTokenObject) {
        bnetClient.accessTokenObject.access_token = rotationResult.key.token;
      }

      this.currentAccessToken = rotationResult.key.token;
      this.logger.log(
        `${chalk.yellow('🔄')} Rotated to key [${chalk.dim(rotationResult.key.client?.substring(0, 8))}...]`,
      );
      return { client: currentClient, accessToken: rotationResult.key.token };
    }

    this.logger.warn(`${chalk.yellow('⚠')} No alternative key available for rotation`);
    return null;
  }

  private async callWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    const maxRetries = 2;
    const baseDelayMs = 1000;

    try {
      const result = await fn();
      if (this.currentAccessToken) {
        await this.blizzardApiService.recordSuccess(this.currentAccessToken);
      }
      return result;
    } catch (error) {
      const isRateLimit = isAxiosError(error) && error.response?.status === 429;

      if (isRateLimit && attempt < maxRetries && this.currentAccessToken) {
        await this.blizzardApiService.recordRateLimit(this.currentAccessToken);
        const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        this.logger.warn(
          `${chalk.yellow('⚠')} Rate limited, retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const rotationResult = await this.handleRateLimitAndRotate(this.currentAccessToken, this.BNet);
        if (rotationResult) {
          this.BNet = rotationResult.client;
          return this.callWithRetry(fn, attempt + 1);
        }
        throw error;
      }

      if (this.currentAccessToken) {
        const statusCode = isAxiosError(error) ? (error.response?.status ?? 0) : 0;
        await this.blizzardApiService.recordError(this.currentAccessToken, statusCode);
      }
      throw error;
    }
  }
}
