import { osintConfig } from '@app/configuration';
import { KEY_LOCK, WCL_HISTORY_LOCK_KEY } from '@app/resources';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import chalk from 'chalk';
import type Redis from 'ioredis';
import { WclDiscoveryService, WclParseService, WclRosterService } from './services';

@Injectable()
export class WarcraftLogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarcraftLogsService.name, { timestamp: true });

  private stats = {
    logsDiscovered: 0,
    logsDownloaded: 0,
    logsParsed: 0,
    charactersQueued: 0,
    errors: 0,
    startTime: Date.now(),
  };

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    private readonly discoveryService: WclDiscoveryService,
    private readonly rosterService: WclRosterService,
    private readonly parseService: WclParseService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sweepDiscovery();
    await this.indexRosters();
  }

  /**
   * Rotating freshness sweep over realm report pages via the stealth browser.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweepDiscovery(): Promise<void> {
    const lockKey = KEY_LOCK.WARCRAFT_LOGS;
    try {
      const isLocked = Boolean(await this.redisService.exists(lockKey));
      if (isLocked) {
        this.logger.warn(chalk.yellow('⚠ sweepDiscovery is already running'));
        return;
      }
      await this.redisService.set(lockKey, '1', 'EX', 60 * 25);

      const result = await this.discoveryService.sweepFreshness(osintConfig.wclDiscoveryRealmsPerRun);
      this.stats.logsDiscovered += result.discovered;
      if (result.isBlocked) this.stats.errors += 1;

      this.logger.log(
        chalk.green(
          `✓ Discovery sweep ${chalk.dim(`| ${result.realms} realms | +${result.discovered} logs${result.isBlocked ? ' | ⚠ channel blocked' : ''}`)}`,
        ),
      );
    } catch (errorOrException) {
      this.stats.errors += 1;
      this.logger.error({
        logTag: 'sweepDiscovery',
        errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  /**
   * Full-history deep pagination, budgeted per run and resumable via the
   * Redis page cursor. Disabled unless OSINT_WCL_HISTORY_ENABLED=true.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweepHistory(): Promise<void> {
    if (!osintConfig.wclHistoryEnabled) return;
    try {
      const isLocked = Boolean(await this.redisService.exists(WCL_HISTORY_LOCK_KEY));
      if (isLocked) return;
      await this.redisService.set(WCL_HISTORY_LOCK_KEY, '1', 'EX', 60 * 25);

      const result = await this.discoveryService.sweepHistory(osintConfig.wclHistoryPagesPerRun);
      this.stats.logsDiscovered += result.discovered;
      this.logger.log(
        chalk.green(
          `✓ History sweep ${chalk.dim(`| +${result.discovered} logs${result.isBlocked ? ' | ⚠ channel blocked' : ''}`)}`,
        ),
      );
    } catch (errorOrException) {
      this.stats.errors += 1;
      this.logger.error({
        logTag: 'sweepHistory',
        errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
    } finally {
      await this.redisService.del(WCL_HISTORY_LOCK_KEY);
    }
  }

  /**
   * Downloads raw payloads for pending logs (browser primary, GraphQL
   * safe-switch), then parses stored payloads into the characters queue.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async indexRosters(): Promise<void> {
    try {
      const download = await this.rosterService.downloadBatch();
      this.stats.logsDownloaded += download.downloaded;
      this.stats.errors += download.failed;

      const parse = await this.parseService.parseBatch();
      this.stats.logsParsed += parse.parsed;
      this.stats.charactersQueued += parse.queued;
      this.stats.errors += parse.failed;

      this.logProgress();
    } catch (errorOrException) {
      this.stats.errors += 1;
      this.logger.error({
        logTag: 'indexRosters',
        errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 WCL SERVICE PROGRESS')}\n` +
        `${chalk.cyan('  🔍 Logs Discovered:')} ${chalk.cyan.bold(this.stats.logsDiscovered)}\n` +
        `${chalk.cyan('  ⬇ Logs Downloaded:')} ${chalk.cyan.bold(this.stats.logsDownloaded)}\n` +
        `${chalk.green('  ✓ Logs Parsed:')} ${chalk.green.bold(this.stats.logsParsed)}\n` +
        `${chalk.cyan('  → Characters Queued:')} ${chalk.cyan.bold(this.stats.charactersQueued)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Uptime:')} ${chalk.bold(`${hours}h ${minutes}m`)}\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }
}
