import { AnalyticsEntity, MarketEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType, EXCLUDED_ITEM_IDS, MARKET_TYPE } from '@app/resources';
import { analyticsKeyOf } from '@app/resources/dao';
import type {
  IMarketMetricsAggregates,
  MarketByConnectedRealm,
  MarketRealmAggregateRow,
  MarketTopRow,
} from '@app/resources/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { type DataSource, type EntityManager, type Repository } from 'typeorm';

import { type MetricsCollector, runMetricsCollector } from './collector-runner';

@Injectable()
export class MarketMetricsService {
  private readonly logger = new Logger(MarketMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    _analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(MarketEntity)
    _marketRepository: Repository<MarketEntity>,
  ) {}

  async snapshotMarketMetrics(snapshotDate: Date): Promise<number> {
    const startTime = Date.now();

    // The five collectors below used to run eight separate full scans of
    // market. They now consume aggregates from two shared passes (globals +
    // per-realm via GROUPING SETS, tops via a grouped pass), so the nightly
    // snapshot reads market exactly twice. Per-metric skip logic (existing
    // keys) and per-collector transactions are unchanged.
    const aggregates = await this.loadMarketAggregates(this.marketThreshold24h());

    const collectors: Array<[string, MetricsCollector]> = [
      [
        'marketTotal',
        (manager, rows, existingKeys) => this.collectMarketTotal(manager, rows, existingKeys, snapshotDate, aggregates),
      ],
      [
        'marketByConnectedRealm',
        (manager, rows, existingKeys) =>
          this.collectMarketByConnectedRealm(manager, rows, existingKeys, snapshotDate, aggregates),
      ],
      [
        'marketPriceRanges',
        (manager, rows, existingKeys) =>
          this.collectMarketPriceRanges(manager, rows, existingKeys, snapshotDate, aggregates),
      ],
      [
        'marketTopByVolume',
        (manager, rows, existingKeys) =>
          this.collectMarketTopByVolume(manager, rows, existingKeys, snapshotDate, aggregates),
      ],
      [
        'marketTopByAuctions',
        (manager, rows, existingKeys) =>
          this.collectMarketTopByAuctions(manager, rows, existingKeys, snapshotDate, aggregates),
      ],
    ];

    let savedCount = 0;
    for (const [name, collector] of collectors) {
      savedCount += await runMetricsCollector(this.dataSource, this.logger, name, snapshotDate, collector);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Market metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
    return savedCount;
  }

  private marketThreshold24h(): number {
    return DateTime.now().minus({ hours: 24 }).toMillis();
  }

  /**
   * Pass 1: one scan grouped by GROUPING SETS ((connected_realm_id), ()) — the
   * empty set reproduces the global totals (count / volume / per-type distinct
   * items / price buckets) with the same expressions the old per-metric
   * queries used; the realm set yields the per-realm breakdown.
   * Pass 2: one scan grouped by item_id with two ROW_NUMBER rankings —
   * reproduces top-by-volume and top-by-auctions without two extra scans.
   */
  private async loadMarketAggregates(threshold24h: number): Promise<IMarketMetricsAggregates> {
    const groupedRows = await this.dataSource.query<Array<MarketRealmAggregateRow>>(
      `SELECT grouping(m.connected_realm_id) AS is_total,
              m.connected_realm_id AS realm,
              count(*) AS auctions,
              sum(m.value) AS volume,
              count(DISTINCT CASE WHEN m.type = '${MARKET_TYPE.A}' THEN m.item_id END) AS unique_items_auctions,
              count(DISTINCT CASE WHEN m.type = '${MARKET_TYPE.C}' THEN m.item_id END) AS unique_items_commdty,
              sum(CASE WHEN m.price < 1000 THEN 1 ELSE 0 END) AS under1k,
              sum(CASE WHEN m.price >= 1000 AND m.price < 10000 THEN 1 ELSE 0 END) AS range1k10k,
              sum(CASE WHEN m.price >= 10000 AND m.price < 100000 THEN 1 ELSE 0 END) AS range10k100k,
              sum(CASE WHEN m.price >= 100000 AND m.price < 1000000 THEN 1 ELSE 0 END) AS range100k1m,
              sum(CASE WHEN m.price >= 1000000 THEN 1 ELSE 0 END) AS over1m
       FROM market m
       WHERE (m.valid_to IS NULL OR m.valid_to > $1)
       GROUP BY GROUPING SETS ((m.connected_realm_id), ())`,
      [threshold24h],
    );

    const topRows = await this.dataSource.query<Array<MarketTopRow>>(
      `SELECT t.item_id, t.volume, t.auctions, t.rv, t.ra
       FROM (
         SELECT m.item_id AS item_id,
                sum(m.value) AS volume,
                count(*) AS auctions,
                row_number() OVER (ORDER BY sum(m.value) DESC) AS rv,
                row_number() OVER (ORDER BY count(*) DESC) AS ra
         FROM market m
         WHERE (m.valid_to IS NULL OR m.valid_to > $1) AND m.item_id <> ALL($2::int[])
         GROUP BY m.item_id
       ) t
       WHERE t.rv <= 10 OR t.ra <= 10`,
      [threshold24h, EXCLUDED_ITEM_IDS],
    );

    const global = groupedRows.find((row) => Number(row.is_total) === 1);
    const byConnectedRealm: MarketByConnectedRealm[] = groupedRows
      .filter((row) => Number(row.is_total) === 0)
      .map((row) => ({
        connected_realm_id: row.realm,
        auctions: row.auctions,
        volume: row.volume,
        unique_items_auctions: row.unique_items_auctions,
        unique_items_commdty: row.unique_items_commdty,
      }));

    const topByVolume = topRows.filter((row) => Number(row.rv) <= 10).sort((a, b) => Number(a.rv) - Number(b.rv));
    const topByAuctions = topRows.filter((row) => Number(row.ra) <= 10).sort((a, b) => Number(a.ra) - Number(b.ra));

    return { global, byConnectedRealm, topByVolume, topByAuctions };
  }

  private async collectMarketTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    aggregates: IMarketMetricsAggregates,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.TOTAL);
    if (existingKeys.has(key) || !aggregates.global) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          auctions: parseInt(String(aggregates.global.auctions ?? '0'), 10),
          volume: parseFloat(String(aggregates.global.volume ?? '0')),
          uniqueItemsAuctions: parseInt(String(aggregates.global.unique_items_auctions ?? '0'), 10),
          uniqueItemsCommdty: parseInt(String(aggregates.global.unique_items_commdty ?? '0'), 10),
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
    aggregates: IMarketMetricsAggregates,
  ): Promise<void> {
    for (const realm of aggregates.byConnectedRealm) {
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
            auctions: parseInt(String(realm.auctions ?? '0'), 10),
            volume: parseFloat(String(realm.volume ?? '0')),
            uniqueItemsAuctions: parseInt(String(realm.unique_items_auctions ?? '0'), 10),
            uniqueItemsCommdty: parseInt(String(realm.unique_items_commdty ?? '0'), 10),
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
    aggregates: IMarketMetricsAggregates,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.PRICE_RANGES);
    if (existingKeys.has(key) || !aggregates.global) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.PRICE_RANGES,
        value: {
          under1k: parseInt(String(aggregates.global.under1k ?? '0'), 10),
          '1k-10k': parseInt(String(aggregates.global.range1k10k ?? '0'), 10),
          '10k-100k': parseInt(String(aggregates.global.range10k100k ?? '0'), 10),
          '100k-1m': parseInt(String(aggregates.global.range100k1m ?? '0'), 10),
          over1m: parseInt(String(aggregates.global.over1m ?? '0'), 10),
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
    aggregates: IMarketMetricsAggregates,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.TOP_BY_VOLUME);
    if (existingKeys.has(key)) return;

    const value: Record<string, { itemId: number; volume: number; auctions: number }> = {};
    for (const item of aggregates.topByVolume) {
      value[String(item.item_id)] = {
        itemId: item.item_id,
        volume: parseFloat(String(item.volume ?? '0')),
        auctions: parseInt(String(item.auctions ?? '0'), 10),
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
    aggregates: IMarketMetricsAggregates,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.MARKET, AnalyticsMetricType.TOP_BY_AUCTIONS);
    if (existingKeys.has(key)) return;

    const value: Record<string, { itemId: number; auctions: number }> = {};
    for (const item of aggregates.topByAuctions) {
      value[String(item.item_id)] = {
        itemId: item.item_id,
        auctions: parseInt(String(item.auctions ?? '0'), 10),
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
