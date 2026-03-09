import { BlizzAPI } from '@alexzedim/blizzapi';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BlizzardApiService,
  CHARACTER_SUMMARY_FIELD_MAPPING,
  charactersQueue,
  toSlug,
  ICharacterMessageBase,
  setStatusString,
  CharacterStatusState,
  RateLimitError,
  limitConcurrency,
  CircuitBreaker,
  CircuitState,
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

  private BNet: BlizzAPI;

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
    private readonly blizzardApiService: BlizzardApiService,
  ) {
    super();
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

    try {
      const { characterEntity, isNew, isCreateOnlyUnique, isNotReadyToUpdate } =
        await this.lifecycleService.findOrCreateCharacter(message);

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

      this.BNet = await this.initializeApiClient(message);

      const status = await this.characterService.getStatus(nameSlug, characterEntity.realm, this.BNet);

      const hasStatus = Boolean(status);
      if (hasStatus) Object.assign(characterEntity, status);

      const isValidCharacter = status.isValid;

      if (isValidCharacter) {
        await this.fetchAndUpdateCharacterData(characterEntity, nameSlug);
      }

      const isExistingCharacter = !isNew;
      if (isExistingCharacter) {
        await this.handleExistingCharacterUpdates(characterEntityOriginal, characterEntity);
      }

      await this.charactersRepository.save(characterEntity);

      const duration = Date.now() - startTime;
      this.logCharacterResult(characterEntity, duration);

      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }

      this.circuitBreaker.recordSuccess();

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

      this.stats.errors++;
      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, duration, errorOrException.message, updatedBy));

      throw errorOrException;
    }
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

  private async initializeApiClient(args: ICharacterMessageBase): Promise<BlizzAPI> {
    return this.blizzardApiService.createClient(
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
  }

  private async fetchAndUpdateCharacterData(characterEntity: CharactersEntity, nameSlug: string): Promise<void> {
    let status = characterEntity.status || '------';

    const tasks = [
      () => this.characterService.getSummary(nameSlug, characterEntity.realm, this.BNet),
      () => this.fetchAndSyncPets(nameSlug, characterEntity.realm),
      () => this.fetchAndSyncMounts(nameSlug, characterEntity.realm),
      () => this.characterService.getMedia(nameSlug, characterEntity.realm, this.BNet),
      () => this.fetchAndSyncProfessions(nameSlug, characterEntity.realm),
    ];

    const [summary, petsCollection, mountsCollection, media, professions] = await limitConcurrency(tasks, 2);

    // Process each result and update status
    const isSummaryFulfilled = summary.status === 'fulfilled';
    if (isSummaryFulfilled) {
      Object.assign(characterEntity, summary.value);
      status = setStatusString(status, 'SUMMARY', CharacterStatusState.SUCCESS);
    } else {
      status = setStatusString(status, 'SUMMARY', CharacterStatusState.ERROR);
    }

    const isPetsCollectionFulfilled = petsCollection.status === 'fulfilled';
    if (isPetsCollectionFulfilled) {
      Object.assign(characterEntity, petsCollection.value);
      status = setStatusString(status, 'PETS', CharacterStatusState.SUCCESS);
    } else {
      status = setStatusString(status, 'PETS', CharacterStatusState.ERROR);
    }

    const isMountsCollectionFulfilled = mountsCollection.status === 'fulfilled';
    if (isMountsCollectionFulfilled) {
      Object.assign(characterEntity, mountsCollection.value);
      status = setStatusString(status, 'MOUNTS', CharacterStatusState.SUCCESS);
    } else {
      status = setStatusString(status, 'MOUNTS', CharacterStatusState.ERROR);
    }

    const isMediaFulfilled = media.status === 'fulfilled';
    if (isMediaFulfilled) {
      Object.assign(characterEntity, media.value);
      status = setStatusString(status, 'MEDIA', CharacterStatusState.SUCCESS);
    } else {
      status = setStatusString(status, 'MEDIA', CharacterStatusState.ERROR);
    }

    const isProfessionsFulfilled = professions.status === 'fulfilled';
    if (isProfessionsFulfilled) {
      Object.assign(characterEntity, professions.value);
      status = setStatusString(status, 'PROFESSIONS', CharacterStatusState.SUCCESS);
    } else {
      status = setStatusString(status, 'PROFESSIONS', CharacterStatusState.ERROR);
    }

    // Update entity with status string
    characterEntity.status = status;
  }

  private async fetchAndSyncPets(
    nameSlug: string,
    realmSlug: string,
  ): Promise<
    Partial<{
      petsNumber: number;
      statusCode: number;
      hashA: string;
      hashB: string;
    }>
  > {
    const petsResponse = await this.characterService.getPetsCollection(nameSlug, realmSlug, this.BNet);

    const hasPetsResponse = Boolean(petsResponse);
    if (!hasPetsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterPets(nameSlug, realmSlug, petsResponse, true);
  }

  private async fetchAndSyncMounts(
    nameSlug: string,
    realmSlug: string,
  ): Promise<Partial<{ mountsNumber: number; statusCode: number }>> {
    const mountsResponse = await this.characterService.getMountsCollection(nameSlug, realmSlug, this.BNet);

    const hasMountsResponse = Boolean(mountsResponse);
    if (!hasMountsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterMounts(nameSlug, realmSlug, mountsResponse, true);
  }

  private async fetchAndSyncProfessions(
    nameSlug: string,
    realmSlug: string,
  ): Promise<Partial<{ professions: string[] }>> {
    const professionsResponse = await this.characterService.getProfessions(nameSlug, realmSlug, this.BNet);

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
