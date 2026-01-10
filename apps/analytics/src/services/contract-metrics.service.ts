import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import { AnalyticsMetricCategory, AnalyticsMetricType, analyticsMetricExists } from '@app/resources';
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

  async computeContractMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeContractMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      // Calculate 24h threshold
      const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

      // Total metrics
      const totalCount = await this.contractRepository.count({
        where: { timestamp: MoreThan(threshold24h) },
      });

      const totals = await this.contractRepository
        .createQueryBuilder('c')
        .select('SUM(c.quantity)', 'total_quantity')
        .addSelect('SUM(c.oi)', 'total_open_interest')
        .addSelect('COUNT(DISTINCT c.item_id)', 'unique_items')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<ContractTotalMetrics>();

      const existsTotalMetric = await this.metricExists(
        AnalyticsMetricCategory.CONTRACTS,
        AnalyticsMetricType.TOTAL,
        snapshotDate,
      );

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
      savedCount += await this.computeContractByCommodities(
        snapshotDate,
        threshold24h,
      );

      // By Connected Realm
      savedCount += await this.computeContractByConnectedRealm(
        snapshotDate,
        threshold24h,
      );

      // Top items by quantity
      savedCount += await this.computeContractTopByQuantity(
        snapshotDate,
        threshold24h,
      );

      // Top items by open interest
      savedCount += await this.computeContractTopByOpenInterest(
        snapshotDate,
        threshold24h,
      );

      // Price volatility
      savedCount += await this.computeContractPriceVolatility(
        snapshotDate,
        threshold24h,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Contract metrics computed - metricsCount: ${savedCount}, durationMs: ${duration}`,
      );
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing contract metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async computeContractByCommodities(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const existsByCommodities = await this.metricExists(
      AnalyticsMetricCategory.CONTRACTS,
      AnalyticsMetricType.BY_COMMODITIES,
      snapshotDate,
    );

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
      .getRawOne<ContractCommoditiesData>();

    const contractByCommoditiesMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.BY_COMMODITIES,
      value: {
        count: parseInt(commoditiesData?.count || '0', 10),
        totalQuantity: parseInt(commoditiesData?.total_quantity || '0', 10),
        totalOpenInterest: parseFloat(
          commoditiesData?.total_open_interest || '0',
        ),
      },
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(contractByCommoditiesMetric);
    return 1;
  }

  private async computeContractByConnectedRealm(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    const byConnectedRealm = await this.contractRepository
      .createQueryBuilder('c')
      .select('c.connected_realm_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(c.quantity)', 'total_quantity')
      .addSelect('SUM(c.openInterest)', 'total_open_interest')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .groupBy('c.connected_realm_id')
      .getRawMany<ContractByConnectedRealm>();

    let savedCount = 0;
    for (const realm of byConnectedRealm) {
      // Check if metric exists
      const existsByConnectedRealm = await this.metricExists(
        AnalyticsMetricCategory.CONTRACTS,
        AnalyticsMetricType.BY_CONNECTED_REALM,
        snapshotDate,
        realm.connected_realm_id,
      );

      if (!existsByConnectedRealm) {
        const contractByConnectedRealmMetric =
          this.analyticsMetricRepository.create({
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
        await this.analyticsMetricRepository.save(
          contractByConnectedRealmMetric,
        );
        savedCount++;
      }
    }
    return savedCount;
  }

  private async computeContractTopByQuantity(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const existsTopByQuantity = await this.metricExists(
      AnalyticsMetricCategory.CONTRACTS,
      AnalyticsMetricType.TOP_BY_QUANTITY,
      snapshotDate,
    );

    if (existsTopByQuantity) {
      return 0;
    }

    const topByQuantity = await this.contractRepository
      .createQueryBuilder('c')
      .select('c.item_id')
      .addSelect('SUM(c.quantity)', 'quantity')
      .addSelect('SUM(c.oi)', 'open_interest')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .groupBy('c.item_id')
      .orderBy('quantity', 'DESC')
      .limit(1)
      .getRawOne<ContractTopByQuantity>();

    if (!topByQuantity) {
      return 0;
    }

    const contractTopByQuantityMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CONTRACTS,
      metricType: AnalyticsMetricType.TOP_BY_QUANTITY,
      value: {
        itemId: topByQuantity.item_id,
        quantity: parseInt(topByQuantity.quantity || '0', 10),
        openInterest: parseFloat(topByQuantity.open_interest || '0'),
      },
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(contractTopByQuantityMetric);
    return 1;
  }

  private async computeContractTopByOpenInterest(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const existsTopByOpenInterest = await this.metricExists(
      AnalyticsMetricCategory.CONTRACTS,
      AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
      snapshotDate,
    );

    if (existsTopByOpenInterest) {
      return 0;
    }

    const topByOpenInterest = await this.contractRepository
      .createQueryBuilder('c')
      .select('c.item_id')
      .addSelect('SUM(c.oi)', 'open_interest')
      .addSelect('SUM(c.quantity)', 'quantity')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .groupBy('c.item_id')
      .orderBy('open_interest', 'DESC')
      .limit(1)
      .getRawOne<ContractTopByOpenInterest>();

    if (!topByOpenInterest) {
      return 0;
    }

    const contractTopByOpenInterestMetric =
      this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
        value: {
          itemId: topByOpenInterest.item_id,
          openInterest: parseFloat(topByOpenInterest.open_interest || '0'),
          quantity: parseInt(topByOpenInterest.quantity || '0', 10),
        },
        snapshotDate,
      });
    await this.analyticsMetricRepository.save(contractTopByOpenInterestMetric);
    return 1;
  }

  private async computeContractPriceVolatility(
    snapshotDate: Date,
    threshold24h: number,
  ): Promise<number> {
    // Check if metric exists
    const existsPriceVolatility = await this.metricExists(
      AnalyticsMetricCategory.CONTRACTS,
      AnalyticsMetricType.PRICE_VOLATILITY,
      snapshotDate,
    );

    if (existsPriceVolatility) {
      return 0;
    }

    const volatility = await this.contractRepository
      .createQueryBuilder('c')
      .select('c.item_id')
      .addSelect('STDDEV(c.price)', 'std_dev')
      .addSelect('AVG(c.price)', 'avg_price')
      .where('c.timestamp > :threshold', { threshold: threshold24h })
      .groupBy('c.item_id')
      .having('COUNT(*) > :count', { count: 10 })
      .orderBy('std_dev', 'DESC')
      .limit(1)
      .getRawOne<ContractPriceVolatility>();

    if (!volatility) {
      return 0;
    }

    const contractPriceVolatilityMetric =
      this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.PRICE_VOLATILITY,
        value: {
          itemId: volatility.item_id,
          stdDev: parseFloat(volatility.std_dev || '0'),
          avgPrice: parseFloat(volatility.avg_price || '0'),
        },
        snapshotDate,
      });
    await this.analyticsMetricRepository.save(contractPriceVolatilityMetric);
    return 1;
  }
}
