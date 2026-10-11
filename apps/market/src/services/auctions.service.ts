import { BATTLE_NET_KEY_TAG_DMA, BattleNetNamespace, BattleNetService } from '@app/battle-net';
import { dmaConfig, marketConfig } from '@app/configuration';
import { MarketEntity, MarketSnapshotsEntity, RealmsEntity } from '@app/pg';
import {
  AuctionMessageDto,
  auctionsQueue,
  type BlizzardApiWowToken,
  computeMarketRowAttrHash,
  type IAuctionMessageBase,
  isWowToken,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  toGold,
  WOW_TOKEN_ITEM_ID,
} from '@app/resources';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { LessThan, Not, type Repository } from 'typeorm';

@Injectable()
export class AuctionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuctionsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(MarketSnapshotsEntity)
    private readonly marketSnapshotsRepository: Repository<MarketSnapshotsEntity>,
    @InjectQueue(auctionsQueue.name)
    private readonly queue: Queue<IAuctionMessageBase>,
    private readonly battleNetService: BattleNetService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_DMA);
    await this.indexAuctions();
    await this.indexCommodity();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async indexAuctions(): Promise<void> {
    const logTag = this.indexAuctions.name;
    try {
      const { isIndexAuctions } = dmaConfig;
      this.logger.debug({
        logTag,
        isIndexAuctions,
        message: `Index auctions enabled: ${isIndexAuctions}`,
      });
      if (!isIndexAuctions) return;

      await this.queue.drain(true);

      const offsetTime = DateTime.now().minus({ minutes: 30 }).toMillis();

      const realmsEntity = await this.realmsRepository
        .createQueryBuilder('realms')
        .where({ auctionsTimestamp: LessThan(offsetTime) })
        .andWhere({ connectedRealmId: Not(REALM_ENTITY_ANY.connectedRealmId) })
        .distinctOn(['realms.connectedRealmId'])
        .getMany();

      await lastValueFrom(
        from(realmsEntity).pipe(
          mergeMap(async (realmEntity) => {
            const message = AuctionMessageDto.create({
              connectedRealmId: realmEntity.connectedRealmId,
              auctionsTimestamp: realmEntity.auctionsTimestamp,
            });

            await this.queue.add(message.name, message.data, message.opts);

            this.logger.verbose({
              logTag,
              connectedRealmId: realmEntity.connectedRealmId,
              auctionsTimestamp: realmEntity.auctionsTimestamp,
              timestampType: typeof realmEntity.auctionsTimestamp,
              message: `Processing realm auctions: ${realmEntity.connectedRealmId}`,
            });
          }),
        ),
        { defaultValue: undefined },
      );
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexCommodity() {
    const logTag = this.indexCommodity.name;
    try {
      const { isIndexCommodity } = dmaConfig;
      this.logger.debug({
        logTag,
        isIndexCommodity,
        message: `Index commodity enabled: ${isIndexCommodity}`,
      });
      if (!isIndexCommodity) return;

      const realmEntity = await this.realmsRepository.findOneBy({
        connectedRealmId: REALM_ENTITY_ANY.id,
      });

      const message = AuctionMessageDto.create({
        connectedRealmId: realmEntity.connectedRealmId,
        commoditiesTimestamp: realmEntity.commoditiesTimestamp,
      });

      await this.queue.add(message.name, message.data, message.opts);

      this.logger.debug({
        logTag,
        connectedRealmId: realmEntity.connectedRealmId,
        commoditiesTimestamp: realmEntity.commoditiesTimestamp,
        message: 'Processing commodity data',
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexTokens(): Promise<void> {
    const logTag = this.indexTokens.name;
    try {
      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_DMA);
      const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, 60_000);
      const response = await this.battleNetService.query<BlizzardApiWowToken>('/data/wow/token/index', options, config);

      const isWowTokenValid = isWowToken(response);
      if (!isWowTokenValid) {
        this.logger.warn({
          logTag,
          response,
          message: 'Token response not valid',
        });
        return;
      }

      const { price, last_updated_timestamp: timestamp } = response;

      const isWowTokenExists = await this.marketRepository.exists({
        where: {
          validFrom: timestamp,
          itemId: WOW_TOKEN_ITEM_ID,
          connectedRealmId: REALM_ENTITY_ANY.id,
          type: MARKET_TYPE.T,
        },
      });

      if (isWowTokenExists) {
        this.logger.verbose(`Token exists on timestamp ${timestamp}`);
        return;
      }

      const wowTokenEntity = this.marketRepository.create({
        orderId: `${timestamp}`,
        price: toGold(price),
        itemId: WOW_TOKEN_ITEM_ID,
        quantity: 1,
        connectedRealmId: REALM_ENTITY_ANY.id,
        type: MARKET_TYPE.T,
        validFrom: timestamp,
        validTo: timestamp,
      });

      wowTokenEntity.attrHash = computeMarketRowAttrHash(wowTokenEntity);

      await this.marketRepository.insert(wowTokenEntity);

      await this.marketSnapshotsRepository
        .createQueryBuilder()
        .insert()
        .into(MarketSnapshotsEntity)
        .values({ connectedRealmId: REALM_ENTITY_ANY.id, timestamp, source: MARKET_TYPE.T })
        .orIgnore()
        .execute();
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        error: errorOrException,
      });
    }
  }

  // --- TTL Logic --- //
  // Batched deletes of fully-ended rows only; autovacuum reclaims space on
  // its own, no manual VACUUM passes.
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredMarketData(): Promise<void> {
    const logTag = this.deleteExpiredMarketData.name;
    this.logger.log('Starting deletion of expired market data...');

    try {
      const cutoff = Date.now() - marketConfig.retentionHours * 3_600_000;

      let deletedTotal = 0;
      let deletedInBatch = 0;

      do {
        const result = await this.marketRepository.query(
          `WITH expired AS (
             SELECT connected_realm_id, order_id, type, valid_from FROM market
             WHERE valid_to IS NOT NULL AND valid_to < $1
             LIMIT $2
           )
           DELETE FROM market m
           USING expired e
           WHERE m.connected_realm_id = e.connected_realm_id
             AND m.order_id = e.order_id
             AND m.type = e.type
             AND m.valid_from = e.valid_from`,
          [cutoff, marketConfig.ttlBatchSize],
        );

        deletedInBatch = result.rowCount ?? 0;
        deletedTotal += deletedInBatch;
      } while (deletedInBatch >= marketConfig.ttlBatchSize);

      const snapshotsResult = await this.marketSnapshotsRepository.delete({
        timestamp: LessThan(cutoff),
      });

      this.logger.log(
        `Deleted ${deletedTotal} ended rows and ${snapshotsResult.affected ?? 0} snapshot markers older than ${marketConfig.retentionHours}h.`,
      );
    } catch (error) {
      this.logger.error({
        logTag,
        message: `Error deleting expired market data: ${error.message}`,
        stack: error.stack,
      });
    }
  }
}
