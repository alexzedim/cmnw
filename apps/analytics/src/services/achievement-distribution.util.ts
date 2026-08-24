import type { AchievementsDistributionRow } from '@app/resources/types';
import type { SelectQueryBuilder } from 'typeorm';

/**
 * Number of ranked buckets above the median anchor. Bucket 0 collects
 * everything at or below the median ("below average"), buckets 1..N split the
 * (median, max] span into even width_bucket spans.
 */
export const ACHIEVEMENTS_DISTRIBUTION_BUCKETS = 7;

interface AchievementBucketScope {
  /** Table the anchor subqueries read from, e.g. 'guilds' or 'characters'. */
  table: string;
  /**
   * WHERE clause for the anchor subqueries, written against the 'p' alias
   * (e.g. 'p.faction IS NOT NULL AND p.achievement_points > 0'). Per-realm
   * scopes correlate with the outer row via 'p.realm_id = <outer>.realm_id'.
   */
  filter: string;
}

/**
 * Builds the width_bucket expression anchored on the scope's median: bucket 0
 * holds values at/below the median, buckets 1..N cover (median, max] with even
 * widths (LEAST caps x == max into the last bucket).
 */
const bucketExpression = (outerAlias: string, scope: AchievementBucketScope): string => {
  const { table, filter } = scope;
  const median = `(SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p.achievement_points) FROM ${table} p WHERE ${filter})`;
  const max = `(SELECT MAX(p.achievement_points) FROM ${table} p WHERE ${filter})`;

  return `LEAST(width_bucket(${outerAlias}.achievement_points, ${median}, ${max}, ${ACHIEVEMENTS_DISTRIBUTION_BUCKETS}), ${ACHIEVEMENTS_DISTRIBUTION_BUCKETS})`;
};

/**
 * Adds the achievements-distribution aggregates (bucket0..bucket7 + stats) to
 * a query builder. The stats p50 doubles as the median anchor exposed in the
 * stored value. Expects a fresh query builder (no prior selects).
 */
export const addAchievementsDistributionSelect = <E>(
  qb: SelectQueryBuilder<E>,
  outerAlias: string,
  scope: AchievementBucketScope,
): SelectQueryBuilder<E> => {
  const bucket = bucketExpression(outerAlias, scope);
  let query = qb.select(`SUM(CASE WHEN ${bucket} = 0 THEN 1 ELSE 0 END)`, 'bucket0');

  for (let index = 1; index <= ACHIEVEMENTS_DISTRIBUTION_BUCKETS; index += 1) {
    query = query.addSelect(`SUM(CASE WHEN ${bucket} = ${index} THEN 1 ELSE 0 END)`, `bucket${index}`);
  }

  return query
    .addSelect('COUNT(*)', 'total')
    .addSelect(`AVG(${outerAlias}.achievement_points)`, 'avg_points')
    .addSelect(`STDDEV_POP(${outerAlias}.achievement_points)`, 'stddev_points')
    .addSelect(`MIN(${outerAlias}.achievement_points)`, 'min_points')
    .addSelect(`MAX(${outerAlias}.achievement_points)`, 'max_points')
    .addSelect(`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${outerAlias}.achievement_points)`, 'p50')
    .addSelect(`PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ${outerAlias}.achievement_points)`, 'p90')
    .addSelect(`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${outerAlias}.achievement_points)`, 'p99');
};

/**
 * Builds the stored metric value: total, the median anchor (threshold), and
 * dynamic range labels. Bucket 0 spans [min, median] ("below average"), the
 * rest split (median, max] evenly. Bounds are rounded for display — counts
 * come from width_bucket, so labels may differ from SQL bounds by <= 1 point.
 */
export const toAchievementsDistributionValue = (row: AchievementsDistributionRow): Record<string, any> => {
  const max = parseInt(String(row.max_points ?? 0), 10);
  const min = parseInt(String(row.min_points ?? 0), 10);
  const threshold = Math.round(Number(row.p50 ?? 0));
  const width = (max - threshold) / ACHIEVEMENTS_DISTRIBUTION_BUCKETS;
  const ranges: Record<string, number> = {};

  ranges[`${min} ⋯ ${threshold}`] = parseInt(row.bucket0 || '0', 10);

  for (let index = 1; index <= ACHIEVEMENTS_DISTRIBUTION_BUCKETS; index += 1) {
    const from = Math.round(threshold + (index - 1) * width);
    const to = index === ACHIEVEMENTS_DISTRIBUTION_BUCKETS ? max : Math.round(threshold + index * width);

    ranges[`${from} ⋯ ${to}`] = parseInt(row[`bucket${index}`] || '0', 10);
  }

  return {
    total: parseInt(row.total || '0', 10),
    threshold,
    ranges,
    stats: {
      min,
      max,
      avg: Math.round(Number(row.avg_points || 0) * 100) / 100,
      stddev: Math.round(Number(row.stddev_points || 0) * 100) / 100,
      p50: Math.round(Number(row.p50 || 0) * 100) / 100,
      p90: Math.round(Number(row.p90 || 0) * 100) / 100,
      p99: Math.round(Number(row.p99 || 0) * 100) / 100,
    },
  };
};
