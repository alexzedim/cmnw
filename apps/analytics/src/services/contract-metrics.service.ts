import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import {
  AnalyticsMetricCategory,
  AnalyticsMetricType,
  analyticsMetricExists,
  CONTRACTS_EXCLUDED_ITEM_IDS,
} from '@app/resources';
import {
  ContractTotalMetrics,
  ContractCommoditiesData,
  ContractByConnectedRealm,
  ContractTopByQuantity,
  ContractTopByOpenInterest,
  ContractPriceVolatility,
} from '@app/resources/types';
import { AnalyticsEntity, ContractEntity } from '@app/pg';

@Injectable()
export class ContractMetricsService {
  private readonly logger = new Logger(ContractMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
  ) {}

  async snapshotContractMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'snapshotContractMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      // Calculate 24h threshold
      const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

      // Total metrics
      const totalCount = await this.contractRepository.count({
        where: { timestamp: MoreThan(threshold24h) },
      });

      const totals = await this.getContractTotals(threshold24h);

      const existsTotalMetric = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOTAL,
        snapshotDate,
      });

      if (!existsTotalMetric) {
        const contractTotalMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CONTRACTS,
          metricType: AnalyticsMetricType.TOTAL,
          value: {
            count: totalCount,
            totalQuantity: parseInt(totals?.total_quantity || '0', 10),
            totalOpenInterest: parseFloat(totals?.total_open_interest || '0'),
            uniqueItems: parseInt(totals?.unique_items || '0', 10),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(contractTotalMetric);
        savedCount++;
      }

      // Commodities (connectedRealmId = 1)
      savedCount += await this.snapshotContractByCommodities(snapshotDate, threshold24h);

      // By Connected Realm
      savedCount += await this.snapshotContractByConnectedRealm(snapshotDate, threshold24h);

      // Top items by quantity
      savedCount += await this.snapshotContractTopByQuantity(snapshotDate, threshold24h);

      // Top items by open interest
      savedCount += await this.snapshotContractTopByOpenInterest(snapshotDate, threshold24h);

      // Price volatility
      savedCount += await this.snapshotContractPriceVolatility(snapshotDate, threshold24h);

      const duration = Date.now() - startTime;
      this.logger.log(`Contract metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error snapshotting contract metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async getContractTotals(threshold24h: number): Promise<ContractTotalMetrics | null> {
    return this.contractRepository
      .createQueryBuilder('c')
      .select('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.oi)', 'total_open_interest')
      .addSelect('COUNT(DISTINCT c.item_id)', 'unique_items')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .getRawOne<ContractTotalMetrics>();
  }

  private async snapshotContractByCommodities(snapshotDate: Date, threshold24h: number): Promise<number> {
    // Check if metric exists
    const existsByCommodities = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.BY_COMMODITIES,
      snapshotDate,
    });

    if (existsByCommodities) {
      return 0;
    }

    const commoditiesData = await this.contractRepository
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.oi)', 'total_open_interest')
      .where('c.timestamp > :threshold AND c.connected_realm_id = 1', {
        threshold: threshold24h,
      })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .getRawOne<ContractCommoditiesData>();

    const contractByCommoditiesMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.BY_COMMODITIES,
      value: {
        count: parseInt(commoditiesData?.count || '0', 10),
        totalQuantity: parseInt(commoditiesData?.total_quantity || '0', 10),
        totalOpenInterest: parseFloat(commoditiesData?.total_open_interest || '0'),
      },
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(contractByCommoditiesMetric);
    return 1;
  }

  private async snapshotContractByConnectedRealm(snapshotDate: Date, threshold24h: number): Promise<number> {
    const byConnectedRealm = await this.contractRepository
      .createQueryBuilder('c')
      .select('c.connected_realm_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.oi)', 'total_open_interest')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .andWhere('c.item_id NOT IN (:...excluded)', { excluded: CONTRACTS_EXCLUDED_ITEM_IDS })
      .groupBy('c.connected_realm_id')
      .getRawMany<ContractByConnectedRealm>();

    let savedCount = 0;
    for (const realm of byConnectedRealm) {
      // Check if metric exists
      const existsByConnectedRealm = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
        snapshotDate,
        realmId: realm.connected_realm_id,
      });

      if (!existsByConnectedRealm) {
        const contractByConnectedRealmMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CONTRACTS,
          metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
          realmId: realm.connected_realm_id,
          value: {
            count: parseInt(realm.count, 10),
            totalQuantity: parseInt(realm.total_quantity || '0', 10),
            totalOpenInterest: parseFloat(realm.total_open_interest || '0'),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(contractByConnectedRealmMetric);
        savedCount++;
      }
    }
    return savedCount;
  }

  private async snapshotContractTopByQuantity(snapshotDate: Date, threshold24h: number): Promise<number> {
    // Check if metric exists
    const existsTopByQuantity = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.TOP_BY_QUANTITY,
      snapshotDate,
    });

    if (existsTopByQuantity) {
      return 0;
    }

    const topByQuantity = await this.contractRepository
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

    if (!topByQuantity) {
      return 0;
    }

    const contractTopByQuantityMetric = this.analyticsMetricRepository.create({
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
    });
    await this.analyticsMetricRepository.save(contractTopByQuantityMetric);
    return 1;
  }

  private async snapshotContractTopByOpenInterest(snapshotDate: Date, threshold24h: number): Promise<number> {
    // Check if metric exists
    const existsTopByOpenInterest = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
      snapshotDate,
    });

    if (existsTopByOpenInterest) {
      return 0;
    }

    const topByOpenInterest = await this.contractRepository
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

    if (!topByOpenInterest) {
      return 0;
    }

    const contractTopByOpenInterestMetric = this.analyticsMetricRepository.create({
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
    });
    await this.analyticsMetricRepository.save(contractTopByOpenInterestMetric);
    return 1;
  }

  private async snapshotContractPriceVolatility(snapshotDate: Date, threshold24h: number): Promise<number> {
    // Check if metric exists
    const existsPriceVolatility = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.PRICE_VOLATILITY,
      snapshotDate,
    });

    if (existsPriceVolatility) {
      return 0;
    }

    const volatility = await this.contractRepository
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

    if (!volatility) {
      return 0;
    }

    const contractPriceVolatilityMetric = this.analyticsMetricRepository.create({
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
    });
    await this.analyticsMetricRepository.save(contractPriceVolatilityMetric);
    return 1;
  }
}
