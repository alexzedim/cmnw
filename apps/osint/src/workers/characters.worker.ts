import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { BattleNetService, BATTLE_NET_KEY_TAG_OSINT, IBattleNetClientConfig } from '@app/battle-net';
import {
  BlizzardApiCharacterProfessions,
  BlizzardApiMountsCollection,
  BlizzardApiPetsCollection,
  charactersQueue,
  toSlug,
  ICharacterMessageBase,
  setStatusString,
  CharacterStatusState,
  CHARACTER_STATUS_CODES,
  isEndpointSuccessInString,
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
export class CharactersWorker extends WorkerHost {
  private readonly logger = new Logger(CharactersWorker.name, {
    timestamp: true,
  });

  private stats: WorkerStats = {
    total: 0,
    success: 0,
    errors: 0,
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

  public async process(job: Job<ICharacterMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;
    const message = job.data;

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
        return;
      }

      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_OSINT);

      const nameSlug = toSlug(characterEntity.name);
      this.characterService.inheritSafeValuesFromArgs(characterEntity, message);

      const status = await this.characterService.getStatus(nameSlug, characterEntity.realm, config);

      const isValidCharacter = status?.isValid;
      if (status) Object.assign(characterEntity, status);

      if (isValidCharacter) {
        await this.fetchAndUpdateCharacterData(characterEntity, nameSlug, config);
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
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${toSlug(message.name)}@${toSlug(message.realm)}` : 'unknown';
      const error = errorOrException instanceof Error ? errorOrException.message : String(errorOrException);

      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, duration, error));
      throw errorOrException;
    }
  }

  private async fetchAndUpdateCharacterData(
    characterEntity: CharactersEntity,
    nameSlug: string,
    config: IBattleNetClientConfig,
  ): Promise<void> {
    const realmSlug = characterEntity.realm;

    const [summaryResult, petsResult, mountsResult, mediaResult, professionsResult] = await Promise.allSettled([
      this.characterService.getSummary(nameSlug, realmSlug, config),
      this.characterService.getPetsCollection(nameSlug, realmSlug, config),
      this.characterService.getMountsCollection(nameSlug, realmSlug, config),
      this.characterService.getMedia(nameSlug, realmSlug, config),
      this.characterService.getProfessions(nameSlug, realmSlug, config),
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
    const isAllSuccess = isEndpointSuccessInString(status, 'STATUS') && isEndpointSuccessInString(status, 'SUMMARY');
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
}
