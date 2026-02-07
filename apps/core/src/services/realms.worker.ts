import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getRandomProxy, RealmsMessageDto, realmsQueue } from '@app/resources';
import { KeysEntity } from '@app/pg';
import { coreConfig } from '@app/configuration';

import { RealmsService } from '.';

@Injectable()
@Processor(realmsQueue)
export class RealmsWorker extends WorkerHost {
  private readonly logger = new Logger(RealmsWorker.name, {
    timestamp: true,
  });

  private stats = {
    total: 0,
    success: 0,
    rateLimit: 0,
    errors: 0,
    skipped: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly realmsService: RealmsService,
  ) {
    super();
  }

  async process(job: any): Promise<void> {
    const message: RealmsMessageDto = job.data;
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = message;

      // Step 1: Find or create realm entity
      const { realmEntity, isNew } = await this.realmsService.findOrCreate(args);

      if (!isNew) {
        this.stats.skipped++;
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${realmEntity.guid} ${chalk.dim('(not new)')}`,
        );
        return;
      }

      // Step 2: Initialize Blizzard API client
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
        realmEntity.updatedBy = args.updatedBy;
      }

      // Step 3: Fetch realm data from API
      const realmData = await this.realmsService.fetchRealm(
        args.realmSlug,
        this.BNet,
      );

      Object.assign(realmEntity, realmData);

      // Step 4: Save realm entity
      await this.realmsService.save(realmEntity);

      this.stats.success++;
      const duration = Date.now() - startTime;
      this.logger.log(
        `${chalk.green('✓')} [${chalk.bold(this.stats.total)}] ${realmEntity.guid} ${chalk.dim(`(${duration}ms)`)}`,
      );

      // Progress report every 25 realms
      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid = message.data?.realmSlug || 'unknown';

      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`,
      );

      throw errorOrException;
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const rate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 REALMS PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} realms processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Rate:')} ${chalk.bold(rate)} realms/sec\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.cyan.bold('  🎯 REALMS FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Realms:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} realms/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
  }
}
