import Redis from 'ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { bufferCount, concatMap } from 'rxjs/operators';
import { from, lastValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  API_HEADERS_ENUM,
  AdaptiveRateLimiter,
  apiConstParams,
  auctionsQueue,
  BlizzardApiAuctions,
  DMA_TIMEOUT_TOLERANCE,
  IAuctionsOrder,
  ICommodityOrder,
  IPetList,
  isAuctions,
  ITEM_KEY_GUARD,
  MARKET_TYPE,
  PETS_KEY_GUARD,
  REALM_ENTITY_ANY,
  toGold,
  transformPrice,
  formatBytes,
  IAuctionMessageBase,
} from '@app/resources';
import {
  formatWorkerLog,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
  WorkerStats,
} from '@app/logger';
import { createHash } from 'crypto';
import { isAxiosError } from 'axios';
import { Job } from 'bullmq';

@Injectable()
@Processor(auctionsQueue)
export class AuctionsWorker extends WorkerHost {
  private readonly logger = new Logger(AuctionsWorker.name, {
    timestamp: true,
  });

  private stats: WorkerStats = {
    total: 0,
    success: 0,
    errors: 0,
    rateLimit: 0,
    notModified: 0,
    noData: 0,
    forbidden: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  private readonly HTTP_STATUS_CODES = {
    NOT_MODIFIED: 304,
    FORBIDDEN: 403,
    RATE_LIMITED: 429,
  } as const;

  private readonly rateLimiter: AdaptiveRateLimiter;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly _itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {
    super();
    this.rateLimiter = new AdaptiveRateLimiter(
      {
        initialDelayMs: 100,
        backoffMultiplier: 1.5,
        recoveryDivisor: 1.1,
        successThresholdForRecovery: 5,
        enableJitter: true,
      },
      this.logger,
    );
  }

  async process(job: Job<IAuctionMessageBase>): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    const message = job.data;

    try {
      this.logger.debug({
        logTag: 'handleAuctionMessage',
        message: 'Received auction message',
        data: message,
      });

      this.BNet = new BlizzAPI({
        region: message.region,
        clientId: message.clientId,
        clientSecret: message.clientSecret,
        accessToken: message.accessToken,
      });

      const isCommodity = message.connectedRealmId === REALM_ENTITY_ANY.id;

      const previousTimestamp = isCommodity
        ? message.commoditiesTimestamp
        : message.auctionsTimestamp;

      if (!previousTimestamp) {
        this.logger.error({
          logTag: 'handleAuctionMessage',
          message: `Missing timestamp for ${isCommodity ? 'commodity' : 'auctions'}`,
          connectedRealmId: message.connectedRealmId,
          auctionsTimestamp: message.auctionsTimestamp,
          commoditiesTimestamp: message.commoditiesTimestamp,
        });
        throw new Error(
          `Missing ${isCommodity ? 'commoditiesTimestamp' : 'auctionsTimestamp'} in message`,
        );
      }

      const ifModifiedSince = DateTime.fromMillis(previousTimestamp).toHTTP();
      const getMarketApiEndpoint = isCommodity
        ? '/data/wow/auctions/commodities'
        : `/data/wow/connected-realm/${message.connectedRealmId}/auctions`;

      await this.rateLimiter.wait();

      const marketResponse = await this.BNet.query<BlizzardApiAuctions>(
        getMarketApiEndpoint,
        apiConstParams(
          API_HEADERS_ENUM.DYNAMIC,
          DMA_TIMEOUT_TOLERANCE,
          false,
          ifModifiedSince,
        ),
      );

      const isAuctionsValid = isAuctions(marketResponse);
      if (!isAuctionsValid) {
        this.stats.notModified++;
        const duration = Date.now() - startTime;
        const realmId = message.connectedRealmId;
        this.logger.log(
          formatWorkerLog(
            WorkerLogStatus.NOT_MODIFIED,
            this.stats.total,
            `realm ${realmId}`,
            duration,
            'Not modified',
          ),
        );
        return;
      }

      const connectedRealmId = isCommodity
        ? REALM_ENTITY_ANY.id
        : message.connectedRealmId;

      const timestamp = DateTime.fromRFC2822(marketResponse.lastModified).toMillis();

      const { auctions } = marketResponse;

      const auctionsHash = this.computeAuctionsPayloadHash(auctions);
      const auctionsHashKey = `DMA:AUCTIONS:HASH:${auctionsHash}`;
      const payloadBytes = Buffer.byteLength(JSON.stringify(auctions), 'utf8');

      const previouslyPersistedHash =
        await this.redisService.exists(auctionsHashKey);

      if (previouslyPersistedHash) {
        this.stats.notModified++;
        const duration = Date.now() - startTime;
        this.logger.log(
          formatWorkerLog(
            WorkerLogStatus.NOT_MODIFIED,
            this.stats.total,
            `realm ${connectedRealmId}`,
            duration,
            `Duplicate hash ${auctionsHash} ${formatBytes(payloadBytes)}`,
          ),
        );
        return;
      }

      let iterator = 0;
      let hasPersistedOrders = false;

      if (auctions.length === 0) {
        this.stats.noData++;
        const duration = Date.now() - startTime;
        this.logger.log(
          formatWorkerLog(
            WorkerLogStatus.SKIPPED,
            this.stats.total,
            `realm ${connectedRealmId}`,
            duration,
            'No auctions',
          ),
        );
      } else {
        await lastValueFrom(
          from(auctions).pipe(
            bufferCount(5_000),
            concatMap(async (ordersBatch) => {
              try {
                const ordersBulkAuctions = this.transformOrders(
                  ordersBatch,
                  timestamp,
                  connectedRealmId,
                  isCommodity,
                );

                await this.marketRepository.save(ordersBulkAuctions);

                if (ordersBulkAuctions.length > 0) {
                  hasPersistedOrders = true;
                }

                iterator += ordersBulkAuctions.length;
                this.logger.log({
                  logTag: 'ordersBatch',
                  connectedRealmId,
                  iterator,
                  timestamp,
                });
              } catch (errorOrException) {
                this.logger.error({
                  logTag: 'ordersBatch',
                  error: JSON.stringify(errorOrException),
                });
              }
            }),
          ),
        );
      }

      if (hasPersistedOrders) {
        await this.redisService.set(auctionsHashKey, auctionsHash, 'EX', 86400);
      }

      if (isCommodity) {
        await this.redisService.set(
          `COMMODITY:TS:${timestamp}`,
          timestamp,
          'EX',
          86400,
        );
      }

      const updateQuery: Partial<RealmsEntity> = isCommodity
        ? { commoditiesTimestamp: timestamp }
        : { auctionsTimestamp: timestamp };

      await this.realmsRepository.update(
        { connectedRealmId: connectedRealmId },
        updateQuery,
      );

      const duration = Date.now() - startTime;
      this.stats.success++;
      this.rateLimiter.onSuccess();
      this.logger.log(
        formatWorkerLog(
          WorkerLogStatus.SUCCESS,
          this.stats.total,
          `realm ${connectedRealmId}`,
          duration,
          `${iterator} orders`,
        ),
      );

      if (this.stats.total % 10 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      const duration = Date.now() - startTime;

      if (isAxiosError(errorOrException)) {
        const statusCode = errorOrException.response?.status;

        if (statusCode === this.HTTP_STATUS_CODES.NOT_MODIFIED) {
          this.stats.notModified++;
          this.logger.log(
            formatWorkerLog(
              WorkerLogStatus.NOT_MODIFIED,
              this.stats.total,
              `realm ${message.connectedRealmId}`,
              duration,
              'Not modified',
            ),
          );
          return;
        }

        if (statusCode === this.HTTP_STATUS_CODES.RATE_LIMITED) {
          this.stats.rateLimit++;
          this.rateLimiter.onRateLimit({
            isRateLimited: true,
            statusCode,
            detectionSource: 'status-code',
          });
          this.logger.log(
            formatWorkerLog(
              WorkerLogStatus.RATE_LIMITED,
              this.stats.total,
              `realm ${message.connectedRealmId}`,
              duration,
              'Rate limited',
            ),
          );
          return;
        }

        if (statusCode === this.HTTP_STATUS_CODES.FORBIDDEN) {
          this.stats.forbidden++;
          this.rateLimiter.onRateLimit({
            isRateLimited: true,
            statusCode,
            detectionSource: 'status-code',
          });
          this.logger.log(
            formatWorkerLog(
              WorkerLogStatus.WARNING,
              this.stats.total,
              `realm ${message.connectedRealmId}`,
              duration,
              'Forbidden',
            ),
          );
          return;
        }

        this.stats.errors++;
        this.logger.error(
          formatWorkerErrorLog(
            this.stats.total,
            `realm ${message.connectedRealmId}`,
            duration,
            `HTTP ${statusCode}: ${errorOrException.message}`,
          ),
        );
      } else {
        this.stats.errors++;
        this.logger.error(
          formatWorkerErrorLog(
            this.stats.total,
            `realm ${message.connectedRealmId}`,
            duration,
            errorOrException instanceof Error
              ? errorOrException.message
              : String(errorOrException),
          ),
        );
      }

      throw errorOrException;
    }
  }

  private transformOrders(
    orders: Array<IAuctionsOrder | ICommodityOrder>,
    timestamp: number,
    connectedRealmId: number,
    isCommodity: boolean,
  ): MarketEntity[] {
    return orders
      .map((order) => {
        if (!order.item.id) {
          this.logger.debug(`Skipping order ${order.id} - missing item.id`);
          return null;
        }

        const marketEntity = this.marketRepository.create({
          orderId: `${order.id}`,
          itemId: order.item.id,
          connectedRealmId: connectedRealmId,
          timeLeft: order.time_left,
          timestamp: timestamp,
        });

        const isPetOrder = marketEntity.itemId === 82800;

        const bid = 'bid' in order ? toGold((order as IAuctionsOrder).bid) : null;

        const price = transformPrice(order);
        if (!price) {
          this.logger.debug(`Skipping order ${order.id} - invalid price`);
          return null;
        }

        if (!isCommodity) {
          for (const [path, key] of ITEM_KEY_GUARD.entries()) {
            if (path in order.item) marketEntity[key] = order.item[path];
          }

          if (isPetOrder) {
            const petList: Partial<IPetList> = {};
            for (const [path, key] of PETS_KEY_GUARD.entries()) {
              if (path in order.item) petList[key] = order.item[path];
            }
          }
        }

        const quantity =
          'quantity' in order ? (order as ICommodityOrder).quantity : 1;

        marketEntity.type = isCommodity ? MARKET_TYPE.C : MARKET_TYPE.A;

        if (bid) marketEntity.bid = bid;
        if (price) marketEntity.price = price;
        if (quantity) marketEntity.quantity = quantity;

        const isValue = Boolean(price) && Boolean(quantity);
        if (isValue) marketEntity.value = price * quantity;

        return marketEntity;
      })
      .filter((entity): entity is MarketEntity => entity !== null);
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('AuctionsWorker', this.stats, 'realms'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('AuctionsWorker', this.stats, 'realms'));
  }

  private computeAuctionsPayloadHash(
    auctions: BlizzardApiAuctions['auctions'],
  ): string {
    return createHash('sha1').update(JSON.stringify(auctions)).digest('hex');
  }
}
