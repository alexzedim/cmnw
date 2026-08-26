# ZCode Spec: Blizzard Employee Character Detection (Collector's Edition Signature)

> **Version**: 2.0.0 (implemented)
> **Scope**: Single-pass pets + achievements scan producing a Blizzard employee signature verdict
> **API**: World of Warcraft Profile API — Character Collections (Pets) + Character Achievements endpoints
> **Region**: EU (`https://eu.api.blizzard.com`)
> **Namespace**: `profile-eu`
> **Source technique**: [Habr 259463 — «Определение персонажей-ГМ World of Warcraft с помощью Python» (2015)](https://habr.com/ru/articles/259463/)

---

## Table of Contents

1. [Background & Source Technique](#1-background--source-technique)
2. [Data Sources](#2-data-sources)
3. [Marker Maps](#3-marker-maps)
4. [Detection Logic](#4-detection-logic)
5. [Detection Utils](#5-detection-utils)
6. [Entity & Storage](#6-entity--storage)
7. [Worker Integration](#7-worker-integration)
8. [TypeScript Interfaces](#8-typescript-interfaces)
9. [Marker Verification Record](#9-marker-verification-record)
10. [Worked Examples](#10-worked-examples)
11. [Caveats & False Positives](#11-caveats--false-positives)
12. [Quick Reference](#12-quick-reference)

---

## 1. Background & Source Technique

The Habr article describes a probabilistic method for identifying **Blizzard World of Warcraft
division employees** (not GM-flagged characters — those are hidden from the API entirely; the
realistic target is personal accounts of staff). The observed Blizzard HR practice: **new employees
receive copies of every collector's edition upon hire, and all CE rewards appear on their account
on the same calendar day** (the presumed hire date).

Key numbers from the original scan of ~1.7M RU-region characters:

| Signal | Characters | Share |
|:---|---:|---:|
| Own a vanilla CE pet (Panda Cub / Mini Diablo / Zergling) | 1,306 | 0.07% |
| Own ≥ 4 collector's editions granted the same day | 380 | 0.02% |

The author's criterion for "likely employee" was the second row. Confirmed false positives exist
(wealthy collectors), and the article stresses the method is probabilistic. It also observed
"nests" — several detected characters concentrated in one guild.

### 1.1 Translation to the modern API

The article used the legacy `fields=pets,guild` request and string-matched `"Panda Cub"`. The
modern API splits the two pillars the technique needs:

| Pillar | Question | Modern source | Already fetched by us? |
|:---|:---|:---|:---|
| **WHAT** | Which CE pets does the character own? | `/collections/pets` → `pets[].species.id` | ✅ every refresh (`getPetsCollection`) |
| **WHEN** | When were they granted? | `/achievements` → CE Feats of Strength entries with `completed_timestamp` | ⚠️ gated by `isScanNeeded` (`getAchievements`) |

The pets endpoint carries **no acquisition timestamps**, so the "same day" pillar is recovered from
Feats of Strength: every CE pet through Battle for Azeroth grants a promotion FoS which appears in
the achievements payload with a completion timestamp. **Blizzard stopped issuing CE pet FoS after
BfA** (Dragonflight and The War Within CE pets grant no achievement), so SL+ pets can never be
timestamp-covered — the coverage rules in §4 handle this degradation by design.

---

## 2. Data Sources

### 2.1 Pets Collections Endpoint

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm_slug}/{character_name}/collections/pets
    ?namespace=profile-eu
    &locale=en_US
    &access_token={token}
```

Relevant fields: `pets[].species.id` (join key into the CE map) and `pets[].species.name` (for the
matched-evidence list). Typed as `BlizzardApiPetsCollection` with elements `IPetType`.

### 2.2 Achievements Endpoint

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm_slug}/{character_name}/achievements
    ?namespace=profile-eu
    &locale=en_US
    &access_token={token}
```

Relevant fields: `achievements[].id` matched against the CE FoS map,
`achievements[].completed_timestamp` (ms since Unix epoch) used for same-day clustering. Error
responses and retry semantics are identical to `LEVEL_DETECTION_PATTERN.md` §2.5.

---

## 3. Marker Maps

### 3.1 CE Pet Species IDs (production-verified)

Verified against the CMNW `pets` table — these are the exact `species.id` values the worker sees:

| Edition | Pet | `species.id` |
|:---|:---|---:|
| Vanilla CE (2004) | Panda Cub | 92 |
| Vanilla CE (2004) | Mini Diablo | 93 |
| Vanilla CE (2004) | Zergling | 94 |
| TBC CE (2007) | Netherwhelp | 131 |
| WotLK CE (2008) | Frosty | 188 |
| Cata CE (2010) | Lil' Deathwing | 268 |
| MoP CE (2012) | Lucky Quilen Cub | 671 |
| WoD CE (2014) | Dread Hatchling | 1386 |
| Legion CE (2016) | Nibbles | 1691 |
| BfA CE (2018) | Tottle | 2143 |
| SL CE (2020) | Anima Wyrmling | 2779 |
| DF CE (2022) | Murkastrasza | 3175 |
| TWW CE (2024) | Squally | 4266 |

**Deliberate exclusions** (lookalikes that would pollute the map):

| Pet | `species.id` | Why excluded |
|:---|---:|:---|
| Fel Pup | 1660 | Free in-game reward from the Ceraxas rare (Tanaan Jungle, 6.2) — not a CE pet |
| Drakks | 3177 | Dragonflight Epic Edition digital pre-purchase pet — mass market, not physical CE |

Vanilla nuance: a vanilla CE code originally granted **one** of the three pets; modern redemption
grants **all three**. All three belong to one edition — cluster counting is **per expansion, not
per pet** (§4.1).

### 3.2 CE Feats of Strength Achievement IDs (verified via Wowhead)

| FoS achievement | `id` | Edition |
|:---|---:|:---|
| Collector's Edition: Mini-Diablo | 662 | Vanilla |
| Collector's Edition: Panda | 663 | Vanilla |
| Collector's Edition: Zergling | 664 | Vanilla |
| Collector's Edition: Netherwhelp | 665 | TBC |
| Collector's Edition: Frost Wyrm Whelp (Frosty) | 683 | WotLK |
| Collector's Edition: Lil' Deathwing | 5377 | Cata |
| Collector's Edition: Lucky Quilen Cub | 6848 | MoP |
| Collector's Edition: Dread Hatchling | 8917 | WoD |
| Collector's Edition: Nibbles | 10321 | Legion |
| Collector's Edition: Tottle | 12232 | BfA |

No CE pet FoS exists for SL/DF/TWW — coverage for those editions is structurally impossible.

### 3.3 Thresholds

| Constant | Value | Rationale |
|:---|---:|:---|
| `CHARACTER_BLIZZARD_EMPLOYEE_CE_MIN_EDITIONS_SAME_DAY` | 2 | ≥ 2 distinct expansions' FoS on one UTC day — a natural collector redeems codes years apart; an employee grant lands on the hire date |
| `CHARACTER_BLIZZARD_EMPLOYEE_CE_SUSPECT_SPECIES` | 4 | Article's "≥ 4 collector's editions" bucket (0.02% of population) |
| `MS_PER_UTC_DAY` | 86,400,000 | Same-day grouping granularity |

Timestamp plausibility reuses `CHARACTER_AGE_EPOCH_FLOOR_MS` (2008-10-14) — no FoS entry can carry
an earlier legitimate timestamp, and future timestamps are discarded.

---

## 4. Detection Logic

Patterns are evaluated in strict priority order, first match wins — mirroring
`LEVEL_BOOST_EVIDENCE` semantics: `true` = employee signature detected, `false` = signature ruled
out, `null` = inconclusive (suspected or no data).

### 4.1 Pattern A — Same-Day Multi-Edition FoS Cluster (conclusive)

Group all CE FoS entries by UTC calendar day (`Math.floor(ts / 86_400_000)`) and map each to its
expansion. If any single day hosts FoS from **≥ 2 distinct expansions**, the character carries the
hire-date signature. A vanilla CE redemption granting all three vanilla FoS the same day counts as
**one** expansion and does not fire this pattern. Verdict: `true`, evidence `CE_FOS_SAME_DAY`,
`hiredApprox` = the cluster day, `blizzardEmployeePets` = matched CE pet names.

Even though SL+ FoS do not exist, a modern hire still receives every *classic* edition at grant
time, so vanilla→BfA FoS share the hire day and Pattern A fires for recent hires as well.

### 4.2 Pattern B — Organic CE Timeline

At least one CE FoS entry exists, no day reaches the 2-expansion threshold, and **coverage is
complete**: every expansion represented among the character's owned CE pets has a FoS entry. A
typical collector redeems codes years apart. Verdict: `false`, evidence `CE_TIMELINE_ORGANIC`.
When pets data is absent, coverage is vacuously complete. The coverage condition prevents
mislabeling as "organic" while FoS IDs cover only part of the owned set.

### 4.3 Pattern C — Multi-CE Pets Without Timestamp Coverage

≥ 4 distinct CE species in the pets payload, but FoS coverage is incomplete (achievements not
scanned/errored, or owned expansions lack FoS entries — e.g. any SL/DF/TWW pet). Suspected,
unverifiable. Verdict: `null`, evidence `MULTI_CE_PETS_UNVERIFIED`. `isBlizzardEmployee == null`
re-arms the achievements scan on the next sync (§7).

### 4.4 Pattern D — No CE Pets

Pets payload parsed successfully and contains zero CE species. Verdict: `false`, evidence
`NO_CE_PETS`.

### 4.5 Pattern E — Indeterminate

Anything else (pets payload unavailable, or 1–3 CE species without a verdict). Verdict: `null`,
evidence `INDETERMINATE`.

### 4.6 Decision Matrix

| # | FoS same-day cluster (≥2 expansions) | CE FoS present | CE species (pets) | Coverage | Verdict | Evidence |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| A | ✅ | ✅ | any | any | `true` | `CE_FOS_SAME_DAY` |
| B | ❌ | ✅ | any | complete | `false` | `CE_TIMELINE_ORGANIC` |
| C | ❌ | any | ≥ 4 | incomplete | `null` | `MULTI_CE_PETS_UNVERIFIED` |
| D | — | — | 0 | — | `false` | `NO_CE_PETS` |
| E | — | — | otherwise | — | `null` | `INDETERMINATE` |

No class gating is required (contrast: boost detection excludes hero classes). Pet ownership and
FoS timestamps are class-independent.

---

## 5. Detection Utils

`libs/resources/src/utils/character-employee.utils.ts`, mirroring `character-age.utils.ts`
conventions (single-pass, `ReadonlyArray` inputs, pure, early returns). Two functions:

```typescript
collectBlizzardEmployeeFos(entries: ReadonlyArray<ICharacterAchievementEntry>): BlizzardEmployeeFosEntry[]
```

Pure extraction of CE FoS entries with plausible timestamps. Runs **service-side**
(`getAchievements`), where the raw achievements payload lives, so the timestamped "when" pillar
travels to the worker without leaking the whole response around.

```typescript
detectBlizzardEmployeeSignature(
  pets: ReadonlyArray<IPetType> | null,
  fos: ReadonlyArray<BlizzardEmployeeFosEntry> | null,
): Partial<BlizzardEmployeeSignature>
```

Full pattern logic A→E. `null` pets = endpoint unavailable; `null` fos = achievements not scanned.
`blizzardEmployeePets` is the sorted unique list of matched `species.name` (`null` when pets data
is absent). `hiredApprox` = UTC midnight of the Pattern A cluster day.

Both inputs are required in one call because Pattern B's coverage check needs them together — this
is why the worker runs detection once, after all endpoints settle (§7), instead of assigning
partial verdicts per endpoint.

---

## 6. Entity & Storage

### 6.1 Columns on `CharactersEntity` (`libs/pg/src/entity/characters.entity.ts`)

Placed after the `level_boosted_at` family, mirroring its style:

| Property | Column | Type |
|:---|:---|:---|
| `isBlizzardEmployee` | `is_blizzard_employee` | `boolean null` |
| `blizzardEmployeeEvidence` | `blizzard_employee_evidence` | `varchar null` |
| `blizzardEmployeePets` | `blizzard_employee_pets` | `text[] null` |
| `hiredApprox` | `hired_approx` | `timestamptz null` |

Index: `@Index('ix__characters__is_blizzard_employee', ['isBlizzardEmployee'], {})`.

### 6.2 No SQL Migration

TypeORM `synchronize: true` (`libs/configuration/src/postgres.config.ts`) applies the new columns
and index on boot — the same path the level-boost columns took (commit `6ff86e11` added them with
no migration file). The `migrations/` directory is reserved for data fixes.

### 6.3 No Backfill

Per-species pet ownership is **not** stored (only `hashA`/`hashB` checksums and counts — not
invertible). Verdicts accumulate as characters re-sync through the worker.

---

## 7. Worker Integration (`apps/osint/src/workers/characters.worker.ts`)

### 7.1 Scan gate

`isScanNeeded` gains one clause — `|| characterEntity.isBlizzardEmployee == null` — re-arming the
achievements fetch for unset **and** suspected (`MULTI_CE_PETS_UNVERIFIED`) characters. Settled
`true`/`false` verdicts keep the gate closed (same settle semantics as boost detection).

### 7.2 Single detection call site

In `fetchAndUpdateCharacterData`:

1. After `batchedAllSettled`, keep the pets payload: `const petsPayload = petsResult.status === 'fulfilled' ? petsResult.value : null;`
2. After all `process*Result` steps (and only when `isScanNeeded`):

```typescript
const employeeSignature = detectBlizzardEmployeeSignature(
  petsPayload?.pets ?? null,
  achievementsResult.status === 'fulfilled' ? (achievementsResult.value?.employeeFos ?? null) : null,
);
Object.assign(characterEntity, employeeSignature);
```

One call with both inputs = correct coverage checks and no mid-sync verdict clobbering. Zero
additional Blizzard API calls — both payloads are already in memory.

### 7.3 Service extension

`getAchievements` (`apps/osint/src/services/character.service.ts`) returns
`CharacterAchievementsScan`, spreading the age/boost verdict plus
`employeeFos: collectBlizzardEmployeeFos(response.achievements)`.

### 7.4 Response DTO

`CharacterResponseDto` exposes the four fields with `@ApiProperty` blocks mirroring the boost
fields (boolean/nullable, enum `BLIZZARD_EMPLOYEE_EVIDENCE`, string array, date-time).

---

## 8. TypeScript Interfaces

```typescript
// libs/resources/src/types/osint/osint.interface.ts
export interface BlizzardEmployeeFosEntry {
  achievementId: number;
  expansion: EXPANSIONS;
  timestamp: number;
}

export interface BlizzardEmployeeSignature {
  isBlizzardEmployee: boolean | null;
  blizzardEmployeeEvidence: BLIZZARD_EMPLOYEE_EVIDENCE | null;
  blizzardEmployeePets: string[] | null;
  hiredApprox: Date | null;
}

export type CharacterAchievementsScan = Partial<CharacterAge> & { employeeFos?: BlizzardEmployeeFosEntry[] };
```

`CharacterEndpointTasks[5]` and `processAchievementsResult` use `CharacterAchievementsScan`.

---

## 9. Marker Verification Record

All species IDs were resolved from the CMNW `pets` table (populated from live Blizzard payloads);
FoS IDs from Wowhead achievement pages. Corrections made during verification:

1. **Fel Pup (1660) removed** — it is a Tanaan Jungle rare drop, not a CE pet. The Legion CE pet is
   **Nibbles (1691)**, FoS 10321.
2. **Drakks (3177) excluded** — Dragonflight Epic Edition digital pre-purchase, mass market.
3. **MoP CE pet is "Lucky Quilen Cub" (671)**, not "Lucky".
4. Later-edition CE pets confirmed: Anima Wyrmling (2779, SL), Murkastrasza (3175, DF physical CE),
   Squally (4266, TWW).
5. **No CE pet FoS exists after BfA** — Shadowlands/Dragonflight/The War Within CEs grant no
   achievement; timestamp coverage for those editions is structurally impossible and the coverage
   rules degrade to Pattern C/E accordingly.

Optional future verification: the exact FoS ID for Anima Wyrmling (SL), if one exists, would let
SL-only collectors reach Pattern B; not required for Pattern A to function.

---

## 10. Worked Examples

### 10.1 Employee Hire Signature — Pattern A

FoS: `{663 Vanilla: 2015-05-10, 664 Vanilla: 2015-05-10, 665 TBC: 2015-05-10}`; pets include Panda
Cub + Netherwhelp + Frosty + Lil' Deathwing:

```json
{
  "isBlizzardEmployee": true,
  "blizzardEmployeeEvidence": "CE_FOS_SAME_DAY",
  "blizzardEmployeePets": ["Frosty", "Lil' Deathwing", "Netherwhelp", "Panda Cub"],
  "hiredApprox": "2015-05-10T00:00:00.000Z"
}
```

### 10.2 Organic Collector — Pattern B

FoS spread across years: `{662: 2011-03-04, 665: 2014-11-30, 5377: 2014-12-02}`; owned CE pets are
exactly vanilla + TBC + Cata, all covered:

```json
{ "isBlizzardEmployee": false, "blizzardEmployeeEvidence": "CE_TIMELINE_ORGANIC", "blizzardEmployeePets": ["Mini Diablo", "Lil' Deathwing", "Netherwhelp"], "hiredApprox": null }
```

### 10.3 Suspect Without Coverage — Pattern C

Pets include 5 CE species, one of them Anima Wyrmling (SL, no FoS can ever cover it):

```json
{ "isBlizzardEmployee": null, "blizzardEmployeeEvidence": "MULTI_CE_PETS_UNVERIFIED", "blizzardEmployeePets": ["Anima Wyrmling", "Netherwhelp", "Panda Cub", "Squally", "Tottle"], "hiredApprox": null }
```

---

## 11. Caveats & False Positives

1. **Probabilistic, not a flag.** The API exposes no employee flag; this detects the CE hire-date
   signature only. Matches can be wealthy collectors — the article's own confirmation.
2. **2015-era assumption.** Whether Blizzard still grants full CE sets to new hires is unknown.
   The same-day pillar stays the discriminator either way — collectors redeem codes years apart.
3. **API-hidden GM characters.** Characters with an active GM flag are hidden from the profile API;
   the target is employee personal accounts that are visible (exactly what the article found).
4. **Vanilla all-three redemption.** One modern vanilla CE code grants all three pets/FoS —
   per-expansion clustering prevents this from firing Pattern A alone.
5. **Editions without FoS.** SL/DF/TWW pets can never be timestamp-covered (no FoS exists), so
   owners of those pets can reach Pattern B only via their classic-edition coverage.
6. **Employees who already owned every CE before hire** are undetectable by construction.
7. **Guild-cluster analytics ("nests") is out of scope** for detection but falls out for free:
   `SELECT guild_guid, count(*) FROM characters WHERE is_blizzard_employee GROUP BY 1` once
   verdicts accumulate.

---

## 12. Quick Reference

```
pets payload ──► WHAT: species.id ∩ CHARACTER_BLIZZARD_EMPLOYEE_CE_PETS ──► matched pets + expansions
achievements ──► WHEN: FoS ids ∩ CHARACTER_BLIZZARD_EMPLOYEE_CE_FOS_ACHIEVEMENTS ──► per-expansion day clusters

A  ≥2 expansions' FoS same UTC day    → true   CE_FOS_SAME_DAY (hiredApprox = day)
B  FoS present, organic, covered      → false  CE_TIMELINE_ORGANIC
C  ≥4 species, coverage incomplete    → null   MULTI_CE_PETS_UNVERIFIED
D  0 CE species                       → false  NO_CE_PETS
E  otherwise                          → null   INDETERMINATE

entity: is_blizzard_employee, blizzard_employee_evidence, blizzard_employee_pets[], hired_approx
        + ix__characters__is_blizzard_employee (synchronize:true, no SQL migration)
gate:   isScanNeeded ||= (isBlizzardEmployee == null)
files:  libs/resources/src/utils/character-employee.utils.ts (new)
        libs/resources/src/constants/osint.constants.ts (BLIZZARD_EMPLOYEE_EVIDENCE, maps, thresholds)
        libs/resources/src/types/osint/osint.interface.ts (FosEntry, Signature, CharacterAchievementsScan)
        libs/pg/src/entity/characters.entity.ts (4 columns + index)
        apps/osint/src/services/character.service.ts (getAchievements → employeeFos)
        apps/osint/src/workers/characters.worker.ts (gate, petsPayload, single detection call)
        libs/resources/src/dto/character/character-response.dto.ts (4 ApiProperty blocks)
```
