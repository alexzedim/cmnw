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
import { CharacterService, CharacterLifecycleService, CharacterCollectionService, HashBlockService } from '../services';
import { FeedService } from '@app/resources/services/feed.service';
import { FeedEventCategory, FeedStatus } from '@app/resources';

type RefreshEndpoint = 'STATUS' | 'SUMMARY' | 'MEDIA' | 'PETS' | 'MOUNTS' | 'PROFESSIONS';

interface IRefreshContext {
  sessionId: string;
  requestId?: string;
  guid?: string;
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
        'STATUS',
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

      await this.characterService.save(characterEntity);

      const hasHashBNow = Boolean(characterEntity.hashB);
      const hadHashB = !isNew && Boolean(original?.hashB);
      if (hasHashBNow || hadHashB) {
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

    const [summaryResult, mediaResult, petsResult, mountsResult, professionsResult] = await Promise.allSettled([
      this.tapRefresh(refreshCtx, 'SUMMARY', this.characterService.getSummary(nameSlug, realmSlug, config)),
      this.tapRefresh(refreshCtx, 'MEDIA', this.characterService.getMedia(nameSlug, realmSlug, config)),
      this.tapRefresh(refreshCtx, 'PETS', this.characterService.getPetsCollection(nameSlug, realmSlug, config)),
      this.tapRefresh(refreshCtx, 'MOUNTS', this.characterService.getMountsCollection(nameSlug, realmSlug, config)),
      this.tapRefresh(refreshCtx, 'PROFESSIONS', this.characterService.getProfessions(nameSlug, realmSlug, config)),
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

  private logCharacterResult(character: CharactersEntity, duration: number, refreshCtx: IRefreshContext | null): void {
    const status = character.status || '------';
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
