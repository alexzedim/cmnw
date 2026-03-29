import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BattleNetService, BattleNetNamespace, BATTLE_NET_KEY_TAG_DMA, IBattleNetClientConfig } from '@app/battle-net';

import {
  BlizzardApiItem,
  BlizzardApiItemMedia,
  DMA_SOURCE,
  GOLD_FIELDS,
  IItem,
  IItemMessageBase,
  isItem,
  isItemMedia,
  isNamedField,
  ITEM_FIELD_MAPPING,
  itemsQueue,
  NAMED_FIELDS,
  toGold,
  VALUATION_TYPE,
} from '@app/resources';
import { ItemsEntity } from '@app/pg';
import {
  WorkerStats,
  formatWorkerLog,
  WorkerLogStatus,
  formatWorkerLogWithDetails,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
} from '@app/logger';
import { isAxiosError } from 'axios';
import { Job } from 'bullmq';
import { get } from 'lodash';

@Injectable()
@Processor(itemsQueue)
export class ItemsWorker extends WorkerHost {
  private readonly logger = new Logger(ItemsWorker.name, {
    timestamp: true,
  });

  private stats: WorkerStats = {
    total: 0,
    success: 0,
    errors: 0,
    notFound: 0,
    startTime: Date.now(),
  };

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    private readonly battleNetService: BattleNetService,
  ) {
    super();
  }

  public async process(message: Job<IItemMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { itemId } = message.data;
      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_DMA);
      const results = await this.fetchData(itemId, config);

      const [itemResult, mediaResult] = results;

      if (!isItem(itemResult)) {
        this.stats.notFound++;
        const duration = Date.now() - startTime;
        this.logger.warn(formatWorkerLog(WorkerLogStatus.NOT_FOUND, this.stats.total, `item-${itemId}`, duration));
        return;
      }

      const itemResponse = itemResult.value;
      let itemEntity = await this.itemsRepository.findOneBy({ id: itemId });

      const isNew = !itemEntity;
      if (isNew) {
        itemEntity = this.itemsRepository.create({
          id: itemId,
          indexBy: DMA_SOURCE.API,
        });
      }

      this.applyFieldMappings(itemEntity, itemResponse);
      itemEntity.names = itemResponse.name;
      this.applyVendorSellPriceFlag(itemEntity, isNew);

      if (isItemMedia(mediaResult)) {
        const [icon] = mediaResult.value.assets;
        itemEntity.icon = icon.value;
      }

      await this.itemsRepository.save(itemEntity);
      this.stats.success++;

      const duration = Date.now() - startTime;
      this.logger.log(
        formatWorkerLogWithDetails(WorkerLogStatus.SUCCESS, this.stats.total, `item-${itemEntity.id}`, duration, {
          isNew,
          name: itemEntity.name,
        }),
      );

      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const itemId = message.data.itemId || 'unknown';

      if (isAxiosError(errorOrException)) {
        const statusCode = errorOrException.response?.status;
        this.stats.errors++;
        this.logger.error(
          formatWorkerErrorLog(
            this.stats.total,
            `item-${itemId}`,
            duration,
            `HTTP ${statusCode}: ${errorOrException.message}`,
          ),
        );
      } else {
        this.stats.errors++;
        this.logger.error(
          formatWorkerErrorLog(
            this.stats.total,
            `item-${itemId}`,
            duration,
            errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
          ),
        );
      }

      throw errorOrException;
    }
  }

  private async fetchData(
    itemId: number,
    config: IBattleNetClientConfig,
  ): Promise<[PromiseSettledResult<BlizzardApiItem>, PromiseSettledResult<BlizzardApiItemMedia>]> {
    const itemPromise = this.queryItem(itemId, config);
    const mediaPromise = this.queryMedia(itemId, config);

    return Promise.allSettled([itemPromise, mediaPromise]);
  }

  private async queryItem(itemId: number, config: IBattleNetClientConfig): Promise<BlizzardApiItem | null> {
    try {
      return await this.battleNetService.query<BlizzardApiItem>(
        `/data/wow/item/${itemId}`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.STATIC, 60_000),
        config,
      );
    } catch {
      return null;
    }
  }

  private async queryMedia(itemId: number, config: IBattleNetClientConfig): Promise<BlizzardApiItemMedia | null> {
    try {
      return await this.battleNetService.query<BlizzardApiItemMedia>(
        `/data/wow/media/item/${itemId}`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.STATIC, 60_000),
        config,
      );
    } catch {
      return null;
    }
  }

  private applyFieldMappings(itemEntity: ItemsEntity, itemResponse: Partial<IItem>): void {
    Object.keys(itemResponse).forEach((key: keyof IItem) => {
      if (!ITEM_FIELD_MAPPING.has(key)) return;

      const property = ITEM_FIELD_MAPPING.get(key);
      let value = get(itemResponse, property.path, null);

      if (NAMED_FIELDS.has(key) && isNamedField(value)) {
        value = get(value, 'en_GB', null);
      }

      if (GOLD_FIELDS.has(key)) {
        value = toGold(value);
      }

      if (value && value !== itemEntity[property.key]) {
        (itemEntity[property.key] as string | number) = value;
      }
    });
  }

  private applyVendorSellPriceFlag(itemEntity: ItemsEntity, isNew: boolean): void {
    if (!itemEntity.vendorSellPrice) return;

    const hasVSP = itemEntity.assetClass?.includes(VALUATION_TYPE.VSP);
    if (isNew || !hasVSP) {
      const assetClass = new Set(itemEntity.assetClass).add(VALUATION_TYPE.VSP);
      itemEntity.assetClass = Array.from(assetClass);
    }
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('ItemsWorker', this.stats, 'items'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('ItemsWorker', this.stats, 'items'));
  }
}
