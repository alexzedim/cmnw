import { CHARACTER_AGE_PATTERN_ACHIEVEMENTS } from '@app/resources/constants';
import type { ICharacterAchievementEntry } from '@app/resources/types';

/**
 * Earliest plausible achievement timestamp: the WoW achievement system went
 * live with patch 3.0.2 on 2008-10-14T00:00:00Z.
 */
export const CHARACTER_AGE_EPOCH_FLOOR_MS = 1223913600000;

/**
 * Extracts the oldest valid pattern-achievement timestamp, approximating the
 * character creation date ("created on or before"). Entries with timestamps
 * outside the plausible window (before the achievement system existed or in
 * the future) are ignored as corrupted.
 *
 * @param entries - Character achievements from the Blizzard API
 * @returns Oldest valid completed_timestamp in ms, or null when no pattern achievement matched
 *
 * @example
 * extractCreatedApproxTimestamp([{ id: 6, completed_timestamp: 1590969600000 }]) // 1590969600000
 * extractCreatedApproxTimestamp([{ id: 46, completed_timestamp: 1590969600000 }]) // null
 */
export const extractCreatedApproxTimestamp = (entries: ReadonlyArray<ICharacterAchievementEntry>): number | null => {
  const patternIds = new Set<number>(CHARACTER_AGE_PATTERN_ACHIEVEMENTS);
  const ceiling = Date.now();

  let oldest: number | null = null;

  for (const entry of entries) {
    if (!patternIds.has(entry.id)) continue;

    const timestamp = entry.completed_timestamp;
    const isPlausible = Number.isFinite(timestamp) && timestamp >= CHARACTER_AGE_EPOCH_FLOOR_MS && timestamp <= ceiling;
    if (!isPlausible) continue;

    if (oldest === null || timestamp < oldest) {
      oldest = timestamp;
    }
  }

  return oldest;
};
