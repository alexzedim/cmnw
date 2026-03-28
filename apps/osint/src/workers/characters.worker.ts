import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { isAxiosError } from 'axios';

import { BattleNetService, BATTLE_NET_KEY_TAG_OSINT } from '@app/battle-net';
import {
  BlizzardApiCharacterProfessions,
  BlizzardApiMountsCollection,
  BlizzardApiPetsCollection,
  charactersQueue,
  toSlug,
  ICharacterMessageBase,
  setStatusString,
  CharacterStatusState,
  RateLimitError,
  CHARACTER_STATUS_CODES,
} from '@app/resources';
import {
  WorkerStats,
  formatWorkerLog,
  WorkerLogStatus,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
} from '@app/logger';

import { CharactersEntity } from '@app/pg';
import { CharacterService, CharacterLifecycleService, CharacterCollectionService } from '../services';

@Injectable()
@Processor(charactersQueue.name, charactersQueue.workerOptions)
export class CharactersWorker extends WorkerHost implements OnApplicationBootstrap {
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
    private readonly characterService: CharacterService,
    private readonly lifecycleService: CharacterLifecycleService,
    private readonly collectionSyncService: CharacterCollectionService,
    private readonly battleNetService: BattleNetService,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_OSINT);
  }

  public async process(job: Job<ICharacterMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const message = job.data;
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
        return;
      }

      const nameSlug = toSlug(characterEntity.name);
      this.characterService.inheritSafeValuesFromArgs(characterEntity, message);

      const status = await this.characterService.getStatus(nameSlug, characterEntity.realm);

      const isValidCharacter = status?.isValid;
      if (status) Object.assign(characterEntity, status);

      if (isValidCharacter) {
        await this.fetchAndUpdateCharacterData(characterEntity, nameSlug);
      }

      if (!isNew) {
        const original = await this.lifecycleService.findByGuid(characterEntity.guid);
        if (original) {
          await this.lifecycleService.handleExistingCharacterUpdates(original, characterEntity);
        }
      }

      await this.characterService.save(characterEntity);

      const duration = Date.now() - startTime;
      this.logCharacterResult(characterEntity, duration);

      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.handleError(errorOrException, job.data, startTime);
      throw errorOrException;
    }
  }

  private async fetchAndUpdateCharacterData(characterEntity: CharactersEntity, nameSlug: string): Promise<void> {
    const realmSlug = characterEntity.realm;

    const [summaryResult, petsResult, mountsResult, mediaResult, professionsResult] = await Promise.allSettled([
      this.characterService.getSummary(nameSlug, realmSlug),
      this.characterService.getPetsCollection(nameSlug, realmSlug),
      this.characterService.getMountsCollection(nameSlug, realmSlug),
      this.characterService.getMedia(nameSlug, realmSlug),
      this.characterService.getProfessions(nameSlug, realmSlug),
    ]);

    let status = characterEntity.status || '------';

    status = this.processResult(status, 'SUMMARY', summaryResult, (data) => {
      Object.assign(characterEntity, data);
    });

    status = await this.processPetsResult(status, petsResult, nameSlug, realmSlug, characterEntity);
    status = await this.processMountsResult(status, mountsResult, nameSlug, realmSlug, characterEntity);

    status = this.processResult(status, 'MEDIA', mediaResult, (data) => {
      Object.assign(characterEntity, data);
    });

    status = await this.processProfessionsResult(status, professionsResult, nameSlug, realmSlug, characterEntity);

    characterEntity.status = status;
  }

  private processResult<T>(
    currentStatus: string,
    endpoint: keyof typeof CHARACTER_STATUS_CODES,
    result: PromiseSettledResult<T>,
    applyFn: (data: T) => void,
  ): string {
    if (result.status === 'fulfilled' && result.value) {
      applyFn(result.value);
      return setStatusString(currentStatus, endpoint, CharacterStatusState.SUCCESS);
    }
    return setStatusString(currentStatus, endpoint, CharacterStatusState.ERROR);
  }

  private async processPetsResult(
    currentStatus: string,
    result: PromiseSettledResult<BlizzardApiPetsCollection | null>,
    nameSlug: string,
    realmSlug: string,
    characterEntity: CharactersEntity,
  ): Promise<string> {
    if (result.status === 'fulfilled' && result.value) {
      const syncResult = await this.collectionSyncService.syncCharacterPets(nameSlug, realmSlug, result.value, true);
      characterEntity.petsNumber = syncResult.petsNumber;
      characterEntity.hashA = syncResult.hashA;
      characterEntity.hashB = syncResult.hashB;
      return setStatusString(currentStatus, 'PETS', CharacterStatusState.SUCCESS);
    }
    return setStatusString(currentStatus, 'PETS', CharacterStatusState.ERROR);
  }

  private async processMountsResult(
    currentStatus: string,
    result: PromiseSettledResult<BlizzardApiMountsCollection>,
    nameSlug: string,
    realmSlug: string,
    characterEntity: CharactersEntity,
  ): Promise<string> {
    if (result.status === 'fulfilled' && result.value) {
      const syncResult = await this.collectionSyncService.syncCharacterMounts(nameSlug, realmSlug, result.value, true);
      characterEntity.mountsNumber = syncResult.mountsNumber;
      return setStatusString(currentStatus, 'MOUNTS', CharacterStatusState.SUCCESS);
    }
    return setStatusString(currentStatus, 'MOUNTS', CharacterStatusState.ERROR);
  }

  private async processProfessionsResult(
    currentStatus: string,
    result: PromiseSettledResult<BlizzardApiCharacterProfessions | null>,
    nameSlug: string,
    realmSlug: string,
    characterEntity: CharactersEntity,
  ): Promise<string> {
    if (result.status === 'fulfilled' && result.value) {
      characterEntity.professions = await this.collectionSyncService.syncCharacterProfessions(
        nameSlug,
        realmSlug,
        result.value,
      );
      return setStatusString(currentStatus, 'PROFESSIONS', CharacterStatusState.SUCCESS);
    }
    return setStatusString(currentStatus, 'PROFESSIONS', CharacterStatusState.ERROR);
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

  private handleError(errorOrException: unknown, message: ICharacterMessageBase, startTime: number): void {
    const duration = Date.now() - startTime;
    const guid = message.name && message.realm ? `${message.name}@${message.realm}` : 'unknown';
    const updatedBy = message.updatedBy || 'unknown';

    if (errorOrException instanceof RateLimitError) {
      this.handleRateLimitError(errorOrException, guid, duration);
      return;
    }

    if (isAxiosError(errorOrException)) {
      this.handleAxiosError(errorOrException, guid, duration);
      return;
    }

    this.handleGenericError(errorOrException, guid, duration, updatedBy);
  }

  private async handleRateLimitError(error: RateLimitError, guid: string, duration: number): Promise<void> {
    await this.battleNetService.recordKeyRateLimit();
    this.stats.rateLimit++;
    this.logger.warn(
      formatWorkerLog(
        WorkerLogStatus.RATE_LIMITED,
        this.stats.total,
        guid,
        duration,
        `Retry after: ${error.retryAfter || 'unknown'}s`,
      ),
    );
  }

  private async handleAxiosError(error: unknown, guid: string, duration: number): Promise<void> {
    const axiosError = error as { response?: { status?: number }; message?: string };
    const statusCode = axiosError.response?.status;

    await this.battleNetService.recordKeyError();
    this.stats.errors++;
    this.logger.error(
      formatWorkerErrorLog(this.stats.total, guid, duration, `HTTP ${statusCode}: ${axiosError.message}`),
    );
  }

  private async handleGenericError(error: unknown, guid: string, duration: number, updatedBy: string): Promise<void> {
    await this.battleNetService.recordKeyError();
    this.stats.errors++;
    this.logger.error(
      formatWorkerErrorLog(
        this.stats.total,
        guid,
        duration,
        error instanceof Error ? error.message : String(error),
        updatedBy,
      ),
    );
  }
}
