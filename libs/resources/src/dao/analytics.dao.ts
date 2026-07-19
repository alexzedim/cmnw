import { Repository } from 'typeorm';
import { AnalyticsEntity } from '@app/pg';

export interface AnalyticsMetricExistsInput {
  category: string;
  metricType: string;
  snapshotDate: Date;
  realmId?: number;
}

export const analyticsMetricExists = async (
  analyticsRepository: Repository<AnalyticsEntity>,
  { category, metricType, snapshotDate, realmId }: AnalyticsMetricExistsInput,
): Promise<boolean> => {
  const query = analyticsRepository
    .createQueryBuilder()
    .where('category = :category', { category })
    .andWhere('metric_type = :metricType', { metricType })
    .andWhere('snapshot_date = :snapshotDate', { snapshotDate });

  if (realmId === undefined) {
    query.andWhere('realm_id IS NULL');
  } else {
    query.andWhere('realm_id = :realmId', { realmId });
  }

  const result = await query.getOne();
  return !!result;
};

export interface AnalyticsMetricLatestInput {
  category: string;
  metricType: string;
  realmId?: number;
}

/**
 * Returns the most recent analytics row for the given (category, metricType,
 * realmId), regardless of date. Used by metrics that represent frozen
 * historical records (e.g. Hall of Fame) to skip writes when the freshly
 * computed value matches the prior snapshot — sealing one row per raid-tier
 * instead of bloating the table with daily duplicates.
 */
export const analyticsMetricLatest = async (
  analyticsRepository: Repository<AnalyticsEntity>,
  { category, metricType, realmId }: AnalyticsMetricLatestInput,
): Promise<AnalyticsEntity | null> => {
  const query = analyticsRepository
    .createQueryBuilder()
    .where('category = :category', { category })
    .andWhere('metric_type = :metricType', { metricType })
    .orderBy('snapshot_date', 'DESC')
    .addOrderBy('created_at', 'DESC')
    .limit(1);

  if (realmId === undefined) {
    query.andWhere('realm_id IS NULL');
  } else {
    query.andWhere('realm_id = :realmId', { realmId });
  }

  return query.getOne();
};

