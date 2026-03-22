import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { isAxiosError } from 'axios';
import chalk from 'chalk';
import { BattleNetClient, BattleNetService, BattleNetRegion } from '@app/battle-net';
import {
  CHARACTER_SUMMARY_FIELD_MAPPING,
  charactersQueue,
  toSlug,
  ICharacterMessageBase,
  setStatusString,
  CharacterStatusState,
  RateLimitError,
  CircuitBreaker,
  CircuitState,
  CHARACTER_STATUS_CODES,
  KEY_STATUS,
} from '@app/resources';
import {
  formatWorkerLog,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
  WorkerStats,
} from '@app/logger';

import { CharactersEntity, KeysEntity } from '@app/pg';
import { CharacterService, CharacterLifecycleService, CharacterCollectionService } from '../services';

interface PetsFetchResult {
  petsNumber?: number;
  statusCode?: number;
  hashA?: string;
  hashB?: string;
}

interface MountsFetchResult {
  mountsNumber?: number;
  statusCode?: number;
}

interface ProfessionsFetchResult {
  professions?: string[];
}

@Injectable()
@Processor(charactersQueue.name, charactersQueue.workerOptions)
export class CharactersWorker extends WorkerHost {
  private readonly logger = new Logger(CharactersWorker.name, {
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

  private client: BattleNetClient;
  private currentAccessToken: string | null = null;

  private readonly circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    halfOpenMaxCalls: 1,
  });

  constructor(
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly characterService: CharacterService,
    private readonly lifecycleService: CharacterLifecycleService,
    private readonly collectionSyncService: CharacterCollectionService,
    private readonly battleNetService: BattleNetService,
  ) {
    super();
    this.client = new BattleNetClient();
  }

  async process(job: Job<ICharacterMessageBase>): Promise<CharactersEntity> {
    const message = job.data;
    const startTime = Date.now();
    this.stats.total++;

    if (!this.circuitBreaker.canExecute()) {
      const state = this.circuitBreaker.getState();
      this.logger.warn(
        formatWorkerLog(WorkerLogStatus.RATE_LIMITED, this.stats.total, job.id, 0, `Circuit breaker is ${state}`),
      );
      throw new Error(`Circuit breaker ${state}`);
    }

    if (this.circuitBreaker.getState() === CircuitState.HALF_OPEN) {
      this.circuitBreaker.recordHalfOpenCall();
    }

    await job.updateProgress(10);

    try {
      const { characterEntity, isNew, isCreateOnlyUnique, isNotReadyToUpdate } =
        await this.lifecycleService.findOrCreateCharacter(message);

      await job.updateProgress(30);

      const shouldSkipUpdate = isNotReadyToUpdate || isCreateOnlyUnique;
      if (shouldSkipUpdate) {
        this.stats.skipped++;
        const duration = Date.now() - startTime;
        this.logger.warn(
          formatWorkerLog(
            WorkerLogStatus.SKIPPED,
            this.stats.total,
            characterEntity.guid,
            duration,
            'createOnly or notReady',
          ),
        );
        return characterEntity;
      }

      const characterEntityOriginal = this.charactersRepository.create(characterEntity);
      const nameSlug = toSlug(characterEntity.name);

      this.inheritSafeValuesFromArgs(characterEntity, message);

      await this.initializeApiClient(message);

      const status = await this.characterService.getStatus(this.client, nameSlug, characterEntity.realm);

      if (this.currentAccessToken) {
        await this.recordSuccess(this.currentAccessToken);
      }

      const hasStatus = Boolean(status);
      if (hasStatus) Object.assign(characterEntity, status);

      const isValidCharacter = status.isValid;

      if (isValidCharacter) {
        await job.updateProgress(50);
        await this.fetchAndUpdateCharacterData(characterEntity, nameSlug);
        await job.updateProgress(70);
      }

      const isExistingCharacter = !isNew;
      if (isExistingCharacter) {
        await this.handleExistingCharacterUpdates(characterEntityOriginal, characterEntity);
      }

      await job.updateProgress(90);
      await this.charactersRepository.save(characterEntity);

      const duration = Date.now() - startTime;
      this.logCharacterResult(characterEntity, duration);

      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }

      this.circuitBreaker.recordSuccess();

      await job.updateProgress(100);

      return characterEntity;
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${message.name}@${message.realm}` : 'unknown';
      const updatedBy = message.updatedBy || 'unknown';

      if (errorOrException instanceof RateLimitError) {
        this.circuitBreaker.recordFailure();
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
        await this.recordError(this.currentAccessToken, statusCode);
      }

      this.stats.errors++;
      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, duration, errorOrException.message, updatedBy));

      throw errorOrException;
    }
  }

  private processEndpointResult<T extends object>(
    result: PromiseSettledResult<T>,
    characterEntity: CharactersEntity,
    currentStatus: string,
    endpoint: keyof typeof CHARACTER_STATUS_CODES,
  ): string {
    const isFulfilled = result.status === 'fulfilled';

    if (isFulfilled && result.value) {
      Object.assign(characterEntity, result.value);
    }

    return setStatusString(
      currentStatus,
      endpoint,
      isFulfilled ? CharacterStatusState.SUCCESS : CharacterStatusState.ERROR,
    );
  }

  private logCharacterResult(character: CharactersEntity, duration: number): void {
    const status = character.status || '------';
    const guid = character.guid;
    const isAllSuccess = status === 'SU-MPVR';
    const hasAnyError = /[a-z]/.test(status);

    if (isAllSuccess) {
      this.stats.success++;
      this.logger.log(formatWorkerLog(WorkerLogStatus.SUCCESS, this.stats.total, guid, duration, status));
    } else if (hasAnyError) {
      this.logger.warn(formatWorkerLog(WorkerLogStatus.PARTIAL, this.stats.total, guid, duration, status));
    } else {
      this.logger.log(formatWorkerLog(WorkerLogStatus.INFO, this.stats.total, guid, duration, status));
    }
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('CharactersWorker', this.stats, 'characters'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('CharactersWorker', this.stats, 'characters'));
  }

  private inheritSafeValuesFromArgs(characterEntity: CharactersEntity, args: ICharacterMessageBase): void {
    for (const key of CHARACTER_SUMMARY_FIELD_MAPPING.keys()) {
      const isInheritKeyValue = args[key] && !characterEntity[key];
      if (isInheritKeyValue) {
        characterEntity[key] = args[key];
      }
    }
  }

  private async getNextKey(tag: string = 'blizzard'): Promise<KeysEntity | null> {
    try {
      const query = this.keysRepository.createQueryBuilder('key');
      query.where('key.status = :status', { status: KEY_STATUS.ACTIVE });
      query.andWhere('(key.cooldown_until IS NULL OR key.cooldown_until < :now)', {
        now: new Date(),
      });
      query.orderBy('key.priority', 'ASC');
      query.addOrderBy('key.last_request_at', 'ASC', 'NULLS FIRST');
      query.limit(1);

      const key = await query.getOne();
      return key;
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to get next key: ${(error as Error).message}`);
      return null;
    }
  }

  private async initializeApiClient(args: ICharacterMessageBase): Promise<void> {
    const pooledKey = await this.getNextKey('blizzard');

    if (pooledKey && pooledKey.token) {
      const region = (args.region || 'eu') as BattleNetRegion;
      this.client = new BattleNetClient({
        clientId: pooledKey.client,
        clientSecret: pooledKey.secret,
        accessToken: pooledKey.token,
        region,
      });
      this.currentAccessToken = pooledKey.token;
      return;
    }

    const region = (args.region || 'eu') as BattleNetRegion;
    this.client = new BattleNetClient({
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken,
      region,
    });
    this.currentAccessToken = args.accessToken;
  }

  private async recordSuccess(accessToken: string): Promise<void> {
    try {
      const key = await this.keysRepository.findOne({ where: { token: accessToken } });
      if (!key) return;

      key.requestCount += 1;
      key.successCount += 1;
      key.consecutiveErrors = 0;
      key.lastSuccessAt = new Date();
      key.lastRequestAt = new Date();

      if (key.status === KEY_STATUS.RATE_LIMITED) {
        key.status = KEY_STATUS.ACTIVE;
        key.cooldownUntil = null;
      }

      await this.keysRepository.save(key);
    } catch (error) {
      this.logger.debug(`Failed to record success: ${(error as Error).message}`);
    }
  }

  private async recordError(accessToken: string, statusCode: number): Promise<void> {
    try {
      const key = await this.keysRepository.findOne({ where: { token: accessToken } });
      if (!key) return;

      key.requestCount += 1;
      key.errorCount += 1;
      key.consecutiveErrors += 1;
      key.lastErrorAt = new Date();
      key.lastRequestAt = new Date();

      if (key.consecutiveErrors >= 10) {
        key.status = KEY_STATUS.DISABLED;
      }

      await this.keysRepository.save(key);
    } catch (error) {
      this.logger.debug(`Failed to record error: ${(error as Error).message}`);
    }
  }

  private async recordRateLimit(accessToken: string): Promise<void> {
    try {
      const key = await this.keysRepository.findOne({ where: { token: accessToken } });
      if (!key) return;

      const cooldownUntil = new Date(Date.now() + 5 * 60 * 1000);

      key.requestCount += 1;
      key.rateLimitCount += 1;
      key.consecutiveErrors += 1;
      key.lastRateLimitAt = new Date();
      key.lastRequestAt = new Date();
      key.status = KEY_STATUS.RATE_LIMITED;
      key.cooldownUntil = cooldownUntil;

      await this.keysRepository.save(key);
    } catch (error) {
      this.logger.debug(`Failed to record rate limit: ${(error as Error).message}`);
    }
  }

  private async handleRateLimitAndRotate(): Promise<boolean> {
    if (!this.currentAccessToken) return false;

    await this.recordRateLimit(this.currentAccessToken);

    const nextKey = await this.getNextKey('blizzard');

    if (nextKey && nextKey.token && nextKey.token !== this.currentAccessToken) {
      const region = (nextKey.tags?.includes('us') ? 'us' : 'eu') as BattleNetRegion;
      this.client = new BattleNetClient({
        clientId: nextKey.client,
        clientSecret: nextKey.secret,
        accessToken: nextKey.token,
        region,
      });

      this.logger.log(
        `${chalk.yellow('🔄')} Rotated to key [${chalk.dim(nextKey.client?.substring(0, 8))}...]`,
      );
      return true;
    }

    this.logger.warn(`${chalk.yellow('⚠')} No alternative key available for rotation`);
    return false;
  }

  private async fetchAndUpdateCharacterData(characterEntity: CharactersEntity, nameSlug: string): Promise<void> {
    let status = characterEntity.status || '------';

    const tasks = [
      {
        name: 'summary',
        fn: () => this.callWithRetry(() => this.characterService.getSummary(this.client, nameSlug, characterEntity.realm)),
      },
      {
        name: 'pets',
        fn: () => this.callWithRetry(() => this.fetchAndSyncPets(nameSlug, characterEntity.realm)),
      },
      {
        name: 'mounts',
        fn: () => this.callWithRetry(() => this.fetchAndSyncMounts(nameSlug, characterEntity.realm)),
      },
      {
        name: 'media',
        fn: () => this.callWithRetry(() => this.characterService.getMedia(this.client, nameSlug, characterEntity.realm)),
      },
      {
        name: 'professions',
        fn: () => this.callWithRetry(() => this.fetchAndSyncProfessions(nameSlug, characterEntity.realm)),
      },
    ];

    const results = await lastValueFrom(
      from(tasks).pipe(
        mergeMap(async (task) => {
          try {
            const value = await task.fn();
            return { status: 'fulfilled' as const, value, name: task.name };
          } catch (error) {
            return { status: 'rejected' as const, reason: error, name: task.name };
          }
        }, 2),
        toArray(),
      ),
    );

    for (const result of results) {
      const endpoint = result.name.toUpperCase() as keyof typeof CHARACTER_STATUS_CODES;
      if (result.status === 'fulfilled') {
        status = this.processEndpointResult(
          { status: 'fulfilled', value: result.value as object } as PromiseSettledResult<object>,
          characterEntity,
          status,
          endpoint,
        );
      } else {
        status = this.processEndpointResult(
          { status: 'rejected', reason: result.reason } as PromiseSettledResult<object>,
          characterEntity,
          status,
          endpoint,
        );
      }
    }

    characterEntity.status = status;
  }

  private async callWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    const maxRetries = 2;
    const baseDelayMs = 1000;

    try {
      const result = await fn();
      if (this.currentAccessToken) {
        await this.recordSuccess(this.currentAccessToken);
      }
      return result;
    } catch (error) {
      const isRateLimit = isAxiosError(error) && error.response?.status === 429;

      if (isRateLimit && attempt < maxRetries && this.currentAccessToken) {
        await this.recordRateLimit(this.currentAccessToken);
        const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        this.logger.warn(
          `${chalk.yellow('⚠')} Rate limited, retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const rotated = await this.handleRateLimitAndRotate();
        if (rotated) {
          return this.callWithRetry(fn, attempt + 1);
        }
        throw error;
      }

      if (this.currentAccessToken) {
        const statusCode = isAxiosError(error) ? (error.response?.status ?? 0) : 0;
        await this.recordError(this.currentAccessToken, statusCode);
      }
      throw error;
    }
  }

  private async fetchAndSyncPets(nameSlug: string, realmSlug: string): Promise<PetsFetchResult> {
    const petsResponse = await this.characterService.getPetsCollection(this.client, nameSlug, realmSlug);

    const hasPetsResponse = Boolean(petsResponse);
    if (!hasPetsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterPets(nameSlug, realmSlug, petsResponse, true);
  }

  private async fetchAndSyncMounts(nameSlug: string, realmSlug: string): Promise<MountsFetchResult> {
    const mountsResponse = await this.characterService.getMountsCollection(this.client, nameSlug, realmSlug);

    const hasMountsResponse = Boolean(mountsResponse);
    if (!hasMountsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterMounts(nameSlug, realmSlug, mountsResponse, true);
  }

  private async fetchAndSyncProfessions(nameSlug: string, realmSlug: string): Promise<ProfessionsFetchResult> {
    const professionsResponse = await this.characterService.getProfessions(this.client, nameSlug, realmSlug);

    const hasProfessionResponse = Boolean(professionsResponse);
    if (!hasProfessionResponse) {
      return {};
    }

    const professions = await this.collectionSyncService.syncCharacterProfessions(
      nameSlug,
      realmSlug,
      professionsResponse,
    );

    return { professions };
  }

  private async handleExistingCharacterUpdates(original: CharactersEntity, updated: CharactersEntity): Promise<void> {
    const hasGuildChanged = original.guildGuid !== updated.guildGuid && !updated.guildId;

    if (hasGuildChanged) {
      updated.guildGuid = null;
      updated.guild = null;
      updated.guildRank = null;
      updated.guildId = null;
    }

    await this.lifecycleService.diffAndLogChanges(original, updated);
  }
}
