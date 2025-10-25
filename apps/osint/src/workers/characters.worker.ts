import { BlizzAPI } from '@alexzedim/blizzapi';
import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import chalk from 'chalk';
import { coreConfig } from '@app/configuration';
import {
  CHARACTER_SUMMARY_FIELD_MAPPING,
  CharacterJobQueue,
  charactersQueue,
  getRandomProxy,
  toSlug,
} from '@app/resources';

import {
  CharactersEntity,
  KeysEntity,
} from '@app/pg';
import {
  CharacterService,
  CharacterLifecycleService,
  CharacterCollectionService,
} from '../services';

@Processor(charactersQueue.name, charactersQueue.workerOptions)
@Injectable()
export class CharactersWorker extends WorkerHost {
  private readonly logger = new Logger(CharactersWorker.name, {
    timestamp: true,
  });

  private stats = {
    total: 0,
    success: 0,
    rateLimit: 0,
    errors: 0,
    skipped: 0,
    notFound: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    private readonly blizzardApiService: CharacterService,
    private readonly lifecycleService: CharacterLifecycleService,
    private readonly collectionSyncService: CharacterCollectionService,
  ) {
    super();
  }

  public async process(job: Job<CharacterJobQueue, number>): Promise<number> {
    const startTime = Date.now();
    this.stats.total++;
    
    try {
      const { data: args } = job;

      const { characterEntity, isNew, isCreateOnlyUnique, isNotReadyToUpdate } =
        await this.lifecycleService.findOrCreateCharacter(args);

      const shouldSkipUpdate = isNotReadyToUpdate || isCreateOnlyUnique;
      if (shouldSkipUpdate) {
        this.stats.skipped++;
        await job.updateProgress(100);
        this.logger.warn(
          `${chalk.yellow('⊘')} Skipped [${chalk.bold(this.stats.total)}] ${characterEntity.guid} ${chalk.dim('(createOnly or notReady)')}`
        );
        return characterEntity.statusCode;
      }

      const characterEntityOriginal = this.charactersRepository.create(characterEntity);
      const nameSlug = toSlug(characterEntity.name);

      await job.updateProgress(5);

      this.inheritSafeValuesFromArgs(characterEntity, args);

      await job.updateProgress(10);

      this.BNet = await this.initializeApiClient(args);

      const status = await this.blizzardApiService.getStatus(
        nameSlug,
        characterEntity.realm,
        this.BNet,
      );

      const hasStatus = Boolean(status);
      if (hasStatus) Object.assign(characterEntity, status);

      await job.updateProgress(20);

      const isValidCharacter = status.isValid;
      if (isValidCharacter) {
        await this.fetchAndUpdateCharacterData(characterEntity, nameSlug, job);
      }

      await job.updateProgress(50);

      const isExistingCharacter = !isNew;
      if (isExistingCharacter) {
        await this.handleExistingCharacterUpdates(
          characterEntityOriginal,
          characterEntity,
        );
        await job.updateProgress(90);
      }

      await this.charactersRepository.save(characterEntity);
      await job.updateProgress(100);

      const duration = Date.now() - startTime;
      this.logCharacterResult(characterEntity, duration);

      // Progress report every 50 characters
      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }

      return characterEntity.statusCode;
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid = job.data?.name && job.data?.realm ? `${job.data.name}@${job.data.realm}` : 'unknown';
      
      await job.log(errorOrException);
      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`
      );
      return 500;
    }
  }

  private logCharacterResult(character: CharactersEntity, duration: number): void {
    const statusCode = character.statusCode;
    const guid = character.guid;

    if (statusCode === 200 || statusCode === 204) {
      this.stats.success++;
      this.logger.log(
        `${chalk.green('✓')} ${chalk.green(statusCode)} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`
      );
    } else if (statusCode === 404) {
      this.stats.notFound++;
      this.logger.warn(
        `${chalk.blue('ℹ')} ${chalk.blue('404')} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`
      );
    } else if (statusCode === 429) {
      this.stats.rateLimit++;
      this.logger.warn(
        `${chalk.yellow('⚠')} ${chalk.yellow('429')} Rate limited [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`
      );
    } else {
      this.logger.log(
        `${chalk.cyan('ℹ')} ${statusCode} [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)}`
      );
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const rate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
      `${chalk.magenta('📊 PROGRESS REPORT')}\n` +
      `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} characters processed\n` +
      `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
      `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
      `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(this.stats.notFound)}\n` +
      `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
      `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
      `${chalk.dim('  Rate:')} ${chalk.bold(rate)} chars/sec\n` +
      `${chalk.magenta.bold('━'.repeat(60))}`
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
      `${chalk.cyan.bold('  🎯 FINAL SUMMARY')}\n` +
      `${chalk.cyan.bold('═'.repeat(60))}\n` +
      `${chalk.dim('  Total Characters:')} ${chalk.bold.white(this.stats.total)}\n` +
      `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
      `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
      `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(this.stats.notFound)}\n` +
      `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
      `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
      `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
      `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} chars/sec\n` +
      `${chalk.cyan.bold('═'.repeat(60))}`
    );
  }

  private inheritSafeValuesFromArgs(
    characterEntity: CharactersEntity,
    args: CharacterJobQueue,
  ): void {
    for (const key of CHARACTER_SUMMARY_FIELD_MAPPING.keys()) {
      const isInheritKeyValue = args[key] && !characterEntity[key];
      if (isInheritKeyValue) {
        characterEntity[key] = args[key];
      }
    }
  }

  private async initializeApiClient(args: CharacterJobQueue): Promise<BlizzAPI> {
    return new BlizzAPI({
      region: args.region || 'eu',
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken,
      httpsAgent: coreConfig.useProxy
        ? await getRandomProxy(this.keysRepository)
        : undefined,
    });
  }

  private async fetchAndUpdateCharacterData(
    characterEntity: CharactersEntity,
    nameSlug: string,
    job: Job<CharacterJobQueue, number>,
  ): Promise<void> {
    const [summary, petsCollection, mountsCollection, media] =
      await Promise.allSettled([
        this.blizzardApiService.getSummary(nameSlug, characterEntity.realm, this.BNet),
        this.fetchAndSyncPets(nameSlug, characterEntity.realm),
        this.fetchAndSyncMounts(nameSlug, characterEntity.realm),
        this.blizzardApiService.getMedia(nameSlug, characterEntity.realm, this.BNet),
      ]);

    const isSummaryFulfilled = summary.status === 'fulfilled';
    if (isSummaryFulfilled) {
      Object.assign(characterEntity, summary.value);
    }

    const isPetsCollectionFulfilled = petsCollection.status === 'fulfilled';
    if (isPetsCollectionFulfilled) {
      Object.assign(characterEntity, petsCollection.value);
    }

    const isMountsCollectionFulfilled = mountsCollection.status === 'fulfilled';
    if (isMountsCollectionFulfilled) {
      Object.assign(characterEntity, mountsCollection.value);
    }

    const isMediaFulfilled = media.status === 'fulfilled';
    if (isMediaFulfilled) {
      Object.assign(characterEntity, media.value);
    }
  }

  private async fetchAndSyncPets(
    nameSlug: string,
    realmSlug: string,
  ): Promise<Partial<{ petsNumber: number; statusCode: number; hashA: string; hashB: string }>> {
    const petsResponse = await this.blizzardApiService.getPetsCollection(
      nameSlug,
      realmSlug,
      this.BNet,
    );

    const hasPetsResponse = Boolean(petsResponse);
    if (!hasPetsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterPets(
      nameSlug,
      realmSlug,
      petsResponse,
      true,
    );
  }

  private async fetchAndSyncMounts(
    nameSlug: string,
    realmSlug: string,
  ): Promise<Partial<{ mountsNumber: number; statusCode: number }>> {
    const mountsResponse = await this.blizzardApiService.getMountsCollection(
      nameSlug,
      realmSlug,
      this.BNet,
    );

    const hasMountsResponse = Boolean(mountsResponse);
    if (!hasMountsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterMounts(
      nameSlug,
      realmSlug,
      mountsResponse,
      true,
    );
  }

  private async handleExistingCharacterUpdates(
    original: CharactersEntity,
    updated: CharactersEntity,
  ): Promise<void> {
    const hasGuildChanged =
      original.guildGuid !== updated.guildGuid && !updated.guildId;

    if (hasGuildChanged) {
      updated.guildGuid = null;
      updated.guild = null;
      updated.guildRank = null;
      updated.guildId = null;
    }

    await this.lifecycleService.diffAndLogChanges(original, updated);
  }
}
