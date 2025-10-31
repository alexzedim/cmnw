import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import chalk from 'chalk';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';

import {
  getRandomProxy,
  GuildJobQueue,
  guildsQueue,
  GUILD_WORKER_CONSTANTS,
  isEuRegion,
  toSlug,
} from '@app/resources';
import { KeysEntity } from '@app/pg';
import { coreConfig } from '@app/configuration';

import {
  GuildService,
  GuildSummaryService,
  GuildRosterService,
  GuildMemberService,
  GuildLogService,
  GuildMasterService,
} from '../services';

@Processor(guildsQueue.name, guildsQueue.workerOptions)
@Injectable()
export class GuildsWorker extends WorkerHost {
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
  ) {
    super();
  }

  public async process(job: Job<GuildJobQueue, number>): Promise<number> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = job;

      // Step 1: Find or create guild entity
      const { guildEntity, isNew, isNotReadyToUpdate, isCreateOnlyUnique } =
        await this.guildService.findOrCreate(args);

      if (isNotReadyToUpdate) {
        this.stats.skipped++;
        await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${guildEntity.guid} ${chalk.dim('(not ready)')}`,
        );
        return guildEntity.statusCode;
      }

      if (isCreateOnlyUnique) {
        this.stats.skipped++;
        await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${guildEntity.guid} ${chalk.dim('(createOnly)')}`,
        );
        return guildEntity.statusCode;
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
        await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);
        return GUILD_WORKER_CONSTANTS.NOT_EU_REGION_STATUS_CODE;
      }

      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.INITIAL);

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
      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_AUTH);

      // Step 5: Fetch guild summary from API
      const summary = await this.guildSummaryService.getSummary(
        nameSlug,
        guildEntity.realm,
        this.BNet,
      );
      Object.assign(guildEntity, summary);
      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_SUMMARY);

      // Step 6: Fetch and process guild roster
      const roster = await this.guildRosterService.fetchRoster(
        guildEntity,
        this.BNet,
      );
      roster.updatedAt = guildEntity.updatedAt;
      await this.guildMemberService.updateRoster(guildSnapshot, roster, isNew);
      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_ROSTER);

      // Step 7: Detect and log changes
      if (isNew) {
        const guildById = await this.guildService.findById(
          guildSnapshot.id,
          guildSnapshot.realm,
        );
        if (guildById) {
          await this.guildLogService.detectAndLogChanges(
            guildById,
            guildEntity,
          );
          await this.guildMasterService.detectAndLogGuildMasterChange(
            guildById,
            roster,
          );
        }
      } else {
        await this.guildLogService.detectAndLogChanges(
          guildSnapshot,
          guildEntity,
        );
        await this.guildMasterService.detectAndLogGuildMasterChange(
          guildSnapshot,
          roster,
        );
      }

      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_DIFF);

      // Step 8: Save guild entity
      await this.guildService.save(guildEntity);

      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);

      const duration = Date.now() - startTime;
      this.logGuildResult(guildEntity, duration);

      // Progress report every 25 guilds
      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }

      return guildEntity.statusCode;
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid =
        job.data?.name && job.data?.realm
          ? `${job.data.name}@${job.data.realm}`
          : 'unknown';

      await job.log(errorOrException);
      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`,
      );

      return GUILD_WORKER_CONSTANTS.ERROR_STATUS_CODE;
    }
  }

  private logGuildResult(guild: any, duration: number): void {
    const statusCode = guild.statusCode;
    const guid = guild.guid;

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
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(
      1,
    );

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
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(
      1,
    );

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
