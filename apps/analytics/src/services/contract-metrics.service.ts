import { AnalyticsEntity, ContractEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType, CONTRACTS_EXCLUDED_ITEM_IDS } from '@app/resources';
import { analyticsKeyOf } from '@app/resources/dao';
import type {
  ContractByConnectedRealm,
  ContractCommoditiesData,
  ContractPriceVolatility,
  ContractTopByOpenInterest,
  ContractTopByQuantity,
  ContractTotalMetrics,
} from '@app/resources/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { type DataSource, type EntityManager, MoreThan, type Repository } from 'typeorm';

import { type MetricsCollector, runMetricsCollector } from './collector-runner';

@Injectable()
export class ContractMetricsService {
  private readonly logger = new Logger(ContractMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    _analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(ContractEntity)
    _contractRepository: Repository<ContractEntity>,
  ) {}

  async snapshotContractMetrics(snapshotDate: Date): Promise<number> {
    const startTime = Date.now();

    // Every collector commits in its own transaction, so one failing or
    // slow metric cannot roll back or pin the rest of the contract snapshot.
    // The 24h threshold is captured per collector, inside its transaction.
    const threshold24h = () => DateTime.now().minus({ hours: 24 }).toMillis();

    const collectors: Array<[string, MetricsCollector]> = [
      [
        'contractTotal',
        (manager, rows, existingKeys) =>
          this.collectContractTotal(manager, rows, existingKeys, snapshotDate, threshold24h()),
      ],
      [
        'contractByCommodities',
        (manager, rows, existingKeys) =>
          this.collectContractByCommodities(manager, rows, existingKeys, snapshotDate, threshold24h()),
      ],
      [
        'contractByConnectedRealm',
        (manager, rows, existingKeys) =>
          this.collectContractByConnectedRealm(manager, rows, existingKeys, snapshotDate, threshold24h()),
      ],
      [
        'contractTopByQuantity',
        (manager, rows, existingKeys) =>
          this.collectContractTopByQuantity(manager, rows, existingKeys, snapshotDate, threshold24h()),
      ],
      [
        'contractTopByOpenInterest',
        (manager, rows, existingKeys) =>
          this.collectContractTopByOpenInterest(manager, rows, existingKeys, snapshotDate, threshold24h()),
      ],
      [
        'contractPriceVolatility',
        (manager, rows, existingKeys) =>
          this.collectContractPriceVolatility(manager, rows, existingKeys, snapshotDate, threshold24h()),
      ],
    ];

    let savedCount = 0;
    for (const [name, collector] of collectors) {
      savedCount += await runMetricsCollector(this.dataSource, this.logger, name, snapshotDate, collector);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Contract metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
    return savedCount;
  }

  private async collectContractTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CONTRACTS, AnalyticsMetricType.TOTAL);
    if (existingKeys.has(key)) return;

    const contractRepo = manager.getRepository(ContractEntity);
    const totalCount = await contractRepo.count({
      where: { timestamp: MoreThan(threshold24h) },
    });
    const totals = await contractRepo
      .createQueryBuilder('c')
      .select('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.oi)', 'total_open_interest')
      .addSelect('COUNT(DISTINCT c.item_id)', 'unique_items')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .getRawOne<ContractTotalMetrics>();

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          count: totalCount,
          totalQuantity: parseInt(totals?.total_quantity || '0', 10),
          totalOpenInterest: parseFloat(totals?.total_open_interest || '0'),
          uniqueItems: parseInt(totals?.unique_items || '0', 10),
        },
        snapshotDate,
      }),
    );
  }

  private async collectContractByCommodities(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CONTRACTS, AnalyticsMetricType.BY_COMMODITIES);
    if (existingKeys.has(key)) return;

    const commoditiesData = await manager
      .getRepository(ContractEntity)
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.oi)', 'total_open_interest')
      .where('c.timestamp > :threshold AND c.connected_realm_id = 1', {
        threshold: threshold24h,
      })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .getRawOne<ContractCommoditiesData>();

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.BY_COMMODITIES,
        value: {
          count: parseInt(commoditiesData?.count || '0', 10),
          totalQuantity: parseInt(commoditiesData?.total_quantity || '0', 10),
          totalOpenInterest: parseFloat(commoditiesData?.total_open_interest || '0'),
        },
        snapshotDate,
      }),
    );
  }

  private async collectContractByConnectedRealm(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const byConnectedRealm = await manager
      .getRepository(ContractEntity)
      .createQueryBuilder('c')
      .select('c.connected_realm_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.oi)', 'total_open_interest')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .groupBy('c.connected_realm_id')
      .getRawMany<ContractByConnectedRealm>();

    for (const realm of byConnectedRealm) {
      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CONTRACTS,
        AnalyticsMetricType.BY_CONNECTED_REALM,
        realm.connected_realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CONTRACTS,
          metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
          realmId: realm.connected_realm_id,
          value: {
            count: parseInt(realm.count, 10),
            totalQuantity: parseInt(realm.total_quantity || '0', 10),
            totalOpenInterest: parseFloat(realm.total_open_interest || '0'),
          },
          snapshotDate,
        }),
      );
    }
  }

  private async collectContractTopByQuantity(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CONTRACTS, AnalyticsMetricType.TOP_BY_QUANTITY);
    if (existingKeys.has(key)) return;

    const topByQuantity = await manager
      .getRepository(ContractEntity)
      .createQueryBuilder('c')
      .select('c.item_id')
      .addSelect('MAX(c.quantity)', 'max_quantity')
      .addSelect('MIN(c.quantity)', 'min_quantity')
      .addSelect('MAX(c.oi)', 'max_open_interest')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .groupBy('c.item_id')
      .orderBy('max_quantity', 'DESC')
      .limit(1)
      .getRawOne<ContractTopByQuantity>();

    if (!topByQuantity) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOP_BY_QUANTITY,
        value: {
          [String(topByQuantity.item_id)]: {
            itemId: topByQuantity.item_id,
            maxQuantity: parseInt(topByQuantity.max_quantity || '0', 10),
            minQuantity: parseInt(topByQuantity.min_quantity || '0', 10),
            maxOpenInterest: parseFloat(topByQuantity.max_open_interest || '0'),
          },
        },
        snapshotDate,
      }),
    );
  }

  private async collectContractTopByOpenInterest(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CONTRACTS, AnalyticsMetricType.TOP_BY_OPEN_INTEREST);
    if (existingKeys.has(key)) return;

    const topByOpenInterest = await manager
      .getRepository(ContractEntity)
      .createQueryBuilder('c')
      .select('c.item_id')
      .addSelect('MAX(c.oi)', 'max_open_interest')
      .addSelect('MIN(c.oi)', 'min_open_interest')
      .addSelect('MAX(c.quantity)', 'max_quantity')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .groupBy('c.item_id')
      .orderBy('max_open_interest', 'DESC')
      .limit(1)
      .getRawOne<ContractTopByOpenInterest>();

    if (!topByOpenInterest) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
        value: {
          [String(topByOpenInterest.item_id)]: {
            itemId: topByOpenInterest.item_id,
            maxOpenInterest: parseFloat(topByOpenInterest.max_open_interest || '0'),
            minOpenInterest: parseFloat(topByOpenInterest.min_open_interest || '0'),
            maxQuantity: parseInt(topByOpenInterest.max_quantity || '0', 10),
          },
        },
        snapshotDate,
      }),
    );
  }

  private async collectContractPriceVolatility(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CONTRACTS, AnalyticsMetricType.PRICE_VOLATILITY);
    if (existingKeys.has(key)) return;

    const volatility = await manager
      .getRepository(ContractEntity)
      .createQueryBuilder('c')
      .select('c.item_id')
      .addSelect('STDDEV(c.price)', 'std_dev')
      .addSelect('AVG(c.price)', 'avg_price')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .groupBy('c.item_id')
      .having('COUNT(*) > :count', { count: 10 })
      .orderBy('std_dev', 'DESC')
      .limit(1)
      .getRawOne<ContractPriceVolatility>();

    if (!volatility) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.PRICE_VOLATILITY,
        value: {
          [String(volatility.item_id)]: {
            itemId: volatility.item_id,
            stdDev: parseFloat(volatility.std_dev || '0'),
            avgPrice: parseFloat(volatility.avg_price || '0'),
          },
        },
        snapshotDate,
      }),
    );
  }
}
