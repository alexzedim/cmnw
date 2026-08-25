import { BATTLE_NET_KEY_TAG_OSINT, BattleNetService, type IBattleNetClientConfig } from '@app/battle-net';
import {
  formatFinalSummary,
  formatProgressReport,
  formatWorkerErrorLog,
  formatWorkerLog,
  WorkerLogStatus,
  type WorkerStats,
} from '@app/logger';
import type { CharactersEntity } from '@app/pg';
import {
  type BlizzardApiCharacterProfessions,
  type BlizzardApiMountsCollection,
  type BlizzardApiPetsCollection,
  batchedAllSettled,
  CHARACTER_ENDPOINT_BATCH_DELAY_MS,
  CHARACTER_ENDPOINT_BATCH_SIZE,
  type CHARACTER_STATUS_CODES,
  type CharacterAge,
  type CharacterEndpointTasks,
  CharacterStatusState,
  charactersQueue,
  FeedEventCategory,
  FeedStatus,
  HASH_RECONCILE_SWEEP_CHANCE,
  type ICharacterMessageBase,
  type IRefreshContext,
  isEndpointSuccessInString,
  RefreshEndpoint,
  setStatusString,
  toSlug,
} from '@app/resources';
import { FeedService } from '@app/resources/services/feed.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CharacterCollectionService, CharacterLifecycleService, CharacterService, HashBlockService } from '../services';

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
    private readonly feedService: FeedService,
    private readonly hashBlockService: HashBlockService,
  ) {
    super();
  }

  public async process(job: Job<ICharacterMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;
    const message = job.data;

    const refreshCtx = message.sessionId
      ? { sessionId: message.sessionId, requestId: message.requestId, guid: message.guid }
      : null;

    try {
      if (refreshCtx) {
        await this.emitRefresh(refreshCtx, FeedStatus.INFO, `refresh started`, { phase: 'started' });
      }

      const { characterEntity, isNew, isCreateOnlyUnique, isNotReadyToUpdate } =
        await this.lifecycleService.findOrCreateCharacter(message);

      const loadedUpdatedAt = characterEntity.updatedAt ? new Date(characterEntity.updatedAt) : null;

      const shouldSkipUpdate = isNotReadyToUpdate || isCreateOnlyUnique;
      if (shouldSkipUpdate) {
        this.stats.skipped++;
        const duration = Date.now() - startTime;
        const reason = isCreateOnlyUnique ? 'createOnly' : 'notReady';
        this.logger.warn(
          formatWorkerLog(WorkerLogStatus.SKIPPED, this.stats.total, characterEntity.guid, duration, reason),
        );
        if (refreshCtx) {
          await this.emitRefresh(refreshCtx, FeedStatus.SKIPPED, `refresh skipped: ${reason}`, {
            phase: 'skipped',
            durationMs: duration,
            reason,
          });
        }
        return;
      }

      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_OSINT);

      const nameSlug = toSlug(characterEntity.name);
      this.characterService.inheritSafeValuesFromArgs(characterEntity, message);

      const status = await this.tapRefresh(
        refreshCtx,
        RefreshEndpoint.STATUS,
        this.characterService.getStatus(nameSlug, characterEntity.realm, config),
      );

      const isValidCharacter = status?.isValid;
      if (status) Object.assign(characterEntity, status);

      if (isValidCharacter) {
        await this.fetchAndUpdateCharacterData(characterEntity, nameSlug, config, refreshCtx);
      }

      let original: CharactersEntity | null = null;
      if (!isNew) {
        original = await this.lifecycleService.findByGuid(characterEntity.guid);
        if (original) {
          await this.lifecycleService.handleExistingCharacterUpdates(original, characterEntity);
        }
      }

      if (!isNew && loadedUpdatedAt) {
        const currentDbState = await this.lifecycleService.findByGuid(characterEntity.guid);
        if (currentDbState && currentDbState.updatedAt > loadedUpdatedAt) {
          characterEntity.guildGuid = currentDbState.guildGuid;
          characterEntity.guild = currentDbState.guild;
          characterEntity.guildId = currentDbState.guildId;
          characterEntity.guildRank = currentDbState.guildRank;
        }
      }

      characterEntity.updatedAt = new Date();
      await this.characterService.save(characterEntity);

      const newHashA = characterEntity.hashA ?? null;
      const newHashB = characterEntity.hashB ?? null;
      const oldHashA = original?.hashA ?? null;
      const oldHashB = original?.hashB ?? null;
      const isHashChanged = newHashA !== oldHashA || newHashB !== oldHashB;
      const hasAnyHashB = Boolean(newHashB) || Boolean(oldHashB);
      const isSweepHit = Math.random() < HASH_RECONCILE_SWEEP_CHANCE;
      if (hasAnyHashB && (isHashChanged || isSweepHit)) {
        await this.hashBlockService.enqueueHashUpdate(characterEntity.guid);
      }

      const duration = Date.now() - startTime;
      this.logCharacterResult(characterEntity, duration, refreshCtx);

      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid = message.name && message.realm ? `${toSlug(message.name)}@${toSlug(message.realm)}` : 'unknown';
      const error = errorOrException instanceof Error ? errorOrException.message : String(errorOrException);

      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, duration, error, 'SYNC'));
      if (refreshCtx) {
        await this.emitRefresh(refreshCtx, FeedStatus.ERROR, `refresh error`, {
          phase: 'error',
          durationMs: duration,
          error,
        });
      }
      throw errorOrException;
    }
  }

  private async fetchAndUpdateCharacterData(
    characterEntity: CharactersEntity,
    nameSlug: string,
    config: IBattleNetClientConfig,
    refreshCtx: IRefreshContext | null,
  ): Promise<void> {
    const realmSlug = characterEntity.realm;
    const isScanNeeded =
      characterEntity.createdApprox == null ||
      (characterEntity.isLevelBoosted == null && characterEntity.levelBoostEvidence == null);

    const achievementsTask: CharacterEndpointTasks[5] = isScanNeeded
      ? () =>
          this.tapRefresh(
            refreshCtx,
            RefreshEndpoint.ACHIEVEMENTS,
            this.characterService.getAchievements(nameSlug, realmSlug, config, characterEntity.class),
          )
      : () => Promise.resolve(null);

    const endpointTasks: CharacterEndpointTasks = [
      () =>
        this.tapRefresh(
          refreshCtx,
          RefreshEndpoint.SUMMARY,
          this.characterService.getSummary(nameSlug, realmSlug, config),
        ),
      () =>
        this.tapRefresh(refreshCtx, RefreshEndpoint.MEDIA, this.characterService.getMedia(nameSlug, realmSlug, config)),
      () =>
        this.tapRefresh(
          refreshCtx,
          RefreshEndpoint.PETS,
          this.characterService.getPetsCollection(nameSlug, realmSlug, config),
        ),
      () =>
        this.tapRefresh(
          refreshCtx,
          RefreshEndpoint.MOUNTS,
          this.characterService.getMountsCollection(nameSlug, realmSlug, config),
        ),
      () =>
        this.tapRefresh(
          refreshCtx,
          RefreshEndpoint.PROFESSIONS,
          this.characterService.getProfessions(nameSlug, realmSlug, config),
        ),
      achievementsTask,
    ];

    const [summaryResult, mediaResult, petsResult, mountsResult, professionsResult, achievementsResult] =
      await batchedAllSettled(endpointTasks, CHARACTER_ENDPOINT_BATCH_SIZE, CHARACTER_ENDPOINT_BATCH_DELAY_MS);

    let status = characterEntity.status || '-------';

    status = this.processResult(status, 'SUMMARY', summaryResult, (data) => {
      Object.assign(characterEntity, data);
    });

    status = await this.processPetsResult(status, petsResult, nameSlug, realmSlug, characterEntity);
    status = await this.processMountsResult(status, mountsResult, nameSlug, realmSlug, characterEntity);

    status = this.processResult(status, 'MEDIA', mediaResult, (data) => {
      Object.assign(characterEntity, data);
    });

    status = await this.processProfessionsResult(status, professionsResult, nameSlug, realmSlug, characterEntity);

    status = this.processAchievementsResult(status, achievementsResult, characterEntity, isScanNeeded);

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
    result: PromiseSettledResult<BlizzardApiMountsCollection | null>,
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

  private processAchievementsResult(
    currentStatus: string,
    result: PromiseSettledResult<Partial<CharacterAge> | null>,
    characterEntity: CharactersEntity,
    isScanNeeded: boolean,
  ): string {
    if (!isScanNeeded) {
      return currentStatus;
    }

    const age = result.status === 'fulfilled' ? result.value : null;
    if (!age) {
      return setStatusString(currentStatus, 'ACHIEVEMENTS', CharacterStatusState.ERROR);
    }

    if (age.createdApprox) {
      characterEntity.createdApprox = age.createdApprox;
    }

    if (age.levelBoostEvidence) {
      characterEntity.levelBoostEvidence = age.levelBoostEvidence;
    }

    characterEntity.isLevelBoosted = age.isLevelBoosted ?? null;
    characterEntity.levelBoostType = age.levelBoostType ?? null;
    characterEntity.levelBoostedAt = age.levelBoostedAt ?? null;

    return setStatusString(currentStatus, 'ACHIEVEMENTS', CharacterStatusState.SUCCESS);
  }

  private logCharacterResult(character: CharactersEntity, duration: number, refreshCtx: IRefreshContext | null): void {
    const status = character.status || '-------';
    const guid = character.guid;
    const isAllSuccess = isEndpointSuccessInString(status, 'STATUS') && isEndpointSuccessInString(status, 'SUMMARY');
    const hasAnyError = /[a-z]/.test(status);

    let feedStatus: FeedStatus;
    let logStatus: WorkerLogStatus;

    if (isAllSuccess) {
      feedStatus = FeedStatus.SUCCESS;
      logStatus = WorkerLogStatus.SUCCESS;
      this.stats.success++;
    } else if (hasAnyError) {
      feedStatus = FeedStatus.PARTIAL;
      logStatus = WorkerLogStatus.PARTIAL;
    } else {
      feedStatus = FeedStatus.INFO;
      logStatus = WorkerLogStatus.INFO;
    }

    this.logger.log(formatWorkerLog(logStatus, this.stats.total, guid, duration, status));

    if (refreshCtx) {
      // Client-driven refresh: route terminal event only to the originating session.
      void this.emitRefresh(refreshCtx, feedStatus, `refresh finished`, {
        phase: 'finished',
        durationMs: duration,
        status,
      });
    } else {
      // Background indexing: broadcast to everyone (unchanged behavior).
      this.feedService.emitWorker(
        feedStatus,
        this.stats.total,
        `character ${guid}`,
        duration,
        'osint.characters',
        FeedEventCategory.CHARACTER,
        { guid, status },
      );
    }
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('CharactersWorker', this.stats, 'characters'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('CharactersWorker', this.stats, 'characters'));
  }

  /**
   * Wraps a single Blizzard endpoint promise so that, when this is an interactive
   * client refresh, progress is emitted the moment that endpoint resolves —
   * without altering the promise's own resolution value or rejection.
   */
  private tapRefresh<T>(
    refreshCtx: IRefreshContext | null,
    endpoint: RefreshEndpoint,
    promise: Promise<T>,
  ): Promise<T> {
    if (!refreshCtx) return promise;
    const startedAt = Date.now();
    return promise.then(
      (value) => {
        void this.emitRefresh(refreshCtx, FeedStatus.SUCCESS, `${endpoint} done`, {
          phase: 'endpoint',
          endpoint,
          durationMs: Date.now() - startedAt,
        });
        return value;
      },
      (error) => {
        void this.emitRefresh(refreshCtx, FeedStatus.ERROR, `${endpoint} failed`, {
          phase: 'endpoint',
          endpoint,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      },
    );
  }

  private emitRefresh(
    ctx: IRefreshContext,
    status: FeedStatus,
    message: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    return this.feedService.emit({
      category: FeedEventCategory.CHARACTER,
      status,
      message,
      source: 'osint.characters.refresh',
      meta: { ...ctx, ...meta },
    });
  }
}
