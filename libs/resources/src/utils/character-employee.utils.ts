import {
  BLIZZARD_EMPLOYEE_EVIDENCE,
  CHARACTER_BLIZZARD_EMPLOYEE_CE_FOS_ACHIEVEMENTS,
  CHARACTER_BLIZZARD_EMPLOYEE_CE_MIN_EDITIONS_SAME_DAY,
  CHARACTER_BLIZZARD_EMPLOYEE_CE_PETS,
  CHARACTER_BLIZZARD_EMPLOYEE_CE_SUSPECT_SPECIES,
  type EXPANSIONS,
} from '@app/resources/constants';
import type {
  BlizzardEmployeeFosEntry,
  BlizzardEmployeeSignature,
  ICharacterAchievementEntry,
  IPetType,
} from '@app/resources/types';

import { toDate } from '../transformers';
import { CHARACTER_AGE_EPOCH_FLOOR_MS } from './character-age.utils';

const MS_PER_UTC_DAY = 86_400_000;

/**
 * Returns the FoS completion timestamp when it lies within the plausible
 * window (after the achievement system existed, not in the future).
 */
const isPlausibleFosTimestamp = (timestamp: number): boolean =>
  Number.isFinite(timestamp) && timestamp >= CHARACTER_AGE_EPOCH_FLOOR_MS && timestamp <= Date.now();

/**
 * Extracts Collector's Edition pet Feats of Strength from a character
 * achievements payload. Runs where the raw payload is available (the osint
 * character service) so the timestamped "when" pillar can travel to the
 * worker without leaking the whole achievements response around.
 */
export const collectBlizzardEmployeeFos = (
  entries: ReadonlyArray<ICharacterAchievementEntry>,
): BlizzardEmployeeFosEntry[] => {
  const collected: BlizzardEmployeeFosEntry[] = [];

  for (const entry of entries) {
    const expansion = CHARACTER_BLIZZARD_EMPLOYEE_CE_FOS_ACHIEVEMENTS.get(entry.id);
    if (expansion && isPlausibleFosTimestamp(entry.completed_timestamp)) {
      collected.push({ achievementId: entry.id, expansion, timestamp: entry.completed_timestamp });
    }
  }

  return collected;
};

/**
 * Single-pass verdict on the Blizzard employee Collector's Edition signature.
 * Blizzard employees reportedly receive every collector's edition on their
 * hire date, so all CE Feats of Strength on one account share one UTC day.
 *
 * Patterns are evaluated in strict priority order, first match wins:
 * A) >= 2 distinct CE expansions' Feats of Strength completed on one UTC day
 *    -> employee (the hire-date batch grant)
 * B) >= 1 CE Feat of Strength, no same-day cluster, every owned CE pet
 *    expansion timestamp-covered -> organic collector timeline
 * C) >= suspect count of CE species without full timestamp coverage -> suspected
 * D) pets payload parsed and zero CE species -> signature ruled out
 * E) none of the above -> indeterminate
 *
 * @param pets - Character pets from the Blizzard collections endpoint (null when unavailable)
 * @param fos - CE Feats of Strength pre-extracted by collectBlizzardEmployeeFos (null when unscanned)
 * @returns Partial BlizzardEmployeeSignature
 *
 * @example
 * detectBlizzardEmployeeSignature(null, []) // { isBlizzardEmployee: null, blizzardEmployeeEvidence: 'INDETERMINATE', ... }
 */
export const detectBlizzardEmployeeSignature = (
  pets: ReadonlyArray<IPetType> | null,
  fos: ReadonlyArray<BlizzardEmployeeFosEntry> | null,
): Partial<BlizzardEmployeeSignature> => {
  const matchedNames = new Map<number, string>();
  const petExpansions = new Set<EXPANSIONS>();

  if (pets) {
    for (const pet of pets) {
      const info = CHARACTER_BLIZZARD_EMPLOYEE_CE_PETS.get(pet.species.id);
      if (!info) continue;

      matchedNames.set(pet.species.id, pet.species.name || info.name);
      petExpansions.add(info.expansion);
    }
  }

  const petsNames = [...matchedNames.values()].sort();
  const knownPets: string[] | null = pets === null ? null : petsNames;

  // PATTERN A: one UTC day hosting Feats of Strength from >= 2 distinct CE expansions
  if (fos && fos.length > 0) {
    const dayExpansions = new Map<number, Set<EXPANSIONS>>();

    for (const entry of fos) {
      const day = Math.floor(entry.timestamp / MS_PER_UTC_DAY);
      const expansions = dayExpansions.get(day) ?? new Set<EXPANSIONS>();
      expansions.add(entry.expansion);
      dayExpansions.set(day, expansions);
    }

    const cluster = [...dayExpansions].find(
      ([, expansions]) => expansions.size >= CHARACTER_BLIZZARD_EMPLOYEE_CE_MIN_EDITIONS_SAME_DAY,
    );
    if (cluster) {
      return {
        isBlizzardEmployee: true,
        blizzardEmployeeEvidence: BLIZZARD_EMPLOYEE_EVIDENCE.CE_FOS_SAME_DAY,
        blizzardEmployeePets: knownPets,
        hiredApprox: toDate(cluster[0] * MS_PER_UTC_DAY),
      };
    }
  }

  const fosExpansions = new Set<EXPANSIONS>((fos ?? []).map((entry) => entry.expansion));
  const isCoverageComplete = pets === null || [...petExpansions].every((expansion) => fosExpansions.has(expansion));

  // PATTERN B: timestamped CE grants exist but the timeline is organic
  if (fosExpansions.size > 0 && isCoverageComplete) {
    return {
      isBlizzardEmployee: false,
      blizzardEmployeeEvidence: BLIZZARD_EMPLOYEE_EVIDENCE.CE_TIMELINE_ORGANIC,
      blizzardEmployeePets: knownPets,
      hiredApprox: null,
    };
  }

  // PATTERN C: enough CE species to suspect, but timestamps cannot confirm or refute
  if (matchedNames.size >= CHARACTER_BLIZZARD_EMPLOYEE_CE_SUSPECT_SPECIES && !isCoverageComplete) {
    return {
      isBlizzardEmployee: null,
      blizzardEmployeeEvidence: BLIZZARD_EMPLOYEE_EVIDENCE.MULTI_CE_PETS_UNVERIFIED,
      blizzardEmployeePets: knownPets,
      hiredApprox: null,
    };
  }

  // PATTERN D: pets payload parsed, zero CE species
  if (pets !== null && matchedNames.size === 0) {
    return {
      isBlizzardEmployee: false,
      blizzardEmployeeEvidence: BLIZZARD_EMPLOYEE_EVIDENCE.NO_CE_PETS,
      blizzardEmployeePets: knownPets,
      hiredApprox: null,
    };
  }

  // PATTERN E: indeterminate
  return {
    isBlizzardEmployee: null,
    blizzardEmployeeEvidence: BLIZZARD_EMPLOYEE_EVIDENCE.INDETERMINATE,
    blizzardEmployeePets: knownPets,
    hiredApprox: null,
  };
};
