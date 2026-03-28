import Redis from 'ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';

import { bufferCount, concatMap } from 'rxjs/operators';
import { from, lastValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { BattleNetService, BattleNetNamespace, BATTLE_NET_KEY_TAG_DMA, IBattleNetClientConfig } from '@app/battle-net';
import {
  auctionsQueue,
  BlizzardApiAuctions,
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

  private readonly HTTP_STATUS_CODES = {
    NOT_MODIFIED: 304,
  } as const;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly _itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    private readonly battleNetService: BattleNetService,
  ) {
    super();
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

      const isCommodity = message.connectedRealmId === REALM_ENTITY_ANY.id;

      const previousTimestamp = isCommodity ? message.commoditiesTimestamp : message.auctionsTimestamp;

      if (!previousTimestamp) {
        this.logger.error({
          logTag: 'handleAuctionMessage',
          message: `Missing timestamp for ${isCommodity ? 'commodity' : 'auctions'}`,
          connectedRealmId: message.connectedRealmId,
          auctionsTimestamp: message.auctionsTimestamp,
          commoditiesTimestamp: message.commoditiesTimestamp,
        });
        throw new Error(`Missing ${isCommodity ? 'commoditiesTimestamp' : 'auctionsTimestamp'} in message`);
      }

      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_DMA);

      const ifModifiedSince = DateTime.fromMillis(previousTimestamp).toHTTP();
      const getMarketApiEndpoint = isCommodity
        ? '/data/wow/auctions/commodities'
        : `/data/wow/connected-realm/${message.connectedRealmId}/auctions`;

      const marketResponse = await this.battleNetService.query<BlizzardApiAuctions>(
        getMarketApiEndpoint,
        {
          namespace: BattleNetNamespace.DYNAMIC,
          timeout: 60_000,
          headers: { 'If-Modified-Since': ifModifiedSince },
        },
        config,
      );

      const isAuctionsValid = isAuctions(marketResponse);
      if (!isAuctionsValid) {
        this.stats.notModified++;
        const duration = Date.now() - startTime;
        const realmId = message.connectedRealmId;
        this.logger.log(
          formatWorkerLog(WorkerLogStatus.NOT_MODIFIED, this.stats.total, `realm ${realmId}`, duration, 'Not modified'),
        );
        return;
      }

      const connectedRealmId = isCommodity ? REALM_ENTITY_ANY.id : message.connectedRealmId;

      const timestamp = DateTime.fromRFC2822(marketResponse.lastModified).toMillis();

      const { auctions } = marketResponse;

      const auctionsString = JSON.stringify(auctions);
      const payloadBytes = Buffer.byteLength(auctionsString, 'utf8');
      const auctionsHash = this.computeAuctionsPayloadHash(auctionsString);
      const auctionsHashKey = `DMA:AUCTIONS:HASH:${auctionsHash}:${payloadBytes}`;

      const previouslyPersistedHash = await this.redisService.exists(auctionsHashKey);

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
                const ordersBulkAuctions = this.transformOrders(ordersBatch, timestamp, connectedRealmId, isCommodity);

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
        await this.redisService.set(`COMMODITY:TS:${timestamp}`, timestamp, 'EX', 86400);
      }

      const updateQuery: Partial<RealmsEntity> = isCommodity
        ? { commoditiesTimestamp: timestamp }
        : { auctionsTimestamp: timestamp };

      await this.realmsRepository.update({ connectedRealmId: connectedRealmId }, updateQuery);

      const duration = Date.now() - startTime;
      this.stats.success++;
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
            errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
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

        const quantity = 'quantity' in order ? (order as ICommodityOrder).quantity : 1;

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

  private computeAuctionsPayloadHash(auctionsString: string): string {
    return createHash('sha256').update(auctionsString).digest('hex');
  }
}
