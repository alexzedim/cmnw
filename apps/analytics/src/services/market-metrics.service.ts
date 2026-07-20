import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { AnalyticsMetricCategory, AnalyticsMetricType, EXCLUDED_ITEM_IDS, MARKET_TYPE } from '@app/resources';
import { analyticsKeyOf, findExistingAnalyticsKeys } from '@app/resources/dao';
import {
  MarketAggregateCount,
  MarketByConnectedRealm,
  MarketPriceRanges,
  MarketTopByAuctions,
  MarketTopByVolume,
  MarketTotalMetrics,
} from '@app/resources/types';
import { AnalyticsEntity, MarketEntity } from '@app/pg';

@Injectable()
export class MarketMetricsService {
  private readonly logger = new Logger(MarketMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {}

  async snapshotMarketMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'snapshotMarketMetrics';
    const startTime = Date.now();

    try {
      const savedCount = await this.dataSource.transaction(async (manager) => {
        const existingKeys = await findExistingAnalyticsKeys(manager, snapshotDate);
        const rows: AnalyticsEntity[] = [];
        const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

        await this.collectMarketTotal(manager, rows, existingKeys, snapshotDate, threshold24h);
        await this.collectMarketByConnectedRealm(manager, rows, existingKeys, snapshotDate, threshold24h);
        await this.collectMarketPriceRanges(manager, rows, existingKeys, snapshotDate, threshold24h);
        await this.collectMarketTopByVolume(manager, rows, existingKeys, snapshotDate, threshold24h);
        await this.collectMarketTopByAuctions(manager, rows, existingKeys, snapshotDate, threshold24h);

        if (rows.length > 0) {
          await manager.save(AnalyticsEntity, rows);
        }
        return rows.length;
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Market metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
      return savedCount;
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error snapshotting market metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }
  }

  private async collectMarketTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.TOTAL);
    if (existingKeys.has(key)) return;

    const marketRepo = manager.getRepository(MarketEntity);
    const totalCount = await marketRepo.count({
      where: { timestamp: MoreThan(threshold24h) },
    });
    const totalVolume = await marketRepo
      .createQueryBuilder('m')
      .select('SUM(m.value)', 'sum')
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .getRawOne<MarketTotalMetrics>();
    const uniqueItemsAuctions = await marketRepo
      .createQueryBuilder('m')
      .select('COUNT(DISTINCT m.item_id)', 'count')
      .where('m.timestamp > :threshold AND m.type = :type', {
        threshold: threshold24h,
        type: MARKET_TYPE.A,
      })
      .getRawOne<MarketAggregateCount>();
    const uniqueItemsCommdty = await marketRepo
      .createQueryBuilder('m')
      .select('COUNT(DISTINCT m.item_id)', 'count')
      .where('m.timestamp > :threshold AND m.type = :type', {
        threshold: threshold24h,
        type: MARKET_TYPE.C,
      })
      .getRawOne<MarketAggregateCount>();

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          auctions: totalCount,
          volume: parseFloat(totalVolume?.sum || '0'),
          uniqueItemsAuctions: parseInt(uniqueItemsAuctions?.count || '0', 10),
          uniqueItemsCommdty: parseInt(uniqueItemsCommdty?.count || '0', 10),
        },
        snapshotDate,
      }),
    );
  }

  private async collectMarketByConnectedRealm(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const byConnectedRealm = await manager
      .getRepository(MarketEntity)
      .createQueryBuilder('m')
      .select('m.connected_realm_id')
      .addSelect('COUNT(*)', 'auctions')
      .addSelect('SUM(m.value)', 'volume')
      .addSelect('COUNT(DISTINCT CASE WHEN m.type = :auctionsType THEN m.item_id END)', 'unique_items_auctions')
      .addSelect('COUNT(DISTINCT CASE WHEN m.type = :commdtyType THEN m.item_id END)', 'unique_items_commdty')
      .where('m.timestamp > :threshold', {
        threshold: threshold24h,
        auctionsType: MARKET_TYPE.A,
        commdtyType: MARKET_TYPE.C,
      })
      .groupBy('m.connected_realm_id')
      .getRawMany<MarketByConnectedRealm>();

    for (const realm of byConnectedRealm) {
      const key = analyticsKeyOf(
        AnalyticsMetricCategory.MARKET,
        AnalyticsMetricType.BY_CONNECTED_REALM,
        realm.connected_realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.MARKET,
          metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
          realmId: realm.connected_realm_id,
          value: {
            auctions: parseInt(realm.auctions, 10),
            volume: parseFloat(realm.volume || '0'),
            uniqueItemsAuctions: parseInt(realm.unique_items_auctions || '0', 10),
            uniqueItemsCommdty: parseInt(realm.unique_items_commdty || '0', 10),
          },
          snapshotDate,
        }),
      );
    }
  }

  private async collectMarketPriceRanges(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.PRICE_RANGES);
    if (existingKeys.has(key)) return;

    const priceRanges = await manager
      .getRepository(MarketEntity)
      .createQueryBuilder('m')
      .select(`SUM(CASE WHEN m.price < 1000 THEN 1 ELSE 0 END)`, 'under1k')
      .addSelect(`SUM(CASE WHEN m.price >= 1000 AND m.price < 10000 THEN 1 ELSE 0 END)`, 'range1k10k')
      .addSelect(`SUM(CASE WHEN m.price >= 10000 AND m.price < 100000 THEN 1 ELSE 0 END)`, 'range10k100k')
      .addSelect(`SUM(CASE WHEN m.price >= 100000 AND m.price < 1000000 THEN 1 ELSE 0 END)`, 'range100k1m')
      .addSelect(`SUM(CASE WHEN m.price >= 1000000 THEN 1 ELSE 0 END)`, 'over1m')
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .getRawOne<MarketPriceRanges>();

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.PRICE_RANGES,
        value: {
          under1k: parseInt(priceRanges?.under1k || '0', 10),
          '1k-10k': parseInt(priceRanges?.range1k10k || '0', 10),
          '10k-100k': parseInt(priceRanges?.range10k100k || '0', 10),
          '100k-1m': parseInt(priceRanges?.range100k1m || '0', 10),
          over1m: parseInt(priceRanges?.over1m || '0', 10),
        },
        snapshotDate,
      }),
    );
  }

  private async collectMarketTopByVolume(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.TOP_BY_VOLUME);
    if (existingKeys.has(key)) return;

    const topByVolume = await manager
      .getRepository(MarketEntity)
      .createQueryBuilder('m')
      .select('m.item_id')
      .addSelect('SUM(m.value)', 'volume')
      .addSelect('COUNT(*)', 'auctions')
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('m.item_id NOT IN (:...excludedIds)', { excludedIds: EXCLUDED_ITEM_IDS })
      .groupBy('m.item_id')
      .orderBy('volume', 'DESC')
      .limit(10)
      .getRawMany<MarketTopByVolume>();

    const value: Record<string, { itemId: number; volume: number; auctions: number }> = {};
    for (const item of topByVolume) {
      value[String(item.item_id)] = {
        itemId: item.item_id,
        volume: parseFloat(item.volume),
        auctions: parseInt(item.auctions, 10),
      };
    }

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOP_BY_VOLUME,
        value,
        snapshotDate,
      }),
    );
  }

  private async collectMarketTopByAuctions(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.TOP_BY_AUCTIONS);
    if (existingKeys.has(key)) return;

    const topByAuctions = await manager
      .getRepository(MarketEntity)
      .createQueryBuilder('m')
      .select('m.item_id')
      .addSelect('COUNT(*)', 'auctions')
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('m.item_id NOT IN (:...excludedIds)', { excludedIds: EXCLUDED_ITEM_IDS })
      .groupBy('m.item_id')
      .orderBy('auctions', 'DESC')
      .limit(10)
      .getRawMany<MarketTopByAuctions>();

    const value: Record<string, { itemId: number; auctions: number }> = {};
    for (const item of topByAuctions) {
      value[String(item.item_id)] = {
        itemId: item.item_id,
        auctions: parseInt(item.auctions, 10),
      };
    }

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOP_BY_AUCTIONS,
        value,
        snapshotDate,
      }),
    );
  }
}
