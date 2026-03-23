import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { dmaConfig } from '@app/configuration';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { LessThan, Not, Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  API_HEADERS_ENUM,
  AuctionMessageDto,
  auctionsQueue,
  BlizzardApiWowToken,
  IAuctionMessageBase,
  isWowToken,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  toGold,
  WOW_TOKEN_ITEM_ID,
} from '@app/resources';
import { BATTLE_NET_KEY_TAG_DMA } from '@app/battle-net';
import { BlizzardApiService } from '@app/resources/services';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuctionsService implements OnApplicationBootstrap {
  // TODO: Replace with new Blizzard API client implementation
  private readonly logger = new Logger(AuctionsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectQueue(auctionsQueue.name)
    private readonly queue: Queue<IAuctionMessageBase>,
    private readonly blizzardApiService: BlizzardApiService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
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
              region: 'eu',
              isAssetClassIndex: true,
            });

            await this.queue.add(message.name, message.data, message.opts);

            this.logger.debug({
              logTag,
              connectedRealmId: realmEntity.connectedRealmId,
              auctionsTimestamp: realmEntity.auctionsTimestamp,
              timestampType: typeof realmEntity.auctionsTimestamp,
              message: `Processing realm auctions: ${realmEntity.connectedRealmId}`,
            });
          }),
        ),
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
        region: 'eu',
        connectedRealmId: realmEntity.connectedRealmId,
        commoditiesTimestamp: realmEntity.commoditiesTimestamp,
        isAssetClassIndex: true,
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
      // TODO: Reimplement with new Blizzard API client pattern
      this.logger.debug({
        logTag,
        message: 'TODO: Blizzard API call skipped - reimplement with new client',
      });
      /* this.BNet = this.blizzardApiService.createClient({
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
        region: 'eu',
      });

      const response = await this.BNet.query<BlizzardApiWowToken>(
        '/data/wow/token/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC, TOLERANCE_ENUM.DMA, false),
      ); */

      const isWowTokenValid = isWowToken(response);
      if (!isWowTokenValid) {
        this.logger.warn({
          logTag,
          response,
          message: 'Token response not valid',
        });
        return;
      }

      const { price, lastModified, last_updated_timestamp: timestamp } = response;

      const isWowTokenExists = await this.marketRepository.exists({
        where: {
          timestamp: timestamp,
          itemId: WOW_TOKEN_ITEM_ID,
          connectedRealmId: REALM_ENTITY_ANY.id,
          type: MARKET_TYPE.T,
        },
      });

      if (isWowTokenExists) {
        this.logger.debug(`Token exists on timestamp ${timestamp} | ${lastModified}`);
        return;
      }

      const wowTokenEntity = this.marketRepository.create({
        orderId: `${timestamp}`,
        price: toGold(price),
        itemId: WOW_TOKEN_ITEM_ID,
        quantity: 1,
        connectedRealmId: REALM_ENTITY_ANY.id,
        type: MARKET_TYPE.T,
        timestamp,
      });

      await this.marketRepository.save(wowTokenEntity);
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        error: errorOrException,
      });
    }
  }

  // --- TTL Logic --- //
  @Cron(CronExpression.EVERY_12_HOURS)
  async deleteExpiredMarketData(): Promise<void> {
    const logTag = this.deleteExpiredMarketData.name;
    this.logger.log('Starting deletion of expired market data...');

    try {
      // Calculate the cutoff timestamp (24 hours ago from now)
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.setHours(now.getHours() - 24)).getTime();

      // Perform the deletion
      const deleteResult = await this.marketRepository
        .createQueryBuilder()
        .delete()
        .from(MarketEntity)
        .where('timestamp < :cutoff', { cutoff: twentyFourHoursAgo })
        .execute();

      this.logger.log(`Deleted ${deleteResult.affected} rows from 'market' table.`);

      // --- Important: PostgreSQL VACUUM for reclaiming space --- //
      // VACUUM operations can be resource-intensive
      // VACUUM ANALYZE is generally good after deletions.
      // For very large tables, consider auto-vacuum settings or pg_repack.
      await this.marketRepository.query('VACUUM (ANALYZE, VERBOSE) market;');
      this.logger.log('VACUUM ANALYZE completed for "market" table.');
    } catch (error) {
      this.logger.error({
        logTag,
        message: `Error deleting expired market data: ${error.message}`,
        stack: error.stack,
      });
    }
  }
}
