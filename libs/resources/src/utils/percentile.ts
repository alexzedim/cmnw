/**
 * Calculate percentile value relative to maximum
 * @param value The character's stat value
 * @param extremes Object containing max value
 * @returns Percentile (0-100) or null if value/extremes invalid
 */
export function calculatePercentile(
  value: number | undefined,
  extremes: Record<string, any>,
): number | null {
  if (value === null || value === undefined) return null;
  if (!extremes.max || extremes.max <= 0) return null;

  const percentile = (value / extremes.max) * 100;
  return Math.min(100, Math.round(percentile * 100) / 100);
}

/**
 * Calculate percentiles for character stats
 * @param stats Object with achievementPoints, averageItemLevel, mountsNumber, and petsNumber
 * @param globalAnalytics Global analytics data
 * @param realmAnalytics Realm-specific analytics data
 * @returns Object with global and realm percentiles
 */
export function calculateCharacterPercentiles(
  stats: {
    achievementPoints?: number;
    averageItemLevel?: number;
    mountsNumber?: number;
    petsNumber?: number;
  },
  globalAnalytics?: { value?: Record<string, any> },
  realmAnalytics?: { value?: Record<string, any> },
) {
  return {
    global: {
      achievementPoints: calculatePercentile(
        stats.achievementPoints,
        globalAnalytics?.value?.achievementPoints || {},
      ),
      averageItemLevel: calculatePercentile(
        stats.averageItemLevel,
        globalAnalytics?.value?.averageItemLevel || {},
      ),
      mountsNumber: calculatePercentile(
        stats.mountsNumber,
        globalAnalytics?.value?.mountsNumber || {},
      ),
      petsNumber: calculatePercentile(
        stats.petsNumber,
        globalAnalytics?.value?.petsNumber || {},
      ),
    },
    realm: {
      achievementPoints: calculatePercentile(
        stats.achievementPoints,
        realmAnalytics?.value?.achievementPoints || {},
      ),
      averageItemLevel: calculatePercentile(
        stats.averageItemLevel,
        realmAnalytics?.value?.averageItemLevel || {},
      ),
      mountsNumber: calculatePercentile(
        stats.mountsNumber,
        realmAnalytics?.value?.mountsNumber || {},
      ),
      petsNumber: calculatePercentile(
        stats.petsNumber,
        realmAnalytics?.value?.petsNumber || {},
      ),
    },
  };
}
