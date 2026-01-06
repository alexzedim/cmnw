import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import { AnalyticsMetricCategory, AnalyticsMetricType, MARKET_TYPE } from '@app/resources';
import { analyticsMetricExists } from '@app/resources/dao';
import {
  MarketTotalMetrics,
  MarketAggregateCount,
  MarketByConnectedRealm,
  MarketByFaction,
  MarketPriceRanges,
  MarketTopByVolume,
  MarketTopByAuctions,
} from '@app/resources/types';
import { AnalyticsEntity, MarketEntity } from '@app/pg';

@Injectable()
export class MarketMetricsService {
  private readonly logger = new Logger(MarketMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {}

  private metricExists(
    category: AnalyticsMetricCategory,
    metricType: AnalyticsMetricType,
    snapshotDate: Date,
    realmId?: number | null,
  ): Promise<boolean> {
    return analyticsMetricExists(this.analyticsMetricRepository, {
      category,
      metricType,
      snapshotDate,
      realmId: realmId ?? undefined,
    });
  }

  async computeMarketMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeMarketMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      // Calculate 24h threshold
      const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

      // Total metrics (last 24h)
      const totalCount = await this.marketRepository.count({
        where: { timestamp: MoreThan(threshold24h) },
      });

      const totalVolume = await this.marketRepository
        .createQueryBuilder('m')
        .select('SUM(m.value)', 'sum')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<MarketTotalMetrics>();

      // Count unique items by market type
      const uniqueItemsAuctions = await this.marketRepository
        .createQueryBuilder('m')
        .select('COUNT(DISTINCT m.item_id)', 'count')
        .where('m.timestamp > :threshold AND m.type = :type', {
          threshold: threshold24h,
          type: MARKET_TYPE.A,
        })
        .getRawOne<MarketAggregateCount>();

      const uniqueItemsCommdty = await this.marketRepository
        .createQueryBuilder('m')
        .select('COUNT(DISTINCT m.item_id)', 'count')
        .where('m.timestamp > :threshold AND m.type = :type', {
          threshold: threshold24h,
          type: MARKET_TYPE.C,
        })
        .getRawOne<MarketAggregateCount>();

      // Check if total metric exists
      const isTotalExists = await this.metricExists(
        AnalyticsMetricCategory.MARKET,
        AnalyticsMetricType.TOTAL,
        snapshotDate,
      );

      if (!isTotalExists) {
        const marketTotalMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.MARKET,
          metricType: AnalyticsMetricType.TOTAL,
          value: {
            auctions: totalCount,
            volume: parseFloat(totalVolume?.sum || '0'),
            uniqueItemsAuctions: parseInt(
              uniqueItemsAuctions?.count || '0',
              10,
            ),
            uniqueItemsCommdty: parseInt(uniqueItemsCommdty?.count || '0', 10),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(marketTotalMetric);
        savedCount++;
      }

      // By Connected Realm
      savedCount += await this.computeMarketByConnectedRealm(
        snapshotDate,
        threshold24h,
      );

      // By Faction (global)
      savedCount += await this.computeMarketByFaction(
        snapshotDate,
        threshold24h,
      );

      // Price ranges
      savedCount += await this.computeMarketPriceRanges(
        snapshotDate,
        threshold24h,
      );

      // Top items by volume
      savedCount += await this.computeMarketTopByVolume(
        snapshotDate,
        threshold24h,
      );

      // Top items by auction count
      savedCount += await this.computeMarketTopByAuctions(
        snapshotDate,
        threshold24h,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Market metrics computed - metricsCount: ${savedCount}, durationMs: ${duration}`,
      );
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing market metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async computeMarketByConnectedRealm(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    const byConnectedRealm = await this.marketRepository
      .createQueryBuilder('m')
      .select('m.connected_realm_id')
      .addSelect('COUNT(*)', 'auctions')
      .addSelect('SUM(m.value)', 'volume')
      .addSelect(
        'COUNT(DISTINCT CASE WHEN m.type = :auctionsType THEN m.item_id END)',
        'unique_items_auctions',
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN m.type = :commdtyType THEN m.item_id END)',
        'unique_items_commdty',
      )
      .where('m.timestamp > :threshold', {
        threshold: threshold24h,
        auctionsType: 'AUCTIONS',
        commdtyType: 'COMMDTY',
      })
      .groupBy('m.connected_realm_id')
      .getRawMany<MarketByConnectedRealm>();

    let savedCount = 0;
    for (const realm of byConnectedRealm) {
      // Check if metric exists
      const isByConnectedRealmExists = await this.metricExists(
        AnalyticsMetricCategory.MARKET,
        AnalyticsMetricType.BY_CONNECTED_REALM,
        snapshotDate,
        realm.connected_realm_id,
      );

      if (!isByConnectedRealmExists) {
        const marketByConnectedRealmMetric =
          this.analyticsMetricRepository.create({
            category: AnalyticsMetricCategory.MARKET,
            metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
            realmId: realm.connected_realm_id,
            value: {
              auctions: parseInt(realm.auctions, 10),
              volume: parseFloat(realm.volume || '0'),
              uniqueItemsAuctions: parseInt(
                realm.unique_items_auctions || '0',
                10,
              ),
              uniqueItemsCommdty: parseInt(
                realm.unique_items_commdty || '0',
                10,
              ),
            },
            snapshotDate,
          });
        await this.analyticsMetricRepository.save(marketByConnectedRealmMetric);
        savedCount++;
      }
    }
    return savedCount;
  }

  private async computeMarketByFaction(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const isByFactionExists = await this.metricExists(
      AnalyticsMetricCategory.MARKET,
      AnalyticsMetricType.BY_FACTION,
      snapshotDate,
    );

    if (isByFactionExists) {
      return 0;
    }

    const byFaction = await this.marketRepository
      .createQueryBuilder('m')
      .select('m.faction', 'faction')
      .addSelect('COUNT(*)', 'auctions')
      .addSelect('SUM(m.value)', 'volume')
      .where('m.timestamp > :threshold AND m.faction IS NOT NULL', {
        threshold: threshold24h,
      })
      .groupBy('m.faction')
      .getRawMany<MarketByFaction>();

    const factionMap = byFaction.reduce(
      (acc, row) => {
        acc[row.faction] = {
          auctions: parseInt(row.auctions, 10),
          volume: parseFloat(row.volume || '0'),
        };
        return acc;
      },
      {} as Record<string, { auctions: number; volume: number }>,
    );

    const marketByFactionMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.MARKET,
      metricType: AnalyticsMetricType.BY_FACTION,
      value: factionMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(marketByFactionMetric);
    return 1;
  }

  private async computeMarketPriceRanges(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const isPriceRangesExists = await this.metricExists(
      AnalyticsMetricCategory.MARKET,
      AnalyticsMetricType.PRICE_RANGES,
      snapshotDate,
    );

    if (isPriceRangesExists) {
      return 0;
    }

    const priceRanges = await this.marketRepository
      .createQueryBuilder('m')
      .select(`SUM(CASE WHEN m.price < 1000 THEN 1 ELSE 0 END)`, 'under1k')
      .addSelect(
        `SUM(CASE WHEN m.price >= 1000 AND m.price < 10000 THEN 1 ELSE 0 END)`,
        'range1k10k',
      )
      .addSelect(
        `SUM(CASE WHEN m.price >= 10000 AND m.price < 100000 THEN 1 ELSE 0 END)`,
        'range10k100k',
      )
      .addSelect(
        `SUM(CASE WHEN m.price >= 100000 AND m.price < 1000000 THEN 1 ELSE 0 END)`,
        'range100k1m',
      )
      .addSelect(
        `SUM(CASE WHEN m.price >= 1000000 THEN 1 ELSE 0 END)`,
        'over1m',
      )
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .getRawOne<MarketPriceRanges>();

    const marketPriceRangesMetric = this.analyticsMetricRepository.create({
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
    });
    await this.analyticsMetricRepository.save(marketPriceRangesMetric);
    return 1;
  }

  private async computeMarketTopByVolume(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const isTopByVolumeExists = await this.metricExists(
      AnalyticsMetricCategory.MARKET,
      AnalyticsMetricType.TOP_BY_VOLUME,
      snapshotDate,
    );

    if (isTopByVolumeExists) {
      return 0;
    }

    const topByVolume = await this.marketRepository
      .createQueryBuilder('m')
      .select('m.item_id')
      .addSelect('SUM(m.value)', 'volume')
      .addSelect('COUNT(*)', 'auctions')
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .groupBy('m.item_id')
      .orderBy('volume', 'DESC')
      .limit(10)
      .getRawMany<MarketTopByVolume>();

    const marketTopByVolumeMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.MARKET,
      metricType: AnalyticsMetricType.TOP_BY_VOLUME,
      value: topByVolume.map((item) => ({
        itemId: item.item_id,
        volume: parseFloat(item.volume),
        auctions: parseInt(item.auctions, 10),
      })),
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(marketTopByVolumeMetric);
    return 1;
  }

  private async computeMarketTopByAuctions(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const isTopByAuctionsExists = await this.metricExists(
      AnalyticsMetricCategory.MARKET,
      AnalyticsMetricType.TOP_BY_AUCTIONS,
      snapshotDate,
    );

    if (isTopByAuctionsExists) {
      return 0;
    }

    const topByAuctions = await this.marketRepository
      .createQueryBuilder('m')
      .select('m.item_id')
      .addSelect('COUNT(*)', 'auctions')
      .where('m.timestamp > :threshold', { threshold: threshold24h })
      .groupBy('m.item_id')
      .orderBy('auctions', 'DESC')
      .limit(10)
      .getRawMany<MarketTopByAuctions>();

    const marketTopByAuctionsMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.MARKET,
      metricType: AnalyticsMetricType.TOP_BY_AUCTIONS,
      value: topByAuctions.map((item) => ({
        itemId: item.item_id,
        auctions: parseInt(item.auctions, 10),
      })),
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(marketTopByAuctionsMetric);
    return 1;
  }
}
