import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BattleNetService, BattleNetNamespace, BATTLE_NET_KEY_TAG_DMA } from '@app/battle-net';

import {
  DMA_SOURCE,
  IItem,
  IItemMessageBase,
  isItem,
  isItemMedia,
  isNamedField,
  ITEM_FIELD_MAPPING,
  itemsQueue,
  toGold,
  VALUATION_TYPE,
} from '@app/resources';
import { ItemsEntity } from '@app/pg';
import { Job } from 'bullmq';
import { get } from 'lodash';
import { isAxiosError } from 'axios';
import {
  formatWorkerLog,
  formatWorkerLogWithDetails,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
  WorkerStats,
} from '@app/logger';

@Injectable()
@Processor(itemsQueue)
export class ItemsWorker extends WorkerHost implements OnModuleInit {
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

  async onModuleInit(): Promise<void> {
    await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_DMA);
  }

  public async process(message: Job<IItemMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = message;

      const isMultiLocale = true;

      let itemResponse: any = null;
      let mediaResponse: any = null;

      try {
        itemResponse = await this.battleNetService.query(`/data/wow/item/${args.itemId}`, {
          namespace: BattleNetNamespace.STATIC,
          timeout: 60_000,
          locale: isMultiLocale ? undefined : 'en_GB',
        });
      } catch {}

      try {
        mediaResponse = await this.battleNetService.query(`/data/wow/media/item/${args.itemId}`, {
          namespace: BattleNetNamespace.STATIC,
          timeout: 60_000,
        });
      } catch {}

      let itemEntity = await this.itemsRepository.findOneBy({
        id: args.itemId,
      });

      const isNew = !itemEntity;
      if (isNew) {
        itemEntity = this.itemsRepository.create({
          id: args.itemId,
          indexBy: DMA_SOURCE.API,
        });
      }

      const isItemValid = itemResponse && isItem({ status: 'fulfilled', value: itemResponse } as any);
      if (!isItemValid) {
        this.stats.notFound++;
        const duration = Date.now() - startTime;
        this.logger.warn(formatWorkerLog(WorkerLogStatus.NOT_FOUND, this.stats.total, `item-${args.itemId}`, duration));
        return;
      }

      const gold = new Set(['sell_price', 'purchase_price']);
      const namedFields = new Set(['name', 'quality', 'item_class', 'item_subclass', 'inventory_type']);

      Object.keys(itemResponse).forEach((key: keyof IItem) => {
        const isKeyInPath = ITEM_FIELD_MAPPING.has(key);
        if (isKeyInPath) {
          const property = ITEM_FIELD_MAPPING.get(key);
          let value = get(itemResponse, property.path, null);
          const isFieldName = namedFields.has(key) ? isNamedField(value) : false;

          if (isFieldName) value = get(value, `en_GB`, null);

          if (gold.has(key)) {
            value = toGold(value);
          }

          if (value && value !== itemEntity[property.key]) (itemEntity[property.key] as string | number) = value;
        }
      });

      if (isMultiLocale) {
        itemEntity.names = itemResponse.name as unknown as string;
      }

      const isVSP =
        (itemEntity.vendorSellPrice && isNew) ||
        (itemEntity.vendorSellPrice && itemEntity.assetClass && !itemEntity.assetClass.includes(VALUATION_TYPE.VSP));

      if (isVSP) {
        const assetClass = new Set(itemEntity.assetClass).add(VALUATION_TYPE.VSP);
        itemEntity.assetClass = Array.from(assetClass);
      }

      const isItemMediaValid = mediaResponse && isItemMedia({ status: 'fulfilled', value: mediaResponse } as any);
      if (isItemMediaValid) {
        const [icon] = mediaResponse.assets;
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

  private logProgress(): void {
    this.logger.log(formatProgressReport('ItemsWorker', this.stats, 'items'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('ItemsWorker', this.stats, 'items'));
  }
}
