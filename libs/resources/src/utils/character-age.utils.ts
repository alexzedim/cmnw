import {
  CHARACTER_AGE_LEGACY_MILESTONE_IDS,
  CHARACTER_LEVEL_BOOST_INFERENCE_EXCLUDED_CLASSES,
  CHARACTER_LEVEL_BOOST_LEVEL_EXPANSION,
  CHARACTER_LEVEL_MILESTONE_IDS,
  LEVEL_BOOST_EVIDENCE,
} from '@app/resources/constants';
import type { CharacterAge, ICharacterAchievementEntry } from '@app/resources/types';

import { toDate } from '../transformers';

/**
 * Earliest plausible achievement timestamp: the WoW achievement system went
 * live with patch 3.0.2 on 2008-10-14T00:00:00Z.
 */
export const CHARACTER_AGE_EPOCH_FLOOR_MS = 1223913600000;

const MILESTONE_ID_TO_LEVEL = new Map<number, number>(
  [...CHARACTER_LEVEL_MILESTONE_IDS].map(([level, id]) => [id, level] as [number, number]),
);

const LEGACY_MILESTONE_IDS = new Set<number>(CHARACTER_AGE_LEGACY_MILESTONE_IDS);

/**
 * Returns the entry timestamp when it lies within the plausible window
 * (after the achievement system existed, not in the future), null otherwise.
 */
const toAgeTimestamp = (entry: ICharacterAchievementEntry): number | null => {
  const timestamp = entry.completed_timestamp;
  const isPlausible =
    Number.isFinite(timestamp) && timestamp >= CHARACTER_AGE_EPOCH_FLOOR_MS && timestamp <= Date.now();
  return isPlausible ? timestamp : null;
};

/**
 * Finds the largest group of level milestones sharing one identical
 * completed_timestamp, together with the highest boost-tier level (60/70/80)
 * it contains. A natural player cannot earn two level milestones in the same
 * millisecond, so such a group proves a batch grant (level boost). Groups
 * without a boost-tier milestone are ignored: pre-3.0.2 characters and Death
 * Knight creation also batch-stamp the lower ladder.
 */
const findLargestMilestoneTimestampCluster = (
  milestones: { level: number; timestamp: number }[],
): { boostLevel: number; timestamp: number } | null => {
  const groups = new Map<number, { boostLevel: number; size: number }>();

  for (const { level, timestamp } of milestones) {
    const group = groups.get(timestamp) ?? { boostLevel: 0, size: 0 };
    groups.set(timestamp, {
      boostLevel: CHARACTER_LEVEL_BOOST_LEVEL_EXPANSION.has(level)
        ? Math.max(group.boostLevel, level)
        : group.boostLevel,
      size: group.size + 1,
    });
  }

  let largest: { boostLevel: number; timestamp: number; size: number } | null = null;

  for (const [timestamp, { boostLevel, size }] of groups) {
    if (size < 2 || boostLevel === 0) continue;

    const isLarger = largest === null || size > largest.size;
    const isTiedEarlier = largest !== null && size === largest.size && timestamp < largest.timestamp;
    if (isLarger || isTiedEarlier) {
      largest = { boostLevel, timestamp, size };
    }
  }

  return largest;
};

/**
 * Single-pass scan of character achievements producing the creation date
 * approximation ("created on or before") and the level boost verdict.
 *
 * Patterns are evaluated in strict priority order, first match wins:
 * A) >= 2 level milestones with an identical timestamp, including a
 *    boost-tier milestone (60/70/80) -> boosted, tier from the highest
 *    boost-tier milestone in the cluster
 * B) Level 10 milestone present -> naturally leveled
 * C) none of the above -> indeterminate
 *
 * Pattern A is skipped for hero classes (Death Knight, Demon Hunter, Evoker):
 * they start above level 10 and get milestones batch-stamped at creation,
 * which would otherwise read as a boost.
 *
 * @param entries - Character achievements from the Blizzard API
 * @param characterClass - Character class name (e.g. 'Evoker'), used for hero-class gating
 * @returns Partial CharacterAge: createdApprox when recoverable, plus the level boost verdict
 *
 * @example
 * detectCharacterAgeAndLevelBoost([{ id: 6, completed_timestamp: 1590969600000 }]) // { createdApprox: ..., isLevelBoosted: false, ... }
 * detectCharacterAgeAndLevelBoost([{ id: 46, completed_timestamp: 1590969600000 }]) // { isLevelBoosted: null, levelBoostEvidence: 'INDETERMINATE' }
 */
export const detectCharacterAgeAndLevelBoost = (
  entries: ReadonlyArray<ICharacterAchievementEntry>,
  characterClass?: string | null,
): Partial<CharacterAge> => {
  let earliestTimestamp: number | null = null;
  const milestones: { level: number; timestamp: number }[] = [];

  for (const entry of entries) {
    const timestamp = toAgeTimestamp(entry);
    if (timestamp === null) continue;

    const level = MILESTONE_ID_TO_LEVEL.get(entry.id);
    if (level !== undefined) {
      milestones.push({ level, timestamp });
    } else if (!LEGACY_MILESTONE_IDS.has(entry.id)) {
      continue;
    }

    earliestTimestamp = earliestTimestamp === null ? timestamp : Math.min(earliestTimestamp, timestamp);
  }

  const isInferenceExcluded =
    characterClass != null && CHARACTER_LEVEL_BOOST_INFERENCE_EXCLUDED_CLASSES.has(characterClass);

  // PATTERN A: identical-timestamp cluster of level milestones proves a batch grant (level boost)
  if (!isInferenceExcluded) {
    const cluster = findLargestMilestoneTimestampCluster(milestones);
    if (cluster) {
      return {
        createdApprox: toDate(earliestTimestamp ?? cluster.timestamp),
        isLevelBoosted: true,
        levelBoostEvidence: LEVEL_BOOST_EVIDENCE.TIMESTAMP_CLUSTER,
        levelBoostType: CHARACTER_LEVEL_BOOST_LEVEL_EXPANSION.get(cluster.boostLevel) ?? null,
        levelBoostedAt: toDate(cluster.timestamp),
      };
    }
  }

  // PATTERN B: the Level 10 milestone proves natural leveling
  const level10Timestamp = milestones.find((milestone) => milestone.level === 10)?.timestamp ?? null;
  if (level10Timestamp !== null) {
    return {
      createdApprox: toDate(earliestTimestamp ?? level10Timestamp),
      isLevelBoosted: false,
      levelBoostEvidence: LEVEL_BOOST_EVIDENCE.ORIGINAL_LEVEL_10_PRESENT,
      levelBoostType: null,
      levelBoostedAt: null,
    };
  }

  // PATTERN C: indeterminate, age from whatever tracked data remains
  return {
    ...(earliestTimestamp !== null ? { createdApprox: toDate(earliestTimestamp) } : {}),
    isLevelBoosted: null,
    levelBoostEvidence: LEVEL_BOOST_EVIDENCE.INDETERMINATE,
    levelBoostType: null,
    levelBoostedAt: null,
  };
};
