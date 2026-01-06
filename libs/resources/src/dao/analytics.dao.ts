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
