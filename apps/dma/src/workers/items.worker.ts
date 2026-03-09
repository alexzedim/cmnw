import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AdaptiveRateLimiter,
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiItem,
  BlizzardApiService,
  DEFAULT_RATE_LIMITER_CONFIG,
  DMA_SOURCE,
  IItem,
  IItemMessageBase,
  isItem,
  isItemMedia,
  isNamedField,
  ITEM_FIELD_MAPPING,
  itemsQueue,
  RateLimitStatusCode,
  toGold,
  TOLERANCE_ENUM,
  VALUATION_TYPE,
} from '@app/resources';
import { ItemsEntity } from '@app/pg';
import { Job } from 'bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
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
export class ItemsWorker extends WorkerHost {
  private readonly logger = new Logger(ItemsWorker.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  private stats: WorkerStats = {
    total: 0,
    success: 0,
    errors: 0,
    notFound: 0,
    startTime: Date.now(),
  };

  private readonly rateLimiter: AdaptiveRateLimiter;

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    private readonly blizzardApiService: BlizzardApiService,
  ) {
    super();
    this.rateLimiter = new AdaptiveRateLimiter(
      DEFAULT_RATE_LIMITER_CONFIG,
      this.logger,
    );
  }

  public async process(message: Job<IItemMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = message;

      // --- Check exits, if not, create --- //
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

      this.BNet = this.blizzardApiService.createClient({
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        region: args.region || 'eu',
      });

      // --- Request item data --- //
      const isMultiLocale = true;
      await this.rateLimiter.wait();
      const [getItemSummary, getItemMedia] = await Promise.allSettled([
        this.BNet.query<BlizzardApiItem>(
          `/data/wow/item/${args.itemId}`,
          apiConstParams(
            API_HEADERS_ENUM.STATIC,
            TOLERANCE_ENUM.DMA,
            isMultiLocale,
          ),
        ),
        this.BNet.query(
          `/data/wow/media/item/${args.itemId}`,
          apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA),
        ),
      ]);

      const isItemValid = isItem(getItemSummary);
      if (!isItemValid) {
        this.stats.notFound++;
        const duration = Date.now() - startTime;
        this.logger.warn(
          formatWorkerLog(
            WorkerLogStatus.NOT_FOUND,
            this.stats.total,
            `item-${args.itemId}`,
            duration,
          ),
        );
        return;
      }

      const gold = new Set(['sell_price', 'purchase_price']);
      const namedFields = new Set([
        'name',
        'quality',
        'item_class',
        'item_subclass',
        'inventory_type',
      ]);

      Object.keys(getItemSummary.value).forEach((key: keyof IItem) => {
        const isKeyInPath = ITEM_FIELD_MAPPING.has(key);
        if (isKeyInPath) {
          const property = ITEM_FIELD_MAPPING.get(key);
          let value = get(getItemSummary.value, property.path, null);
          const isFieldName = namedFields.has(key)
            ? isNamedField(value)
            : false;

          if (isFieldName) value = get(value, `en_GB`, null);

          if (gold.has(key)) {
            value = toGold(value);
          }

          if (value && value !== itemEntity[property.key])
            (itemEntity[property.key] as string | number) = value;
        }
      });

      if (isMultiLocale) {
        itemEntity.names = getItemSummary.value.name as unknown as string;
      }

      const isVSP =
        (itemEntity.vendorSellPrice && isNew) ||
        (itemEntity.vendorSellPrice &&
          itemEntity.assetClass &&
          !itemEntity.assetClass.includes(VALUATION_TYPE.VSP));

      if (isVSP) {
        const assetClass = new Set(itemEntity.assetClass).add(
          VALUATION_TYPE.VSP,
        );
        itemEntity.assetClass = Array.from(assetClass);
      }

      const isItemMediaValid = isItemMedia(getItemMedia);
      if (isItemMediaValid) {
        const [icon] = getItemMedia.value.assets;
        itemEntity.icon = icon.value;
      }

      await this.itemsRepository.save(itemEntity);
      this.stats.success++;
      this.rateLimiter.onSuccess();

      const duration = Date.now() - startTime;
      this.logger.log(
        formatWorkerLogWithDetails(
          WorkerLogStatus.SUCCESS,
          this.stats.total,
          `item-${itemEntity.id}`,
          duration,
          { isNew, name: itemEntity.name },
        ),
      );

      // Progress report every 50 items
      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const itemId = message.data.itemId || 'unknown';

      if (isAxiosError(errorOrException)) {
        const statusCode = errorOrException.response?.status;

        if (
          statusCode === RateLimitStatusCode.TOO_MANY_REQUESTS ||
          statusCode === RateLimitStatusCode.FORBIDDEN ||
          statusCode === RateLimitStatusCode.SERVICE_UNAVAILABLE
        ) {
          this.rateLimiter.onRateLimit({
            isRateLimited: true,
            statusCode,
            detectionSource: 'status-code',
          });
          this.logger.warn(
            formatWorkerLog(
              WorkerLogStatus.RATE_LIMITED,
              this.stats.total,
              `item-${itemId}`,
              duration,
              `Rate limited (${statusCode})`,
            ),
          );
          return;
        }
      }

      this.stats.errors++;
      this.logger.error(
        formatWorkerErrorLog(
          this.stats.total,
          `item-${itemId}`,
          duration,
          errorOrException.message,
        ),
      );

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
