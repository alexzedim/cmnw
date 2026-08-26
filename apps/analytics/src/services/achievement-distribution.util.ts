import type { AchievementsDistributionRow } from '@app/resources/types';
import type { SelectQueryBuilder } from 'typeorm';

/**
 * Number of ranked buckets above the median anchor. Bucket 0 collects
 * everything at or below the median ("below average"), buckets 1..N split the
 * (median, max] span into even width_bucket spans.
 */
export const ACHIEVEMENTS_DISTRIBUTION_BUCKETS = 7;

interface AchievementAnchorScope {
  /** Table the anchor CTE reads from, e.g. 'guilds' or 'characters'. */
  table: string;
  /**
   * WHERE clause for the anchor rows, written against the 'p' alias (e.g.
   * 'p.faction IS NOT NULL AND p.achievement_points > 0'). Must match the
   * outer row filter so every grouped row finds its anchor.
   */
  filter: string;
}

/**
 * Adds the `anchors` CTE computing the median/max achievement anchors once,
 * then joins it as `a` — either per realm (GROUP BY p.realm_id, joined on
 * realm_id) or as a single global row (joined on TRUE).
 *
 * The anchors must never be inlined into the bucket expressions: as scalar
 * subqueries they turn into per-row SubPlans (correlated per realm), which on
 * multi-million-row tables never completes. The CTE is evaluated once.
 */
export const withAchievementsAnchors = <E>(
  qb: SelectQueryBuilder<E>,
  outerAlias: string,
  scope: AchievementAnchorScope,
  groupByRealm: boolean,
): SelectQueryBuilder<E> => {
  const realmColumns = groupByRealm ? 'p.realm_id, ' : '';
  const realmGroup = groupByRealm ? ' GROUP BY p.realm_id' : '';
  const cte = `SELECT ${realmColumns}percentile_cont(0.5) WITHIN GROUP (ORDER BY p.achievement_points) AS median, MAX(p.achievement_points) AS max_points FROM ${scope.table} p WHERE ${scope.filter}${realmGroup}`;
  const joinCondition = groupByRealm ? `a.realm_id = ${outerAlias}.realm_id` : 'TRUE';

  return qb.addCommonTableExpression(cte, 'anchors').innerJoin('anchors', 'a', joinCondition);
};

/**
 * Adds the achievements-distribution aggregates (bucket0..bucket7 + stats) to
 * a query builder already carrying the `anchors` join (see
 * withAchievementsAnchors). Expects a fresh query builder (no prior selects).
 */
export const addAchievementsDistributionSelect = <E>(
  qb: SelectQueryBuilder<E>,
  outerAlias: string,
): SelectQueryBuilder<E> => {
  // width_bucket raises "lower bound cannot equal upper bound" when a scope's
  // median equals its max (every value identical). In that case the
  // (median, max] interval is empty, so any upper bound above the median puts
  // all rows in bucket 0 — the correct degenerate result.
  const upperBound = `CASE WHEN a.max_points <= a.median THEN a.median + 1 ELSE a.max_points END`;
  const bucket = `LEAST(width_bucket(${outerAlias}.achievement_points, a.median, ${upperBound}, ${ACHIEVEMENTS_DISTRIBUTION_BUCKETS}), ${ACHIEVEMENTS_DISTRIBUTION_BUCKETS})`;
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
