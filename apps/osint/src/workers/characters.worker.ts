import { BlizzAPI } from '@alexzedim/blizzapi';
import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
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
    try {
      const { data: args } = job;

      const { characterEntity, isNew, isCreateOnlyUnique, isNotReadyToUpdate } =
        await this.lifecycleService.findOrCreateCharacter(args);

      const shouldSkipUpdate = isNotReadyToUpdate || isCreateOnlyUnique;
      if (shouldSkipUpdate) {
        await job.updateProgress(100);
        this.logger.warn(
          `Skipping update: ${characterEntity.guid} | createOnlyUnique: ${isCreateOnlyUnique} | notReady: ${isNotReadyToUpdate}`,
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

      this.logger.log(`${characterEntity.statusCode} >> character: ${characterEntity.guid}`);

      return characterEntity.statusCode;
    } catch (errorOrException) {
      await job.log(errorOrException);
      this.logger.error({
        logTag: 'CharactersWorker|process',
        error: errorOrException,
      });
      return 500;
    }
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
