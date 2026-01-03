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
      achievementPoints: calculatePercentile(stats.achievementPoints, {
        max: globalAnalytics?.value?.maxAchievementPoints?.value,
      }),
      averageItemLevel: calculatePercentile(stats.averageItemLevel, {
        max: globalAnalytics?.value?.maxItemLevel?.value,
      }),
      mountsNumber: calculatePercentile(stats.mountsNumber, {
        max: globalAnalytics?.value?.maxMounts?.value,
      }),
      petsNumber: calculatePercentile(stats.petsNumber, {
        max: globalAnalytics?.value?.maxPets?.value,
      }),
    },
    realm: {
      achievementPoints: calculatePercentile(stats.achievementPoints, {
        max: realmAnalytics?.value?.maxAchievementPoints?.value,
      }),
      averageItemLevel: calculatePercentile(stats.averageItemLevel, {
        max: realmAnalytics?.value?.maxItemLevel?.value,
      }),
      mountsNumber: calculatePercentile(stats.mountsNumber, {
        max: realmAnalytics?.value?.maxMounts?.value,
      }),
      petsNumber: calculatePercentile(stats.petsNumber, {
        max: realmAnalytics?.value?.maxPets?.value,
      }),
    },
  };
}
