import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import chalk from 'chalk';
import { BattleNetService, BATTLE_NET_KEY_TAG_OSINT } from '@app/battle-net';
import {
  CHARACTER_SUMMARY_FIELD_MAPPING,
  charactersQueue,
  toSlug,
  ICharacterMessageBase,
  setStatusString,
  CharacterStatusState,
  RateLimitError,
  CHARACTER_STATUS_CODES,
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
export class CharactersWorker extends WorkerHost implements OnModuleInit {
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

  constructor(
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    private readonly characterService: CharacterService,
    private readonly lifecycleService: CharacterLifecycleService,
    private readonly collectionSyncService: CharacterCollectionService,
    private readonly battleNetService: BattleNetService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_OSINT);
  }

  async process(job: Job<ICharacterMessageBase>): Promise<CharactersEntity> {
    const message = job.data;
    const startTime = Date.now();
    this.stats.total++;

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

      await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_OSINT);

      this.inheritSafeValuesFromArgs(characterEntity, message);

      const status = await this.characterService.getStatus(nameSlug, characterEntity.realm);

      await this.battleNetService.recordKeySuccess();

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

      await job.updateProgress(100);

      return characterEntity;
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${message.name}@${message.realm}` : 'unknown';
      const updatedBy = message.updatedBy || 'unknown';

      if (errorOrException instanceof RateLimitError) {
        await this.battleNetService.recordKeyRateLimit();

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

      await this.battleNetService.recordKeyError();

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

  private async fetchAndUpdateCharacterData(characterEntity: CharactersEntity, nameSlug: string): Promise<void> {
    let status = characterEntity.status || '------';

    const tasks = [
      {
        name: 'summary',
        fn: () => this.characterService.getSummary(nameSlug, characterEntity.realm),
      },
      {
        name: 'pets',
        fn: () => this.fetchAndSyncPets(nameSlug, characterEntity.realm),
      },
      {
        name: 'mounts',
        fn: () => this.fetchAndSyncMounts(nameSlug, characterEntity.realm),
      },
      {
        name: 'media',
        fn: () => this.characterService.getMedia(nameSlug, characterEntity.realm),
      },
      {
        name: 'professions',
        fn: () => this.fetchAndSyncProfessions(nameSlug, characterEntity.realm),
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

  private async fetchAndSyncPets(nameSlug: string, realmSlug: string): Promise<PetsFetchResult> {
    const petsResponse = await this.characterService.getPetsCollection(nameSlug, realmSlug);

    const hasPetsResponse = Boolean(petsResponse);
    if (!hasPetsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterPets(nameSlug, realmSlug, petsResponse, true);
  }

  private async fetchAndSyncMounts(nameSlug: string, realmSlug: string): Promise<MountsFetchResult> {
    const mountsResponse = await this.characterService.getMountsCollection(nameSlug, realmSlug);

    const hasMountsResponse = Boolean(mountsResponse);
    if (!hasMountsResponse) {
      return {};
    }

    return this.collectionSyncService.syncCharacterMounts(nameSlug, realmSlug, mountsResponse, true);
  }

  private async fetchAndSyncProfessions(nameSlug: string, realmSlug: string): Promise<ProfessionsFetchResult> {
    const professionsResponse = await this.characterService.getProfessions(nameSlug, realmSlug);

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
