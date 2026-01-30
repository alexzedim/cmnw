import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  getRandomProxy,
  isEuRegion,
  toSlug,
  GuildMessageDto,
  hasAnyGuildErrorInString,
  isAllGuildSuccessInString,
  setGuildStatusString,
  GuildStatusState,
} from '@app/resources';
import { KeysEntity } from '@app/pg';
import { coreConfig } from '@app/configuration';
import { RabbitMQMonitorService } from '@app/rabbitmq';

import {
  GuildService,
  GuildSummaryService,
  GuildRosterService,
  GuildMemberService,
  GuildLogService,
  GuildMasterService,
} from '../services';

@Injectable()
export class GuildsWorker {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private stats = {
    total: 0,
    success: 0,
    rateLimit: 0,
    errors: 0,
    skipped: 0,
    notFound: 0,
    notEuRegion: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly guildService: GuildService,
    private readonly guildSummaryService: GuildSummaryService,
    private readonly guildRosterService: GuildRosterService,
    private readonly guildMemberService: GuildMemberService,
    private readonly guildLogService: GuildLogService,
    private readonly guildMasterService: GuildMasterService,
    private readonly rabbitMQMonitorService: RabbitMQMonitorService,
  ) {}

  @RabbitSubscribe({
    exchange: 'osint.exchange',
    routingKey: 'osint.guilds.*',
    queue: 'osint.guilds',
    queueOptions: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.guilds',
      },
    },
  })
  public async handleGuildMessage(message: GuildMessageDto): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = message;

      // Step 1: Find or create guild entity
      const { guildEntity, isNew, isNotReadyToUpdate, isCreateOnlyUnique } =
        await this.guildService.findOrCreate(args);

      if (isNotReadyToUpdate) {
        this.stats.skipped++;
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${guildEntity.guid} ${chalk.dim('(not ready)')}`,
        );
        return;
      }

      if (isCreateOnlyUnique) {
        this.stats.skipped++;
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${guildEntity.guid} ${chalk.dim('(createOnly)')}`,
        );
        return;
      }

      // Step 2: Create snapshot for comparison
      const guildSnapshot = this.guildService.createSnapshot(guildEntity);
      const nameSlug = toSlug(guildEntity.name);

      // Step 3: Check region
      const isNotEuRegion = !isEuRegion(args.region);
      if (isNotEuRegion) {
        this.stats.notEuRegion++;
        this.logger.warn(
          `${chalk.cyan('ℹ')} Not EU region [${chalk.bold(this.stats.total)}] ${guildEntity.guid}`,
        );
        return;
      }

      // Step 4: Initialize Blizzard API client
      this.BNet = new BlizzAPI({
        region: args.region || 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        httpsAgent: coreConfig.useProxy
          ? await getRandomProxy(this.keysRepository)
          : undefined,
      });

      if (args.updatedBy) {
        guildEntity.updatedBy = args.updatedBy;
      }

      // Step 5: Fetch guild summary from API
      const summary = await this.guildSummaryService.getSummary(
        nameSlug,
        guildEntity.realm,
        this.BNet,
      );

      Object.assign(guildEntity, summary);

      // Step 6: Fetch and process guild roster
      const roster = await this.guildRosterService.fetchRoster(
        guildEntity,
        this.BNet,
      );
      roster.updatedAt = guildEntity.updatedAt;
      await this.guildMemberService.updateRoster(guildSnapshot, roster, isNew);

      // Step 7: Detect and log changes
      let logStatus = '-----';
      let masterStatus = '-----';

      if (isNew) {
        const guildById = await this.guildService.findById(
          guildSnapshot.id,
          guildSnapshot.realm,
        );
        if (guildById) {
          logStatus = await this.guildLogService.detectAndLogChanges(guildById, guildEntity);
          masterStatus = await this.guildMasterService.detectAndLogGuildMasterChange(
            guildById,
            roster,
          );
        }
      } else {
        logStatus = await this.guildLogService.detectAndLogChanges(guildSnapshot, guildEntity);
        masterStatus = await this.guildMasterService.detectAndLogGuildMasterChange(
          guildSnapshot,
          roster,
        );
      }

      // Step 8: Aggregate status strings from all operations
      const operationStatuses = {
        roster: roster.status,
        logs: logStatus,
        master: masterStatus,
      };

      guildEntity.status = this.aggregateGuildStatus(guildEntity.status, operationStatuses);

      const hasErrors = hasAnyGuildErrorInString(guildEntity.status);
      const isSuccess = isAllGuildSuccessInString(guildEntity.status);

      if (!hasErrors && isSuccess) {
        this.stats.success++;
      }

      // Step 9: Save guild entity
      await this.guildService.save(guildEntity);

      const duration = Date.now() - startTime;
      this.logGuildResult(guildEntity, duration);

      this.rabbitMQMonitorService.recordMessageProcessingDuration(
        'osint.guilds',
        duration / 1000,
        'success',
      );
      await this.rabbitMQMonitorService.emitMessageCompleted(
        'osint.guilds',
        message,
      );

      // Progress report every 25 guilds
      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid =
        message.data?.name && message.data?.realm
          ? `${message.data.name}@${message.data.realm}`
          : 'unknown';
      const updatedBy = message.data?.updatedBy || 'unknown';

      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)} [${chalk.bold(updatedBy)}] - ${errorOrException.message}`,
      );

      this.rabbitMQMonitorService.recordMessageProcessingDuration(
        'osint.guilds',
        duration / 1000,
        'failure',
      );
      await this.rabbitMQMonitorService.emitMessageFailed(
        'osint.guilds',
        message,
        errorOrException,
      );

      throw errorOrException;
    }
  }

  /**
   * Aggregate status strings from all guild operations
   * @param currentStatus - Current guild status
   * @param operationStatuses - Map of operation names to their status strings
   * @returns Aggregated status string
   */
  private aggregateGuildStatus(
    currentStatus: string,
    operationStatuses: Record<string, string | undefined>,
  ): string {
    let aggregated = currentStatus || '-----';

    // Define operations in order with their status strings
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
      // Check if the error indicator exists in the status string (lowercase = error)
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

    // Use status if available for more detailed logging
    if (status) {
      const hasErrors = hasAnyGuildErrorInString(status);
      const isSuccess = isAllGuildSuccessInString(status);

      if (isSuccess) {
        this.logger.log(
          `${chalk.green('✓')} ${chalk.green('SUCCESS')} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${status})`)} ${chalk.dim(`(${duration}ms)`)}`,
        );
      } else if (hasErrors) {
        this.logger.warn(
          `${chalk.yellow('⚠')} ${chalk.yellow('PARTIAL')} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${status})`)} ${chalk.dim(`(${duration}ms)`)}`,
        );
      } else {
        this.logger.log(
          `${chalk.cyan('ℹ')} ${chalk.cyan('PENDING')} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${status})`)} ${chalk.dim(`(${duration}ms)`)}`,
        );
      }
      return;
    }

    // Fallback to statusCode-based logging
    if (statusCode === 200 || statusCode === 204) {
      this.stats.success++;
      this.logger.log(
        `${chalk.green('✓')} ${chalk.green(statusCode)} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`,
      );
    } else if (statusCode === 404) {
      this.stats.notFound++;
      this.logger.warn(
        `${chalk.blue('ℹ')} ${chalk.blue('404')} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`,
      );
    } else if (statusCode === 429) {
      this.stats.rateLimit++;
      this.logger.warn(
        `${chalk.yellow('⚠')} ${chalk.yellow('429')} Rate limited [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`,
      );
    } else {
      this.logger.log(
        `${chalk.cyan('ℹ')} ${statusCode} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`,
      );
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const rate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 GUILDS PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} guilds processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(this.stats.notFound)}\n` +
        `${chalk.cyan('  ℹ Not EU Region:')} ${chalk.cyan.bold(this.stats.notEuRegion)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Rate:')} ${chalk.bold(rate)} guilds/sec\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.cyan.bold('  🎯 GUILDS FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Guilds:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(this.stats.notFound)}\n` +
        `${chalk.cyan('  ℹ Not EU Region:')} ${chalk.cyan.bold(this.stats.notEuRegion)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} guilds/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
  }
}
