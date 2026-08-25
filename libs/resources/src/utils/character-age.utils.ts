import {
  CHARACTER_AGE_EXPANSION_LEVEL_IDS,
  CHARACTER_AGE_ORIGINAL_CHAIN_IDS,
  CHARACTER_AGE_ORIGINAL_LEVEL_10_ID,
  CHARACTER_LEVEL_BOOST_ACHIEVEMENT_EXPANSION,
  CHARACTER_LEVEL_BOOST_INFERENCE_EXCLUDED_CLASSES,
  EXPANSIONS,
  LEVEL_BOOST_EVIDENCE,
} from '@app/resources/constants';
import type { CharacterAge, ICharacterAchievementEntry } from '@app/resources/types';

import { toDate } from '../transformers';

/**
 * Earliest plausible achievement timestamp: the WoW achievement system went
 * live with patch 3.0.2 on 2008-10-14T00:00:00Z.
 */
export const CHARACTER_AGE_EPOCH_FLOOR_MS = 1223913600000;

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

const minTimestamp = (timestamps: number[]): number | null =>
  timestamps.length === 0 ? null : Math.min(...timestamps);

/**
 * Finds the largest group of expansion leveling achievements sharing one
 * expansion and one identical completed_timestamp. Ties resolve to the
 * earliest timestamp. A natural player cannot earn two level achievements in
 * the same millisecond, so a group of >= 2 proves a batch grant (level boost).
 */
const findLargestExpansionTimestampCluster = (
  expansionTimestamps: Map<EXPANSIONS, number[]>,
): { expansion: EXPANSIONS; timestamp: number } | null => {
  let largest: { expansion: EXPANSIONS; timestamp: number; size: number } | null = null;

  for (const [expansion, timestamps] of expansionTimestamps) {
    const groups = new Map<number, number>();
    for (const timestamp of timestamps) {
      groups.set(timestamp, (groups.get(timestamp) ?? 0) + 1);
    }

    for (const [timestamp, size] of groups) {
      if (size < 2) continue;

      const isLarger = largest === null || size > largest.size;
      const isTiedEarlier = largest !== null && size === largest.size && timestamp < largest.timestamp;
      if (isLarger || isTiedEarlier) {
        largest = { expansion, timestamp, size };
      }
    }
  }

  return largest;
};

/**
 * Single-pass scan of character achievements producing the creation date
 * approximation ("created on or before") and the level boost verdict.
 *
 * Patterns are evaluated in strict priority order, first match wins:
 * A) direct boost achievement present -> boosted, boost metadata from the achievement
 * C) >= 2 same-expansion level achievements with identical timestamps -> boosted
 * D) original Level 10 achievement present -> naturally leveled
 * B) zero original ladder + >= 1 expansion level achievement -> boosted (inferred)
 * E) none of the above -> indeterminate
 *
 * Patterns B and C are skipped for hero classes (Death Knight, Demon Hunter,
 * Evoker): they start above level 10 and get expansion chains batch-stamped at
 * creation, which would otherwise read as a boost.
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
  const originalChainIds = new Set<number>(CHARACTER_AGE_ORIGINAL_CHAIN_IDS);
  const expansionLevelIds = new Map<number, EXPANSIONS>();
  for (const [expansion, ids] of CHARACTER_AGE_EXPANSION_LEVEL_IDS) {
    for (const id of ids) {
      expansionLevelIds.set(id, expansion);
    }
  }

  let level10Timestamp: number | null = null;
  const originalChainTimestamps: number[] = [];
  const expansionTimestamps = new Map<EXPANSIONS, number[]>();
  const expansionEntriesFlat: { expansion: EXPANSIONS; timestamp: number }[] = [];
  const boostEntries: ICharacterAchievementEntry[] = [];

  for (const entry of entries) {
    const timestamp = toAgeTimestamp(entry);
    if (timestamp === null) continue;

    if (entry.id === CHARACTER_AGE_ORIGINAL_LEVEL_10_ID) {
      level10Timestamp = timestamp;
      continue;
    }

    if (originalChainIds.has(entry.id)) {
      originalChainTimestamps.push(timestamp);
      continue;
    }

    const expansion = expansionLevelIds.get(entry.id);
    if (expansion) {
      const group = expansionTimestamps.get(expansion) ?? [];
      group.push(timestamp);
      expansionTimestamps.set(expansion, group);
      expansionEntriesFlat.push({ expansion, timestamp });
      continue;
    }

    if (CHARACTER_LEVEL_BOOST_ACHIEVEMENT_EXPANSION.has(entry.id)) {
      boostEntries.push(entry);
    }
  }

  const isInferenceExcluded =
    characterClass != null && CHARACTER_LEVEL_BOOST_INFERENCE_EXCLUDED_CLASSES.has(characterClass);

  // PATTERN A: direct boost achievement, conclusive for every class
  if (boostEntries.length > 0) {
    const boostEntry = boostEntries[0];
    const candidateTimestamps = [
      ...boostEntries.map((entry) => entry.completed_timestamp),
      ...expansionEntriesFlat.map((flat) => flat.timestamp),
    ];

    return {
      createdApprox: toDate(Math.min(...candidateTimestamps)),
      isLevelBoosted: true,
      levelBoostEvidence: LEVEL_BOOST_EVIDENCE.DIRECT_ACHIEVEMENT,
      levelBoostType: CHARACTER_LEVEL_BOOST_ACHIEVEMENT_EXPANSION.get(boostEntry.id) ?? null,
      levelBoostedAt: toDate(boostEntry.completed_timestamp),
    };
  }

  // PATTERN C: identical-timestamp cluster inside one expansion leveling chain
  if (!isInferenceExcluded) {
    const cluster = findLargestExpansionTimestampCluster(expansionTimestamps);
    if (cluster) {
      return {
        createdApprox: toDate(cluster.timestamp),
        isLevelBoosted: true,
        levelBoostEvidence: LEVEL_BOOST_EVIDENCE.TIMESTAMP_CLUSTER,
        levelBoostType: cluster.expansion,
        levelBoostedAt: toDate(cluster.timestamp),
      };
    }
  }

  // PATTERN D: original Level 10 achievement proves natural leveling
  if (level10Timestamp !== null) {
    return {
      createdApprox: toDate(level10Timestamp),
      isLevelBoosted: false,
      levelBoostEvidence: LEVEL_BOOST_EVIDENCE.ORIGINAL_LEVEL_10_PRESENT,
      levelBoostType: null,
      levelBoostedAt: null,
    };
  }

  // PATTERN B: expansion leveling present but the original ladder is fully absent
  if (!isInferenceExcluded && originalChainTimestamps.length === 0 && expansionEntriesFlat.length > 0) {
    const earliest = expansionEntriesFlat.reduce((left, right) => (right.timestamp < left.timestamp ? right : left));

    return {
      createdApprox: toDate(earliest.timestamp),
      isLevelBoosted: true,
      levelBoostEvidence: LEVEL_BOOST_EVIDENCE.ORIGINAL_CHAIN_ABSENT,
      levelBoostType: earliest.expansion,
      levelBoostedAt: null,
    };
  }

  // PATTERN E: indeterminate, age from whatever tracked data remains
  const earliest = minTimestamp([...originalChainTimestamps, ...expansionEntriesFlat.map((flat) => flat.timestamp)]);

  return {
    ...(earliest !== null ? { createdApprox: toDate(earliest) } : {}),
    isLevelBoosted: null,
    levelBoostEvidence: LEVEL_BOOST_EVIDENCE.INDETERMINATE,
    levelBoostType: null,
    levelBoostedAt: null,
  };
};
