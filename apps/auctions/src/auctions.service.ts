import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { dmaConfig } from '@app/configuration';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { LessThan, Not, Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { BlizzAPI } from '@alexzedim/blizzapi';
import Redis from 'ioredis';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  AuctionJobQueue,
  auctionsQueue,
  BlizzardApiWowToken,
  delay,
  getKey,
  getKeys,
  GLOBAL_DMA_KEY,
  isWowToken,
  MARKET_TYPE, REALM_ENTITY_ANY,
  toGold,
  TOLERANCE_ENUM, WOW_TOKEN_ITEM_ID,
} from '@app/resources';

@Injectable()
export class AuctionsService implements OnApplicationBootstrap {
  private BNet: BlizzAPI;
  private readonly logger = new Logger(AuctionsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectQueue(auctionsQueue.name)
    private readonly queue: Queue<AuctionJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexAuctions(GLOBAL_DMA_KEY);
    await this.indexCommodity(GLOBAL_DMA_KEY);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async indexAuctions(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    const logTag = this.indexAuctions.name;
    try {
      const { isIndexAuctions } = dmaConfig;
      this.logger.log(`${logTag}: ${isIndexAuctions}`);
      if (!isIndexAuctions) return;

      await delay(30);
      await this.queue.drain(true);

      const [keyEntity] = await getKeys(this.keysRepository, clearance, true);
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
            await this.queue.add(`${realmEntity.connectedRealmId}`, {
              connectedRealmId: realmEntity.connectedRealmId,
              auctionsTimestamp: realmEntity.auctionsTimestamp,
              region: 'eu',
              clientId: keyEntity.client,
              clientSecret: keyEntity.secret,
              accessToken: keyEntity.token,
              isAssetClassIndex: true,
            }, {
              jobId: `${realmEntity.connectedRealmId}`
            });

            this.logger.debug(
              `realm: ${realmEntity.connectedRealmId} | ts: ${
                realmEntity.auctionsTimestamp
              }, ${typeof realmEntity.auctionsTimestamp}`,
            );
          }),
        ),
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        error: JSON.stringify(errorOrException)
      });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexCommodity(clearance: string = GLOBAL_DMA_KEY) {
    const logTag = this.indexCommodity.name;
    try {
      const { isIndexCommodity } = dmaConfig;
      this.logger.debug(`${logTag}: ${isIndexCommodity}`);
      if (!isIndexCommodity) return;

      const [keyEntity] = await getKeys(this.keysRepository, clearance, true);

      const realmEntity = await this.realmsRepository.findOneBy({
        connectedRealmId: REALM_ENTITY_ANY.id,
      });

      const isCommodityLockExists = Boolean(this.redisService.exists(`COMMODITY:TS:${realmEntity.commoditiesTimestamp}:LOCK`));
      if (isCommodityLockExists) {
        this.logger.debug(`isCommodityLockExists: ${isCommodityLockExists}`);
        return;
      }


      const commodityJob = await this.queue.getJob('COMMODITY');

      if (commodityJob) {
        const isCommodityJobActive = await commodityJob.isActive();
        if (isCommodityJobActive) {
          this.logger.debug(`realm: ${realmEntity.connectedRealmId} | active`);
          return;
        }
      }

      const jobId = `COMMODITY:${realmEntity.commoditiesTimestamp}`;

      await this.queue.add('COMMODITY', {
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
        connectedRealmId: realmEntity.connectedRealmId,
        commoditiesTimestamp: realmEntity.commoditiesTimestamp,
        isAssetClassIndex: true,
      }, {
        jobId: jobId,
        delay: 5_000,
      });
      // lock commodity job
      const lock = await this.redisService.set(jobId, realmEntity.commoditiesTimestamp);

      this.logger.debug(
        `realm: ${realmEntity.connectedRealmId} | ts: ${realmEntity.commoditiesTimestamp} | lock ${lock}`,
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        error: JSON.stringify(errorOrException)
      });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexTokens(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      const key = await getKey(this.keysRepository, clearance);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const response = await this.BNet.query<BlizzardApiWowToken>(
        '/data/wow/token/index',
        apiConstParams(
          API_HEADERS_ENUM.DYNAMIC,
          TOLERANCE_ENUM.DMA,
          false
        ),
      );

      const isWowTokenValid = isWowToken(response);
      if (!isWowTokenValid) {
        this.logger.warn(`Token response not valid`);
        return;
      }

      const { price, lastModified, last_updated_timestamp: timestamp } = response;

      const isWowTokenExists = await this.marketRepository.exist({
        where: {
          timestamp: timestamp,
          itemId: WOW_TOKEN_ITEM_ID,
          connectedRealmId: REALM_ENTITY_ANY.id,
          type: MARKET_TYPE.T,
        },
      });

      if (isWowTokenExists) {
        this.logger.debug(
          `Token exists on timestamp ${timestamp} | ${lastModified}`,
        );
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
      this.logger.warn(`indexTokens ${errorOrException}`);
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

      this.logger.log(
        `Deleted ${deleteResult.affected} rows from 'market' table.`,
      );

      // --- Important: PostgreSQL VACUUM for reclaiming space --- //
      // VACUUM operations can be resource-intensive
      // VACUUM ANALYZE is generally good after deletions.
      // For very large tables, consider auto-vacuum settings or pg_repack.
      await this.marketRepository.query('VACUUM (ANALYZE, VERBOSE) market;');
      this.logger.log('VACUUM ANALYZE completed for "market" table.');
    } catch (error) {
      this.logger.error(
        {
          logTag,
          message: `Error deleting expired market data: ${error.message}`,
          stack: error.stack,
        }
      );
    }
  }
}
