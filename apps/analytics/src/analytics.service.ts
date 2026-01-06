import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository, MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import {
  CharacterMetricsService,
  ContractMetricsService,
  GuildMetricsService,
  MarketMetricsService,
} from './services';
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
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const logTag = 'onApplicationBootstrap';
    try {
      const today = DateTime.now().startOf('day').toJSDate();

      // Check if today's snapshot already exists
      const todaySnapshot = await this.analyticsMetricRepository.findOne({
        where: {
          snapshotDate: MoreThan(today),
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

      // If table is empty (first launch) or no snapshot for today, run immediately
      if (tableRowCount === 0 || !todaySnapshot) {
        this.logger.log({
          logTag,
          message:
            'No snapshot for today detected, running computation immediately',
          tableRowCount,
        });
        await this.computeDailySnapshot();
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
  private async computeDailySnapshot(): Promise<void> {
    const logTag = 'computeDailySnapshot';
    const startTime = Date.now();
    const snapshotDate = DateTime.now().startOf('day').toJSDate();

    try {
      this.logger.log({
        logTag,
        message: 'Starting daily analytics computation',
        snapshotDate: snapshotDate.toISOString(),
      });

      // Compute all metrics in parallel
      const [charCount, guildCount, marketCount, contractCount] =
        await Promise.all([
          this.characterMetricsService.computeCharacterMetrics(snapshotDate),
          this.guildMetricsService.computeGuildMetrics(snapshotDate),
          this.marketMetricsService.computeMarketMetrics(snapshotDate),
          this.contractMetricsService.computeContractMetrics(snapshotDate),
        ]);

      const totalMetrics = charCount + guildCount + marketCount + contractCount;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Daily analytics computation completed - metricsCount: ${totalMetrics}, durationMs: ${duration}`,
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error during daily analytics computation',
        errorOrException,
      });
      throw errorOrException;
    }
  }

  async getLatestMetric(
    category: string,
    metricType: string,
    realmId?: number,
  ): Promise<AnalyticsEntity | null> {
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
