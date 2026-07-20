import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { DateTime } from 'luxon';
import {
  CharacterMetricsService,
  ContractMetricsService,
  GuildMetricsService,
  HallOfFameMetricsService,
  MarketMetricsService,
} from './services';
import { AnalyticsMigrationService } from './services/analytics-migration.service';
import { AnalyticsEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AnalyticsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnalyticsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    private readonly characterMetricsService: CharacterMetricsService,
    private readonly guildMetricsService: GuildMetricsService,
    private readonly marketMetricsService: MarketMetricsService,
    private readonly contractMetricsService: ContractMetricsService,
    private readonly hallOfFameMetricsService: HallOfFameMetricsService,
    private readonly analyticsMigrationService: AnalyticsMigrationService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const logTag = 'onApplicationBootstrap';
    try {
      await this.analyticsMigrationService.migrate();

      const today = DateTime.now().startOf('day').toJSDate();

      // Check if today's snapshot already exists. Snapshots are stored with
      // snapshotDate = start-of-day, so use MoreThanOrEqual to match exactly.
      const todaySnapshot = await this.analyticsMetricRepository.findOne({
        where: {
          snapshotDate: MoreThanOrEqual(today),
        },
      });

      // Check table row count
      const tableRowCount = await this.analyticsMetricRepository.count();

      this.logger.log({
        logTag,
        message: 'Analytics service initialized',
        tableRowCount,
        todaySnapshotExists: !!todaySnapshot,
      });

      // If table is empty (first launch) or no snapshot for today, run immediately.
      // Fire-and-forget so we don't block HTTP serving in co-hosted apps
      // (e.g. the API process). The snapshot is idempotent and wrapped in
      // its own try/catch, so any failure only logs — it cannot crash boot.
      if (tableRowCount === 0 || !todaySnapshot) {
        this.logger.log({
          logTag,
          message: 'No snapshot for today detected, running snapshot in background',
          tableRowCount,
        });
        void this.snapshotDaily();
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error during bootstrap initialization',
        errorOrException,
      });
    }
  }

  @Cron('0 2 * * *')
  private async snapshotDaily(): Promise<void> {
    const logTag = 'snapshotDaily';
    const snapshotDate = DateTime.now().startOf('day').toJSDate();

    // Skip if any metric for today already exists — prevents re-running
    // every aggregation query when the bootstrap path already created the
    // snapshot (e.g. app restarted shortly before the cron tick).
    const todaySnapshot = await this.analyticsMetricRepository.findOne({
      where: { snapshotDate: MoreThanOrEqual(snapshotDate) },
    });

    if (todaySnapshot) {
      this.logger.log({
        logTag,
        message: 'Snapshot for today already exists, skipping',
        snapshotDate: snapshotDate.toISOString(),
      });
      return;
    }

    const startTime = Date.now();

    try {
      this.logger.log({
        logTag,
        message: 'Starting daily analytics snapshot',
        snapshotDate: snapshotDate.toISOString(),
      });

      // Run metrics services sequentially — each holds a single transaction
      // connection, so serialization avoids pool contention and gives clean
      // per-service failure isolation.
      const charCount = await this.characterMetricsService.snapshotCharacterMetrics(snapshotDate);
      const guildCount = await this.guildMetricsService.snapshotGuildMetrics(snapshotDate);
      const marketCount = await this.marketMetricsService.snapshotMarketMetrics(snapshotDate);
      const contractCount = await this.contractMetricsService.snapshotContractMetrics(snapshotDate);
      const hofCount = await this.hallOfFameMetricsService.snapshotHallOfFameMetrics(snapshotDate);

      const totalMetrics = charCount + guildCount + marketCount + contractCount + hofCount;

      const duration = Date.now() - startTime;
      this.logger.log(`Daily analytics snapshot completed - metricsCount: ${totalMetrics}, durationMs: ${duration}`);
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error during daily analytics snapshot',
        errorOrException,
      });
      throw errorOrException;
    }
  }

  async getLatestMetric(category: string, metricType: string, realmId?: number): Promise<AnalyticsEntity | null> {
    const query = this.analyticsMetricRepository
      .createQueryBuilder()
      .where('category = :category', { category })
      .andWhere('metric_type = :metricType', { metricType });

    if (realmId === undefined) {
      query.andWhere('realm_id IS NULL');
    } else {
      query.andWhere('realm_id = :realmId', { realmId });
    }

    return query.orderBy('snapshot_date', 'DESC').limit(1).getOne();
  }

  async getMetricHistory(
    category: string,
    metricType: string,
    realmId?: number,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<AnalyticsEntity[]> {
    const query = this.analyticsMetricRepository
      .createQueryBuilder()
      .where('category = :category', { category })
      .andWhere('metric_type = :metricType', { metricType });

    if (realmId === undefined) {
      query.andWhere('realm_id IS NULL');
    } else {
      query.andWhere('realm_id = :realmId', { realmId });
    }

    if (fromDate) {
      query.andWhere('snapshot_date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('snapshot_date <= :toDate', { toDate });
    }

    return query.orderBy('snapshot_date', 'ASC').getMany();
  }
}
