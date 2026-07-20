import { EntityManager, Repository } from 'typeorm';
import { AnalyticsEntity } from '@app/pg';

export const NULL_REALM = 'NULL';

export const analyticsKeyOf = (category: string, metricType: string, realmId?: number): string =>
  `${category}|${metricType}|${realmId ?? NULL_REALM}`;

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
  source: EntityManager | Repository<AnalyticsEntity>,
  { category, metricType, realmId }: AnalyticsMetricLatestInput,
): Promise<AnalyticsEntity | null> => {
  const repository = source instanceof EntityManager ? source.getRepository(AnalyticsEntity) : source;
  const query = repository
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

/**
 * Returns the set of "category|metricType|realmId" keys already present for the
 * given snapshot date, so a metrics service can decide in memory which rows it
 * still needs to insert. Replaces N per-row `analyticsMetricExists` round-trips
 * with a single SELECT scoped to the snapshot date.
 *
 * Accepts either a Repository (default injection) or an EntityManager (inside a
 * transaction) — the manager path keeps the read inside the same tx as the
 * subsequent batched save.
 */
export const findExistingAnalyticsKeys = async (
  source: EntityManager | Repository<AnalyticsEntity>,
  snapshotDate: Date,
): Promise<Set<string>> => {
  const repository = source instanceof EntityManager ? source.getRepository(AnalyticsEntity) : source;
  const rows = await repository.find({
    where: { snapshotDate },
    select: ['category', 'metricType', 'realmId'],
  });
  return new Set(rows.map((row) => analyticsKeyOf(row.category, row.metricType, row.realmId)));
};
