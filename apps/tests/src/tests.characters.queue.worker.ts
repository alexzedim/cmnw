import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  getRandomProxy,
  CharacterMessageDto,
  charactersQueue,
} from '@app/resources';
import { KeysEntity } from '@app/pg';
import { coreConfig } from '@app/configuration';

import {
  CharacterService,
  CharacterLifecycleService,
  CharacterCollectionService,
} from '../services';

@Injectable()
@Processor(charactersQueue)
export class TestsCharactersQueueWorker extends WorkerHost {
  private readonly logger = new Logger(TestsCharactersQueueWorker.name, {
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

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly characterService: CharacterService,
    private readonly lifecycleService: CharacterLifecycleService,
    private readonly collectionSyncService: CharacterCollectionService,
  ) {
    super();
  }

  async process(job: any): Promise<void> {
    const message: CharacterMessageDto = job.data;
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = message;

      // Step 1: Find or create character entity
      const { characterEntity, isNew } =
        await this.characterService.findOrCreate(args);

      if (!isNew) {
        this.stats.skipped++;
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${characterEntity.guid} ${chalk.dim('(not new)')}`,
        );
        return;
      }

      // Step 2: Initialize Blizzard API client
      const BNet = new BlizzAPI({
        region: args.region || 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        httpsAgent: coreConfig.useProxy
          ? await getRandomProxy(this.keysRepository)
          : undefined,
      });

      if (args.updatedBy) {
        characterEntity.updatedBy = args.updatedBy;
      }

      // Step 3: Fetch character summary from API
      const summary = await this.characterService.getSummary(
        args.nameSlug,
        args.realm,
        BNet,
      );

      Object.assign(characterEntity, summary);

      // Step 4: Fetch and process character media
      const media = await this.characterService.getMedia(
        args.nameSlug,
        args.realm,
        BNet,
      );

      Object.assign(characterEntity, media);

      // Step 5: Fetch and process character pets
      const pets = await this.characterService.getPets(
        args.nameSlug,
        args.realm,
        BNet,
      );

      Object.assign(characterEntity, pets);

      // Step 6: Sync character collections
      await this.collectionSyncService.syncCollections(characterEntity, BNet);

      // Step 7: Update character lifecycle
      await this.lifecycleService.updateLifecycle(characterEntity);

      // Step 8: Save character entity
      await this.characterService.save(characterEntity);

      this.stats.success++;
      const duration = Date.now() - startTime;
      this.logger.log(
        `${chalk.green('✓')} [${chalk.bold(this.stats.total)}] ${characterEntity.guid} ${chalk.dim(`(${duration}ms)`)}`,
      );

      // Progress report every 25 characters
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
        `${chalk.magenta('📊 CHARACTERS QUEUE TEST PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} characters processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Rate:')} ${chalk.bold(rate)} characters/sec\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.cyan.bold('  🎯 CHARACTERS QUEUE TEST FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Characters:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} characters/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
  }
}
