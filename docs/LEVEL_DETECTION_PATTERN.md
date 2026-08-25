Here's the complete file — copy everything inside the code block and save as `zcode-age-boost-spec.md`:

````markdown
# ZCode Spec: Character Age Recovery & Boost Detection

> **Version**: 1.0.0
> **Scope**: Single-pass achievement scan producing age estimate + boost status
> **API**: World of Warcraft Profile API — Character Achievements endpoint
> **Region**: EU (`https://eu.api.blizzard.com`)
> **Namespace**: `profile-eu`

---

## Table of Contents

2. [Achievement Data Request](#2-achievement-data-request)
3. [Achievement Tier Map](#3-achievement-tier-map)
4. [Age Recovery Logic](#4-age-recovery-logic)
5. [Boost Detection Logic](#5-boost-detection-logic)
6. [Combined Scanner](#6-combined-scanner)
7. [TypeScript Interfaces](#7-typescript-interfaces)
8. [Backoff & Retry Strategy](#8-backoff--retry-strategy)
9. [ID Verification Procedure](#9-id-verification-procedure)
10. [Worked Examples](#10-worked-examples)
11. [Quick Reference](#11-quick-reference)

## 2. Achievement Data Request

### 2.1 Endpoint

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm_slug}/{character_name}/achievements
    ?namespace=profile-eu
    &locale=en_US
    &access_token={token}
```

### 2.2 Path Parameters

| Parameter | Type | Encoding |
|:---|:---|:---|
| `realm_slug` | `string` | Lowercase, no spaces: `soulflayer` |
| `character_name` | `string` | URL-encoded: `Йердна` → `%D0%99%D0%B5%D1%80%D0%B4%D0%BD%D0%B0` |

### 2.3 Success Response (200)

```json
{
  "character": {
    "name": "Йердна",
    "id": 256731487,
    "realm": { "name": "Soulflayer", "slug": "soulflayer", "id": 1604 },
    "class": { "name": "Rogue", "id": 4 },
    "race": { "name": "Goblin", "id": 9 },
    "gender": { "name": "Male", "type": "MALE" },
    "level": 70,
    "faction": { "name": "Horde", "type": "HORDE" }
  },
  "achievements": [
    { "id": 6, "completed_timestamp": 1590969600000 },
    { "id": 7, "completed_timestamp": 1591574400000 }
  ],
  "total_quantity": 1234,
  "total_points": 2105,
  "_links": { "self": { "href": "..." } }
}
```

### 2.4 Achievement Entry Structure

| Field | Type | Description |
|:---|:---|:---|
| `id` | `number` | Achievement ID |
| `completed_timestamp` | `number` | Milliseconds since Unix epoch (UTC) |

### 2.5 Error Responses

| HTTP | Body | Status | Terminal | Action |
|:---|:---|:---|:---:|:---|
| 200 | (see above) | Proceed to scan | — | — |
| 404 | `{"code":404,"message":"Not Found"}` | `CHAR_NOT_FOUND` | ✅ | Never retry |
| 403 | `{"code":403,"message":"Forbidden"}` | `INVALID_TOKEN` | ❌ | Refresh token, retry once |
| 429 | `{}` (often empty) | `RATE_LIMITED` | ❌ | Exponential backoff, retry |
| 500 | `{"code":500,"type":"BLZWEBAPI00000500",...}` | `SERVER_ERROR` | ❌ | Retry next batch |
| 502 | Error object | `SERVER_ERROR` | ❌ | Retry next batch |
| 503 | Error object | `SERVER_ERROR` | ❌ | Retry next batch |

---

## 3. Achievement Tier Map

### 3.1 Tier Definitions

| Tier | Name | IDs | Confidence | Semantic |
|:---:|:---|:---|:---|:---|
| 0 | `ORIGINAL_LEVEL_10` | `[6]` | `HIGH` | `ON_OR_BEFORE` |
| 1 | `ORIGINAL_LEVEL_CHAIN` | `[7, 8, 9, 10, 11, 12, 13]` | `HIGH` | `ON_OR_BEFORE` |
| 2 | `EXPANSION_LEVEL_SHADOWLANDS` | `[14781, 14782, 14783, 14784, 14785, 14786]` | `MEDIUM` | `ON_OR_BEFORE` |
| 2 | `EXPANSION_LEVEL_DRAGONFLIGHT` | `[8998, 8999, 9000, 9001, 9002, 9003]` | `MEDIUM` | `ON_OR_BEFORE` |
| 2 | `EXPANSION_LEVEL_THE_WAR_WITHIN` | `[19486, 19487, 19488, 19489, 19490, 19491, 19492]` | `MEDIUM` | `ON_OR_BEFORE` |
| 3 | `EARLY_ACTIVITY_MARKERS` | `[46, 728, 247, 2136, 4956, 557]` | `LOW` | `ON_OR_BEFORE` |
| 4 | `BOOST_DETECTION` | `[15179, 15070, 16400, 40167]` | `VERY_LOW` | `DEFINITELY_BEFORE` |

### 3.2 Tier 2 Expansion Mapping

| Expansion | Level Range | ID Start | ID End | Boost Level |
|:---|:---|:---:|:---:|:---:|
| Shadowlands | 10–60 | 14781 | 14786 | 60 |
| Dragonflight | 10–60 | 8998 | 9003 | 60 |
| The War Within | 10–70 | 19486 | 19492 | 70 |

### 3.3 Tier 4 Boost Achievement Mapping

| ID | Name | Boost Type |
|:---|:---|:---|
| 15179 | A Fresh Start | Shadowlands → 60 |
| 15070 | Boosted | Shadowlands → 50 |
| 16400 | A Hero's Welcome | Dragonflight → 60 |
| 40167 | Ready for War | The War Within → 70 |

### 3.4 Tier 3 Activity Marker Descriptions

| ID | Expected Name | Category | Typical Delta from Creation |
|:---|:---|:---|:---|
| 46 | You'll Get An Axe From Me | Quest | Minutes to hours |
| 728 | An Honorable Kill | PvP | Minutes to hours |
| 247 | 10 Honorable Kills | PvP | Hours to days |
| 2136 | A Simple Requisition | Quest | Minutes to hours |
| 4956 | Know Your Enemy | Quest | Hours to days |
| 557 | Journey to the Center of the World | Exploration | Hours to days |

> ⚠️ **Tier 2, 3, and 4 IDs MUST be verified via the Game Data API before production use.** See [Section 9](#9-id-verification-procedure).

### 3.5 Timestamp Sanity Bounds

```
MINIMUM: 1198368000000  →  2007-12-24T00:00:00.000Z  (WoW API epoch)
MAXIMUM: Date.now()     →  current UTC time

If timestamp < MINIMUM or > MAXIMUM → discard, treat as not found
```

---

## 4. Age Recovery Logic

### 4.1 Core Rule

```
Collect ALL found timestamps from ALL tiers → pick MINIMUM → that is created_approx
Semantic: "character was created ON OR BEFORE this date"
```

### 4.2 Determination Flow

```
HTTP status != 200  →  route to error handler (see Section 8)

HTTP 200:
  ├── achievements key missing or not array  →  AGE_UNAVAILABLE
  ├── achievements array empty               →  AGE_UNAVAILABLE (reason: NO_ACHIEVEMENTS_AT_ALL)
  ├── scan for tracked IDs (all tiers)
  │   ├── any found with valid timestamp     →  AGE_RECOVERED (earliest timestamp, tier confidence)
  │   └── none found                         →  AGE_UNAVAILABLE (reason: NO_TRACKED_ACHIEVEMENTS)
  └── timestamp validation
      ├── ts <= 0                            →  discard entry
      ├── ts < 1198368000000                 →  discard entry
      └── ts > Date.now()                    →  discard entry
```

### 4.3 Confidence Levels

| Confidence | Source Tier | UI Display Suffix |
|:---|:---|:---|
| `HIGH` | Tier 0 or Tier 1 | *(no suffix)* |
| `MEDIUM` | Tier 2 | *(estimated)* |
| `LOW` | Tier 3 | *(rough estimate)* |
| `VERY_LOW` | Tier 4 | *(boost date only)* |

---

## 5. Boost Detection Logic

### 5.1 Detection Patterns (Priority Order)

```
PATTERN A  →  DEFINITELY_BOOSTED  →  DIRECT_ACHIEVEMENT
PATTERN C  →  DEFINITELY_BOOSTED  →  TIMESTAMP_CLUSTER
PATTERN D  →  NATURALLY_LEVELED   →  ORIGINAL_LEVEL_10_PRESENT
PATTERN B  →  VERY_LIKELY_BOOSTED →  ORIGINAL_CHAIN_ABSENT
PATTERN E  →  INDETERMINATE       →  null
```

### 5.2 Pattern A — Direct Boost Achievement

```
Condition:  ANY Tier 4 ID (15179, 15070, 16400, 40167) present in achievements[]
Result:     boost_status = "DEFINITELY_BOOSTED"
Evidence:   "DIRECT_ACHIEVEMENT"
False positive risk: 0%
```

### 5.3 Pattern C — Timestamp Clustering

```
Condition:  >= 2 Tier 2 achievements from the SAME expansion
            with IDENTICAL completed_timestamp values
Result:     boost_status = "DEFINITELY_BOOSTED"
Evidence:   "TIMESTAMP_CLUSTER"
False positive risk: 0%

Rationale:  A natural player cannot earn Level 10 and Level 20
            at the exact same millisecond. Identical timestamps
            across multiple level achievements = batch grant = boost.
```

### 5.4 Pattern D — Natural Leveling

```
Condition:  Tier 0 (ID 6) present in achievements[]
Result:     boost_status = "NATURALLY_LEVELED"
Evidence:   "ORIGINAL_LEVEL_10_PRESENT"
False positive risk: 0%
```

**Chain progression sub-analysis** (informational, does not affect boost_status):

```
originalChain = tier0 ∪ tier1, sorted by ID ascending

SEQUENTIAL:  All found IDs form a contiguous range
             AND timestamps are strictly increasing
             Example: [6, 7, 8, 9] with ts6 < ts7 < ts8 < ts9

PARTIAL:     Some IDs found but gaps exist
             Example: [6, 8, 11] — missing 7, 9, 10

ABSENT:      Zero original chain achievements found
```

### 5.5 Pattern B — Chain Gap

```
Condition:  ZERO achievements from Tier 0 ∪ Tier 1 (IDs 6-13)
            AND >= 1 achievement from Tier 2 (expansion chain)
Result:     boost_status = "VERY_LIKELY_BOOSTED"
Evidence:   "ORIGINAL_CHAIN_ABSENT"
False positive risk: ~2% (extreme data corruption)

Rationale:  Original level achievements are automatically granted
            when a character reaches those levels. The only way to
            have none of them but have expansion-level achievements
            is if the character was boosted past all those levels.
```

### 5.6 Pattern E — Indeterminate

```
Condition:  None of patterns A, B, C, D match
Examples:
  - Only Tier 3 activity markers found
  - Partial original chain (e.g., only ID 8) with no expansion chain
  - Empty achievements array
Result:     boost_status = "INDETERMINATE"
Evidence:   null
```

### 5.7 Boost Type Inference

When boost is detected but not via Pattern A (which has explicit name), infer expansion from Tier 2 IDs:

```
IDs 14781-14786 present  →  boost_type = "SHADOWLANDS",  boost_level = 60
IDs 8998-9003  present  →  boost_type = "DRAGONFLIGHT", boost_level = 60
IDs 19486-19492 present →  boost_type = "THE_WAR_WITHIN", boost_level = 70
```

### 5.8 Boost Detection Decision Matrix

| Pattern | boost_status | boost_evidence | Required Signals | False Positive |
|:---|:---|:---|:---|:---:|
| A | `DEFINITELY_BOOSTED` | `DIRECT_ACHIEVEMENT` | Tier 4 ID present | 0% |
| C | `DEFINITELY_BOOSTED` | `TIMESTAMP_CLUSTER` | ≥2 Tier 2 IDs, same ts | 0% |
| D | `NATURALLY_LEVELED` | `ORIGINAL_LEVEL_10_PRESENT` | Tier 0 ID present | 0% |
| B | `VERY_LIKELY_BOOSTED` | `ORIGINAL_CHAIN_ABSENT` | 0 original, ≥1 expansion | ~2% |
| E | `INDETERMINATE` | `null` | None of the above | N/A |

---

## 6. Combined Scanner

### 6.1 Execution Order

The scanner evaluates patterns in strict priority order. First match wins:

```
1. Partition achievements[] into tier0, tier1, tier2, tier3, tier4
2. Build originalChain = tier0 ∪ tier1 (sorted by ID)

3. IF tier4.length >= 1
     → PATTERN A: DEFINITELY_BOOSTED, DIRECT_ACHIEVEMENT
     → Age: earliest timestamp across tier2 ∪ tier3 ∪ tier4
     → RETURN

4. IF tier2 has timestamp cluster (>=2 entries, identical ts)
     → PATTERN C: DEFINITELY_BOOSTED, TIMESTAMP_CLUSTER
     → Age: cluster timestamp
     → RETURN

5. IF tier0.length >= 1
     → PATTERN D: NATURALLY_LEVELED, ORIGINAL_LEVEL_10_PRESENT
     → Age: tier0[0].timestamp
     → Analyze chain_progression on originalChain
     → RETURN

6. IF originalChain.length == 0 AND tier2.length >= 1
     → PATTERN B: VERY_LIKELY_BOOSTED, ORIGINAL_CHAIN_ABSENT
     → Age: earliest tier2 timestamp
     → Infer boost_type from tier2 IDs
     → RETURN

7. IF any tracked IDs found (across any tier)
     → PATTERN E: INDETERMINATE
     → Age: earliest found timestamp with tier confidence
     → RETURN

8. ELSE
     → PATTERN E: INDETERMINATE
     → Age: AGE_UNAVAILABLE
     → RETURN
```

### 6.2 Timestamp Cluster Detection

```
Group tier2 entries by completed_timestamp
For each group with >= 2 members:
  → That is a cluster
  → If multiple clusters exist, pick the largest
  → If tied, pick the one with the earliest timestamp
```

### 6.3 Age + Boost Interaction Rules

| boost_status | age_confidence | Rationale |
|:---|:---|:---|
| `NATURALLY_LEVELED` | `HIGH` | Level 10 timestamp, tight bound |
| `DEFINITELY_BOOSTED` + `DIRECT_ACHIEVEMENT` | `VERY_LOW` | Boost date only; character could be years older |
| `DEFINITELY_BOOSTED` + `TIMESTAMP_CLUSTER` | `MEDIUM` | Expansion level date; character could be older |
| `VERY_LIKELY_BOOSTED` | `MEDIUM` | Same as TIMESTAMP_CLUSTER logic |
| `INDETERMINATE` | varies by tier | Use tier's native confidence |

---

## 7. TypeScript Interfaces

### 7.1 API Response Types

```typescript
interface OAuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

interface BlizzardAchievementEntry {
  id: number;
  completed_timestamp: number;
}

interface BlizzardCharacterAchievementsResponse {
  character: {
    name: string;
    id: number;
    realm: { name: string; slug: string; id: number };
    class: { name: string; id: number };
    race: { name: string; id: number };
    gender: { name: string; type: "MALE" | "FEMALE" };
    level: number;
    faction: { name: string; type: "ALLIANCE" | "HORDE" };
  };
  achievements: BlizzardAchievementEntry[];
  total_quantity: number;
  total_points: number;
}

interface BlizzardErrorResponse {
  code: number;
  message: string;
  type?: string;
  detail?: string;
}
```

### 7.2 Tier Configuration Types

```typescript
type AgeConfidence = "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
type AgeSemantic = "ON_OR_BEFORE" | "DEFINITELY_BEFORE";

interface AchievementTier {
  tier: number;
  name: string;
  ids: number[];
  confidence: AgeConfidence;
  semantic: AgeSemantic;
}

interface ExpansionRange {
  name: string;
  boostLevel: number;
  idStart: number;
  idEnd: number;
}

interface BoostAchievement {
  id: number;
  name: string;
  boostType: string;
  boostLevel: number;
}
```

### 7.3 Result Types

```typescript
type AgeRecoveryStatus =
  | "AGE_RECOVERED"
  | "AGE_UNAVAILABLE"
  | "CHAR_NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_TOKEN"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT";

type BoostStatus =
  | "DEFINITELY_BOOSTED"
  | "VERY_LIKELY_BOOSTED"
  | "NATURALLY_LEVELED"
  | "INDETERMINATE";

type BoostEvidence =
  | "DIRECT_ACHIEVEMENT"
  | "TIMESTAMP_CLUSTER"
  | "ORIGINAL_CHAIN_ABSENT"
  | "ORIGINAL_LEVEL_10_PRESENT"
  | null;

type ChainProgression = "SEQUENTIAL" | "PARTIAL" | "ABSENT";

interface CombinedScanResult {
  // Age recovery
  age_status: AgeRecoveryStatus;
  created_approx: string | null;
  age_confidence: AgeConfidence | null;
  age_source: string | null;
  age_achievement_id: number | null;
  age_raw_timestamp_ms: number | null;
  matched_tier: number | null;

  // Boost detection
  boost_status: BoostStatus;
  boost_evidence: BoostEvidence;
  boost_type: string | null;
  boost_level: number | null;
  boost_achievement_id: number | null;
  boost_achievement_name: string | null;
  boost_timestamp: string | null;
  clustered_ids: number[] | null;
  cluster_size: number | null;

  // Chain analysis
  original_chain_found: number;
  original_chain_total: number;
  chain_progression: ChainProgression;
  expansion_chain_found: number;
  tier3_found: number;
  tier4_found: number;

  // Error context (populated on failure)
  reason: string | null;
  retry_after_seconds: number | null;
  http_status: number | null;
}
```

### 7.4 Tier Configuration Data

```typescript
const AGE_TIERS: AchievementTier[] = [
  {
    tier: 0,
    name: "ORIGINAL_LEVEL_10",
    ids: [6],
    confidence: "HIGH",
    semantic: "ON_OR_BEFORE",
  },
  {
    tier: 1,
    name: "ORIGINAL_LEVEL_CHAIN",
    ids: [7, 8, 9, 10, 11, 12, 13],
    confidence: "HIGH",
    semantic: "ON_OR_BEFORE",
  },
  {
    tier: 2,
    name: "EXPANSION_LEVEL_SHADOWLANDS",
    ids: [14781, 14782, 14783, 14784, 14785, 14786],
    confidence: "MEDIUM",
    semantic: "ON_OR_BEFORE",
  },
  {
    tier: 2,
    name: "EXPANSION_LEVEL_DRAGONFLIGHT",
    ids: [8998, 8999, 9000, 9001, 9002, 9003],
    confidence: "MEDIUM",
    semantic: "ON_OR_BEFORE",
  },
  {
    tier: 2,
    name: "EXPANSION_LEVEL_THE_WAR_WITHIN",
    ids: [19486, 19487, 19488, 19489, 19490, 19491, 19492],
    confidence: "MEDIUM",
    semantic: "ON_OR_BEFORE",
  },
  {
    tier: 3,
    name: "EARLY_ACTIVITY_MARKERS",
    ids: [46, 728, 247, 2136, 4956, 557],
    confidence: "LOW",
    semantic: "ON_OR_BEFORE",
  },
  {
    tier: 4,
    name: "BOOST_DETECTION",
    ids: [15179, 15070, 16400, 40167],
    confidence: "VERY_LOW",
    semantic: "DEFINITELY_BEFORE",
  },
];

const EXPANSION_RANGES: ExpansionRange[] = [
  { name: "SHADOWLANDS", boostLevel: 60, idStart: 14781, idEnd: 14786 },
  { name: "DRAGONFLIGHT", boostLevel: 60, idStart: 8998, idEnd: 9003 },
  { name: "THE_WAR_WITHIN", boostLevel: 70, idStart: 19486, idEnd: 19492 },
];

const BOOST_ACHIEVEMENTS: BoostAchievement[] = [
  { id: 15179, name: "A Fresh Start", boostType: "SHADOWLANDS", boostLevel: 60 },
  { id: 15070, name: "Boosted", boostType: "SHADOWLANDS", boostLevel: 50 },
  { id: 16400, name: "A Hero's Welcome", boostType: "DRAGONFLIGHT", boostLevel: 60 },
  { id: 40167, name: "Ready for War", boostType: "THE_WAR_WITHIN", boostLevel: 70 },
];

// Derived lookup structures (build once at startup)
const ALL_TRACKED_IDS: Set<number> = new Set(AGE_TIERS.flatMap(t => t.ids));
const ID_TO_TIER: Map<number, AchievementTier> = new Map();
for (const tier of AGE_TIERS) {
  for (const id of tier.ids) {
    ID_TO_TIER.set(id, tier);
  }
}
const BOOST_ID_MAP: Map<number, BoostAchievement> = new Map(
  BOOST_ACHIEVEMENTS.map(b => [b.id, b])
);
```

### 7.5 Helper Function Types

```typescript
interface TimestampCluster {
  timestamp: number;
  ids: number[];
  size: number;
  expansion: string | null;
  boostLevel: number | null;
}

interface TierPartition {
  tier0: BlizzardAchievementEntry[];
  tier1: BlizzardAchievementEntry[];
  tier2: BlizzardAchievementEntry[];
  tier3: BlizzardAchievementEntry[];
  tier4: BlizzardAchievementEntry[];
  originalChain: BlizzardAchievementEntry[];
}
```

### 7.6 Helper Functions

```typescript
function partitionByTier(
  achievements: BlizzardAchievementEntry[]
): TierPartition {
  const tier0: BlizzardAchievementEntry[] = [];
  const tier1: BlizzardAchievementEntry[] = [];
  const tier2: BlizzardAchievementEntry[] = [];
  const tier3: BlizzardAchievementEntry[] = [];
  const tier4: BlizzardAchievementEntry[] = [];

  for (const ach of achievements) {
    const tier = ID_TO_TIER.get(ach.id);
    if (!tier || ach.completed_timestamp <= 0) continue;

    switch (tier.tier) {
      case 0: tier0.push(ach); break;
      case 1: tier1.push(ach); break;
      case 2: tier2.push(ach); break;
      case 3: tier3.push(ach); break;
      case 4: tier4.push(ach); break;
    }
  }

  const originalChain = [...tier0, ...tier1].sort((a, b) => a.id - b.id);

  return { tier0, tier1, tier2, tier3, tier4, originalChain };
}

function findLargestTimestampCluster(
  entries: BlizzardAchievementEntry[]
): TimestampCluster | null {
  const groups = new Map<number, number[]>();

  for (const entry of entries) {
    const existing = groups.get(entry.completed_timestamp) ?? [];
    existing.push(entry.id);
    groups.set(entry.completed_timestamp, existing);
  }

  let largest: TimestampCluster | null = null;

  for (const [timestamp, ids] of groups) {
    if (ids.length < 2) continue;

    if (!largest || ids.length > largest.size) {
      const expansion = inferExpansionFromIds(ids);
      largest = {
        timestamp,
        ids,
        size: ids.length,
        expansion: expansion?.name ?? null,
        boostLevel: expansion?.boostLevel ?? null,
      };
    }
  }

  return largest;
}

function inferExpansionFromIds(
  ids: number[]
): ExpansionRange | null {
  for (const range of EXPANSION_RANGES) {
    if (ids.some(id => id >= range.idStart && id <= range.idEnd)) {
      return range;
    }
  }
  return null;
}

function inferBoostTypeFromTier2(
  entries: BlizzardAchievementEntry[]
): { expansion: string; boostLevel: number } | null {
  for (const entry of entries) {
    const inferred = inferExpansionFromIds([entry.id]);
    if (inferred) {
      return { expansion: inferred.name, boostLevel: inferred.boostLevel };
    }
  }
  return null;
}

function analyzeChainProgression(
  chain: BlizzardAchievementEntry[]
): ChainProgression {
  if (chain.length === 0) return "ABSENT";
  if (chain.length === 1) return "PARTIAL";

  const sorted = [...chain].sort((a, b) => a.id - b.id);

  // Check strictly increasing timestamps
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].completed_timestamp <= sorted[i - 1].completed_timestamp) {
      return "PARTIAL";
    }
  }

  // Check contiguous ID range
  const ids = sorted.map(a => a.id);
  for (let i = 0; i < ids.length - 1; i++) {
    if (ids[i + 1] - ids[i] !== 1) return "PARTIAL";
  }

  return "SEQUENTIAL";
}

function isValidTimestamp(ms: number): boolean {
  const MIN = 1198368000000; // 2007-12-24
  const MAX = Date.now();
  return ms > 0 && ms >= MIN && ms <= MAX;
}

function msToISO(ms: number): string {
  return new Date(ms / 1000).toISOString();
}

function earliestTimestamp(
  entries: BlizzardAchievementEntry[]
): number | null {
  if (entries.length === 0) return null;
  return Math.min(...entries.map(e => e.completed_timestamp));
}
```

### 7.7 Main Scanner Function

```typescript
function scanForAgeAndBoost(
  achievements: BlizzardAchievementEntry[]
): CombinedScanResult {
  const EMPTY_RESULT: CombinedScanResult = {
    age_status: "AGE_UNAVAILABLE",
    created_approx: null,
    age_confidence: null,
    age_source: null,
    age_achievement_id: null,
    age_raw_timestamp_ms: null,
    matched_tier: null,
    boost_status: "INDETERMINATE",
    boost_evidence: null,
    boost_type: null,
    boost_level: null,
    boost_achievement_id: null,
    boost_achievement_name: null,
    boost_timestamp: null,
    clustered_ids: null,
    cluster_size: null,
    original_chain_found: 0,
    original_chain_total: 8,
    chain_progression: "ABSENT",
    expansion_chain_found: 0,
    tier3_found: 0,
    tier4_found: 0,
    reason: null,
    retry_after_seconds: null,
    http_status: null,
  };

  const p = partitionByTier(achievements);

  const baseStats = {
    original_chain_found: p.originalChain.length,
    original_chain_total: 8,
    chain_progression: analyzeChainProgression(p.originalChain) as ChainProgression,
    expansion_chain_found: p.tier2.length,
    tier3_found: p.tier3.length,
    tier4_found: p.tier4.length,
  };

  // ── PATTERN A: Direct boost achievement ──
  if (p.tier4.length > 0) {
    const boostAch = p.tier4[0];
    const boostMeta = BOOST_ID_MAP.get(boostAch.id);
    const inferred = inferBoostTypeFromTier2(p.tier2);
    const allForAge = [...p.tier2, ...p.tier3, ...p.tier4].filter(
      e => isValidTimestamp(e.completed_timestamp)
    );
    const earliest = earliestTimestamp(allForAge);

    if (earliest === null) {
      return { ...EMPTY_RESULT, ...baseStats, reason: "ALL_TIMESTAMPS_INVALID" };
    }

    return {
      age_status: "AGE_RECOVERED",
      created_approx: msToISO(earliest),
      age_confidence: "VERY_LOW",
      age_source: "BOOST_DETECTION",
      age_achievement_id: boostAch.id,
      age_raw_timestamp_ms: earliest,
      matched_tier: 4,
      boost_status: "DEFINITELY_BOOSTED",
      boost_evidence: "DIRECT_ACHIEVEMENT",
      boost_type: boostMeta?.boostType ?? inferred?.expansion ?? null,
      boost_level: boostMeta?.boostLevel ?? inferred?.boostLevel ?? null,
      boost_achievement_id: boostAch.id,
      boost_achievement_name: boostMeta?.name ?? null,
      boost_timestamp: msToISO(boostAch.completed_timestamp),
      clustered_ids: null,
      cluster_size: null,
      ...baseStats,
      reason: null,
      retry_after_seconds: null,
      http_status: null,
    };
  }

  // ── PATTERN C: Timestamp clustering ──
  const cluster = findLargestTimestampCluster(p.tier2);
  if (cluster) {
    const inferred = inferBoostTypeFromTier2(p.tier2);
    return {
      age_status: "AGE_RECOVERED",
      created_approx: msToISO(cluster.timestamp),
      age_confidence: "MEDIUM",
      age_source: "EXPANSION_LEVEL_CHAINS",
      age_achievement_id: cluster.ids[0],
      age_raw_timestamp_ms: cluster.timestamp,
      matched_tier: 2,
      boost_status: "DEFINITELY_BOOSTED",
      boost_evidence: "TIMESTAMP_CLUSTER",
      boost_type: cluster.expansion ?? inferred?.expansion ?? null,
      boost_level: cluster.boostLevel ?? inferred?.boostLevel ?? null,
      boost_achievement_id: null,
      boost_achievement_name: null,
      boost_timestamp: msToISO(cluster.timestamp),
      clustered_ids: cluster.ids,
      cluster_size: cluster.size,
      ...baseStats,
      reason: null,
      retry_after_seconds: null,
      http_status: null,
    };
  }

  // ── PATTERN D: Original Level 10 present ──
  if (p.tier0.length > 0) {
    const level10 = p.tier0[0];
    return {
      age_status: "AGE_RECOVERED",
      created_approx: msToISO(level10.completed_timestamp),
      age_confidence: "HIGH",
      age_source: "ORIGINAL_LEVEL_10",
      age_achievement_id: 6,
      age_raw_timestamp_ms: level10.completed_timestamp,
      matched_tier: 0,
      boost_status: "NATURALLY_LEVELED",
      boost_evidence: "ORIGINAL_LEVEL_10_PRESENT",
      boost_type: null,
      boost_level: null,
      boost_achievement_id: null,
      boost_achievement_name: null,
      boost_timestamp: null,
      clustered_ids: null,
      cluster_size: null,
      ...baseStats,
      reason: null,
      retry_after_seconds: null,
      http_status: null,
    };
  }

  // ── PATTERN B: Original chain absent, expansion chain present ──
  if (p.originalChain.length === 0 && p.tier2.length > 0) {
    const inferred = inferBoostTypeFromTier2(p.tier2);
    const validTier2 = p.tier2.filter(e => isValidTimestamp(e.completed_timestamp));
    const earliest = earliestTimestamp(validTier2);

    if (earliest === null) {
      return { ...EMPTY_RESULT, ...baseStats, reason: "ALL_TIMESTAMPS_INVALID" };
    }

    return {
      age_status: "AGE_RECOVERED",
      created_approx: msToISO(earliest),
      age_confidence: "MEDIUM",
      age_source: "EXPANSION_LEVEL_CHAINS",
      age_achievement_id: validTier2.find(e => e.completed_timestamp === earliest)!.id,
      age_raw_timestamp_ms: earliest,
      matched_tier: 2,
      boost_status: "VERY_LIKELY_BOOSTED",
      boost_evidence: "ORIGINAL_CHAIN_ABSENT",
      boost_type: inferred?.expansion ?? null,
      boost_level: inferred?.boostLevel ?? null,
      boost_achievement_id: null,
      boost_achievement_name: null,
      boost_timestamp: null,
      clustered_ids: null,
      cluster_size: null,
      ...baseStats,
      reason: null,
      retry_after_seconds: null,
      http_status: null,
    };
  }

  // ── PATTERN E: Indeterminate — try age from any remaining data ──
  const allRemaining = [
    ...p.originalChain,
    ...p.tier2,
    ...p.tier3,
  ].filter(e => isValidTimestamp(e.completed_timestamp));

  if (allRemaining.length > 0) {
    const earliest = earliestTimestamp(allRemaining)!;
    const bestEntry = allRemaining.find(e => e.completed_timestamp === earliest)!;
    const bestTier = ID_TO_TIER.get(bestEntry.id)!;

    return {
      age_status: "AGE_RECOVERED",
      created_approx: msToISO(earliest),
      age_confidence: bestTier.confidence,
      age_source: bestTier.name,
      age_achievement_id: bestEntry.id,
      age_raw_timestamp_ms: earliest,
      matched_tier: bestTier.tier,
      boost_status: "INDETERMINATE",
      boost_evidence: null,
      boost_type: null,
      boost_level: null,
      boost_achievement_id: null,
      boost_achievement_name: null,
      boost_timestamp: null,
      clustered_ids: null,
      cluster_size: null,
      ...baseStats,
      reason: null,
      retry_after_seconds: null,
      http_status: null,
    };
  }

  // ── Nothing at all ──
  return {
    ...EMPTY_RESULT,
    ...baseStats,
    reason:
      p.originalChain.length === 0 && p.tier2.length === 0 && p.tier3.length === 0
        ? "NO_TRACKED_ACHIEVEMENTS"
        : "ALL_TIMESTAMPS_INVALID",
  };
}
```

### 7.8 HTTP Response Router

```typescript
function handleAchievementResponse(
  httpStatus: number,
  body: string | null,
  attempt: number
): CombinedScanResult {
  const ERROR_BASE: CombinedScanResult = {
    age_status: "AGE_UNAVAILABLE",
    created_approx: null,
    age_confidence: null,
    age_source: null,
    age_achievement_id: null,
    age_raw_timestamp_ms: null,
    matched_tier: null,
    boost_status: "INDETERMINATE",
    boost_evidence: null,
    boost_type: null,
    boost_level: null,
    boost_achievement_id: null,
    boost_achievement_name: null,
    boost_timestamp: null,
    clustered_ids: null,
    cluster_size: null,
    original_chain_found: 0,
    original_chain_total: 8,
    chain_progression: "ABSENT",
    expansion_chain_found: 0,
    tier3_found: 0,
    tier4_found: 0,
    reason: null,
    retry_after_seconds: null,
    http_status: httpStatus,
  };

  if (httpStatus === 404) {
    return { ...ERROR_BASE, age_status: "CHAR_NOT_FOUND", reason: "HTTP_404" };
  }

  if (httpStatus === 403) {
    return {
      ...ERROR_BASE,
      age_status: "INVALID_TOKEN",
      reason: "HTTP_403_TOKEN_EXPIRED",
      retry_after_seconds: 0,
    };
  }

  if (httpStatus === 429) {
    const delay = Math.min(Math.pow(2, attempt) * 5, 60);
    return {
      ...ERROR_BASE,
      age_status: "RATE_LIMITED",
      reason: "HTTP_429",
      retry_after_seconds: delay,
    };
  }

  if (httpStatus >= 500) {
    return { ...ERROR_BASE, age_status: "SERVER_ERROR", reason: `HTTP_${httpStatus}` };
  }

  if (httpStatus !== 200) {
    return { ...ERROR_BASE, reason: `UNEXPECTED_HTTP_${httpStatus}` };
  }

  if (!body) {
    return { ...ERROR_BASE, reason: "EMPTY_BODY_ON_200" };
  }

  let parsed: BlizzardCharacterAchievementsResponse;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ...ERROR_BASE, reason: "INVALID_JSON" };
  }

  if (!Array.isArray(parsed.achievements)) {
    return { ...ERROR_BASE, reason: "MALFORMED_NO_ACHIEVEMENTS_KEY" };
  }

  if (parsed.achievements.length === 0) {
    return { ...ERROR_BASE, reason: "NO_ACHIEVEMENTS_AT_ALL" };
  }

  return scanForAgeAndBoost(parsed.achievements);
}
```

---

## 8. Backoff & Retry Strategy

### 8.1 Retry Eligibility Matrix

| age_status | Retryable | Max Retries | Special Action |
|:---|:---:|:---:|:---|
| `CHAR_NOT_FOUND` | ❌ | 0 | Mark terminal |
| `AGE_UNAVAILABLE` | ❌ | 0 | Mark terminal |
| `INVALID_TOKEN` | ✅ | 1 | Force token refresh before retry |
| `RATE_LIMITED` | ✅ | 5 | Exponential backoff |
| `SERVER_ERROR` | ✅ | 3 | Retry in next batch only |
| `NETWORK_ERROR` | ✅ | 3 | Retry in next batch only |
| `TIMEOUT` | ✅ | 3 | Retry in next batch only |
| `AGE_RECOVERED` | ❌ | 0 | Success, no retry |

### 8.2 Exponential Backoff Formula (Rate Limiting)

```
delay_seconds = min(2^attempt * 5, 60)

Attempt 0:  5s
Attempt 1:  10s
Attempt 2:  20s
Attempt 3:  40s
Attempt 4:  60s  (capped)
Attempt 5+: STOP  → mark RATE_LIMITED terminal
```

### 8.3 Batch-Level Backoff (Server Errors)

```
On SERVER_ERROR (5xx):
  - Do NOT retry immediately
  - Skip to next character in current batch
  - After batch completes, wait 30s before next batch
  - If >50% of batch failed with 5xx → wait 120s instead of 30s
  - If 3 consecutive batches have >50% failure → stop processing, log alert
```

### 8.4 Inter-Request Throttle

```
Between successful requests within a batch:
  sleep(0.15)  →  ~6.7 requests/second

Blizzard limit: ~100 requests/second
Our target:     ~7 requests/second  (conservative, avoids 429)
```

### 8.5 Retry Orchestrator

```typescript
interface RetryState {
  attempt: number;
  maxAttempts: number;
  lastError: CombinedScanResult | null;
}

function shouldRetry(result: CombinedScanResult, state: RetryState): boolean {
  if (state.attempt >= state.maxAttempts) return false;

  switch (result.age_status) {
    case "INVALID_TOKEN":
      return state.attempt === 0;
    case "RATE_LIMITED":
      return state.attempt < 5;
    case "SERVER_ERROR":
    case "NETWORK_ERROR":
    case "TIMEOUT":
      return state.attempt < 3;
    default:
      return false;
  }
}

function getRetryDelay(result: CombinedScanResult, state: RetryState): number {
  switch (result.age_status) {
    case "INVALID_TOKEN":
      return 0; // Immediate, but refresh token first
    case "RATE_LIMITED":
      return result.retry_after_seconds ?? Math.min(Math.pow(2, state.attempt) * 5, 60);
    case "SERVER_ERROR":
    case "NETWORK_ERROR":
    case "TIMEOUT":
      return 0; // Retry in next batch, no immediate delay
    default:
      return 0;
  }
}
```

### 8.6 Batch Processing Controller

```typescript
interface BatchConfig {
  batchSize: number;
  interRequestDelayMs: number;
  batchPauseSeconds: number;
  highFailurePauseSeconds: number;
  highFailureThreshold: number;
  maxConsecutiveHighFailureBatches: number;
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 20,
  interRequestDelayMs: 150,
  batchPauseSeconds: 30,
  highFailurePauseSeconds: 120,
  highFailureThreshold: 0.5,
  maxConsecutiveHighFailureBatches: 3,
};

interface BatchStats {
  total: number;
  recovered: number;
  unavailable: number;
  notFound: number;
  errors: number;
  rateLimited: number;
  failureRate: number;
}
```

---

## 9. ID Verification Procedure

### 9.1 Purpose

Tier 2, 3, and 4 achievement IDs are based on community data and **must be verified** against the Game Data API before production use. Blizzard has renamed, removed, and re-ID'd achievements across expansions.

### 9.2 Verification Endpoint

```
GET https://eu.api.blizzard.com/data/wow/achievement/{id}
    ?namespace=static-eu
    &locale=en_US
    &access_token={token}
```

### 9.3 Verification Response (200)

```json
{
  "id": 6,
  "name": "Level 10",
  "description": "Reach level 10.",
  "points": 10,
  "category": { "name": "Character", "id": 92 }
}
```

### 9.4 Verification Response (404)

```json
{
  "code": 404,
  "message": "Not Found"
}
```

### 9.5 IDs Requiring Verification

```
Tier 2:  14781, 14782, 14783, 14784, 14785, 14786,
         8998,  8999,  9000,  9001,  9002,  9003,
         19486, 19487, 19488, 19489, 19490, 19491, 19492

Tier 3:  46, 728, 247, 2136, 4956, 557

Tier 4:  15179, 15070, 16400, 40167

Total:   32 IDs
```

### 9.6 Verification Procedure

```
1. For each ID in the list above:
   a. GET /data/wow/achievement/{id}
   b. If 200:
      - Record: id, name, points, category.name
      - Mark as VERIFIED
   c. If 404:
      - Mark as REMOVED
   d. If 429:
      - Wait 60s, retry once
   e. If other error:
      - Mark as UNVERIFIED
   f. sleep(0.15) between requests

2. Generate verification report:
   ┌──────────┬──────────────────────────────┬──────────┐
   │ ID       │ Name                         │ Status   │
   ├──────────┼──────────────────────────────┼──────────┤
   │ 6        │ Level 10                     │ VERIFIED │
   │ 14781    │ Level 10                     │ VERIFIED │
   │ 46       │ [REMOVED/INVALID]            │ REMOVED  │
   │ ...      │ ...                          │ ...      │
   └──────────┴──────────────────────────────┴──────────┘

3. Update AGE_TIERS configuration:
   - Remove all REMOVED IDs from their respective tiers
   - Remove any tier that becomes empty after removal
   - Log UNVERIFIED IDs for manual review

4. Rebuild derived lookup structures (ALL_TRACKED_IDS, ID_TO_TIER)

5. Store final verified config as code constant or config file
```

### 9.7 Verification Result Interface

```typescript
interface VerificationResult {
  id: number;
  status: "VERIFIED" | "REMOVED" | "UNVERIFIED";
  name: string | null;
  points: number | null;
  category: string | null;
}

interface VerificationReport {
  timestamp: string;
  total: number;
  verified: number;
  removed: number;
  unverified: number;
  results: VerificationResult[];
}
```

---

## 10. Worked Examples

### 10.1 Natural Character — Tier 0 Hit

**Input**:
```json
{
  "achievements": [
    {"id": 6,  "completed_timestamp": 1590969600000},
    {"id": 7,  "completed_timestamp": 1591574400000},
    {"id": 8,  "completed_timestamp": 1592265600000},
    {"id": 9,  "completed_timestamp": 1592956800000},
    {"id": 46, "completed_timestamp": 1591056000000}
  ]
}
```

**Output**:
```json
{
  "age_status": "AGE_RECOVERED",
  "created_approx": "2020-06-01T00:00:00.000Z",
  "age_confidence": "HIGH",
  "age_source": "ORIGINAL_LEVEL_10",
  "age_achievement_id": 6,
  "age_raw_timestamp_ms": 1590969600000,
  "matched_tier": 0,
  "boost_status": "NATURALLY_LEVELED",
  "boost_evidence": "ORIGINAL_LEVEL_10_PRESENT",
  "boost_type": null,
  "boost_level": null,
  "boost_achievement_id": null,
  "boost_achievement_name": null,
  "boost_timestamp": null,
  "clustered_ids": null,
  "cluster_size": null,
  "original_chain_found": 4,
  "original_chain_total": 8,
  "chain_progression": "SEQUENTIAL",
  "expansion_chain_found": 0,
  "tier3_found": 1,
  "tier4_found": 0,
  "reason": null,
  "retry_after_seconds": null,
  "http_status": null
}
```

---

### 10.2 Shadowlands Boost — Direct Achievement (Pattern A)

**Input**:
```json
{
  "achievements": [
    {"id": 14781, "completed_timestamp": 1669852800000},
    {"id": 14782, "completed_timestamp": 1669852800000},
    {"id": 14783, "completed_timestamp": 1669852800000},
    {"id": 14784, "completed_timestamp": 1669852800000},
    {"id": 14785, "completed_timestamp": 1669852800000},
    {"id": 14786, "completed_timestamp": 1669852800000},
    {"id": 15179, "completed_timestamp": 1669852800000}
  ]
}
```

**Output**:
```json
{
  "age_status": "AGE_RECOVERED",
  "created_approx": "2022-12-01T00:00:00.000Z",
  "age_confidence": "VERY_LOW",
  "age_source": "BOOST_DETECTION",
  "age_achievement_id": 15179,
  "age_raw_timestamp_ms": 1669852800000,
  "matched_tier": 4,
  "boost_status": "DEFINITELY_BOOSTED",
  "boost_evidence": "DIRECT_ACHIEVEMENT",
  "boost_type": "SHADOWLANDS",
  "boost_level": 60,
  "boost_achievement_id": 15179,
  "boost_achievement_name": "A Fresh Start",
  "boost_timestamp": "2022-12-01T00:00:00.000Z",
  "clustered_ids": null,
  "cluster_size": null,
  "original_chain_found": 0,
  "original_chain_total": 8,
  "chain_progression": "ABSENT",
  "expansion_chain_found": 6,
  "tier3_found": 0,
  "tier4_found": 1,
  "reason": null,
  "retry_after_seconds": null,
  "http_status": null
}
```

---

### 10.3 Dragonflight Boost — Cluster Only (Pattern C)

**Input**:
```json
{
  "achievements": [
    {"id": 8998,  "completed_timestamp": 1701388800000},
    {"id": 8999,  "completed_timestamp": 1701388800000},
    {"id": 9000,  "completed_timestamp": 1701388800000},
    {"id": 9001,  "completed_timestamp": 1701388800000},
    {"id": 9002,  "completed_timestamp": 1701388800000},
    {"id": 9003,  "completed_timestamp": 1701388800000}
  ]
}
```

**Output**:
```json
{
  "age_status": "AGE_RECOVERED",
  "created_approx": "2023-11-30T00:00:00.000Z",
  "age_confidence": "MEDIUM",
  "age_source": "EXPANSION_LEVEL_CHAINS",
  "age_achievement_id": 8998,
  "age_raw_timestamp_ms": 1701388800000,
  "matched_tier": 2,
  "boost_status": "DEFINITELY_BOOSTED",
  "boost_evidence": "TIMESTAMP_CLUSTER",
  "boost_type": "DRAGONFLIGHT",
  "boost_level": 60,
  "boost_achievement_id": null,
  "boost_achievement_name": null,
  "boost_timestamp": "2023-11-30T00:00:00.000Z",
  "clustered_ids": [8998, 8999, 9000, 9001, 9002, 9003],
  "cluster_size": 6,
  "original_chain_found": 0,
  "original_chain_total": 8,
  "chain_progression": "ABSENT",
  "expansion_chain_found": 6,
  "tier3_found": 0,
  "tier4_found": 0,
  "reason": null,
  "retry_after_seconds": null,
  "http_status": null
}
```

---

### 10.4 Boost — Chain Gap Only (Pattern B)

**Input**:
```json
{
  "achievements": [
    {"id": 14785, "completed_timestamp": 1669852800000},
    {"id": 14786, "completed_timestamp": 1669939200000}
  ]
}
```

**Output**:
```json
{
  "age_status": "AGE_RECOVERED",
  "created_approx": "2022-12-01T00:00:00.000Z",
  "age_confidence": "MEDIUM",
  "age_source": "EXPANSION_LEVEL_CHAINS",
  "age_achievement_id": 14785,
  "age_raw_timestamp_ms": 1669852800000,
  "matched_tier": 2,
  "boost_status": "VERY_LIKELY_BOOSTED",
  "boost_evidence": "ORIGINAL_CHAIN_ABSENT",
  "boost_type": "SHADOWLANDS",
  "boost_level": 60,
  "boost_achievement_id": null,
  "boost_achievement_name": null,
  "boost_timestamp": null,
  "clustered_ids": null,
  "cluster_size": null,
  "original_chain_found": 0,
  "original_chain_total": 8,
  "chain_progression": "ABSENT",
  "expansion_chain_found": 2,
  "tier3_found": 0,
  "tier4_found": 0,
  "reason": null,
  "retry_after_seconds": null,
  "http_status": null
}
```

---

### 10.5 Indeterminate — Partial Data Only

**Input**:
```json
{
  "achievements": [
    {"id": 8,  "completed_timestamp": 1592265600000},
    {"id": 46, "completed_timestamp": 1591056000000}
  ]
}
```

**Output**:
```json
{
  "age_status": "AGE_RECOVERED",
  "created_approx": "2020-06-01T00:00:00.000Z",
  "age_confidence": "LOW",
  "age_source": "EARLY_ACTIVITY_MARKERS",
  "age_achievement_id": 46,
  "age_raw_timestamp_ms": 1591056000000,
  "matched_tier": 3,
  "boost_status": "INDETERMINATE",
  "boost_evidence": null,
  "boost_type": null,
  "boost_level": null,
  "boost_achievement_id": null,
  "boost_achievement_name": null,
  "boost_timestamp": null,
  "clustered_ids": null,
  "cluster_size": null,
  "original_chain_found": 1,
  "original_chain_total": 8,
  "chain_progression": "PARTIAL",
  "expansion_chain_found": 0,
  "tier3_found": 1,
  "tier4_found": 0,
  "reason": null,
  "retry_after_seconds": null,
  "http_status": null
}
```

---

### 10.6 Character Not Found (HTTP 404)

**Input**: HTTP 404

```json
{"code": 404, "message": "Not Found", "type": "BLZWEBAPI00000404"}
```

**Output**:
```json
{
  "age_status": "CHAR_NOT_FOUND",
  "created_approx": null,
  "age_confidence": null,
  "age_source": null,
  "age_achievement_id": null,
  "age_raw_timestamp_ms": null,
  "matched_tier": null,
  "boost_status": "INDETERMINATE",
  "boost_evidence": null,
  "boost_type": null,
  "boost_level": null,
  "boost_achievement_id": null,
  "boost_achievement_name": null,
  "boost_timestamp": null,
  "clustered_ids": null,
  "cluster_size": null,
  "original_chain_found": 0,
  "original_chain_total": 8,
  "chain_progression": "ABSENT",
  "expansion_chain_found": 0,
  "tier3_found": 0,
  "tier4_found": 0,
  "reason": "HTTP_404",
  "retry_after_seconds": null,
  "http_status": 404
}
```

---

### 10.7 Rate Limited (HTTP 429, attempt 0)

**Output**:
```json
{
  "age_status": "RATE_LIMITED",
  "created_approx": null,
  "age_confidence": null,
  "age_source": null,
  "age_achievement_id": null,
  "age_raw_timestamp_ms": null,
  "matched_tier": null,
  "boost_status": "INDETERMINATE",
  "boost_evidence": null,
  "boost_type": null,
  "boost_level": null,
  "boost_achievement_id": null,
  "boost_achievement_name": null,
  "boost_timestamp": null,
  "clustered_ids": null,
  "cluster_size": null,
  "original_chain_found": 0,
  "original_chain_total": 8,
  "chain_progression": "ABSENT",
  "expansion_chain_found": 0,
  "tier3_found": 0,
  "tier4_found": 0,
  "reason": "HTTP_429",
  "retry_after_seconds": 5,
  "http_status": 429
}
```

---

## 11. Quick Reference

### 11.1 Age Recovery

```
┌──────────────────────────────────────────────────────────────────┐
│                    AGE RECOVERY QUICK REFERENCE                   │
├──────────┬───────────────────────────────────────────────────────┤
│ Tier 0   │ ID 6 (Level 10)              → HIGH confidence        │
│ Tier 1   │ IDs 7-13 (Level 20-80)       → HIGH confidence        │
│ Tier 2   │ IDs 14781-19492 (Exp. levels)→ MEDIUM confidence      │
│ Tier 3   │ IDs 46,728,247... (Activity) → LOW confidence         │
│ Tier 4   │ IDs 15179,16400,40167 (Boost)→ VERY_LOW confidence    │
├──────────┼───────────────────────────────────────────────────────┤
│ Select   │ MIN(timestamp) across ALL found candidates            │
│ Tiebreak │ Lower tier number wins at same timestamp              │
│ Convert  │ new Date(ms / 1000).toISOString()                     │
│ Min epoch│ 1198368000000 → 2007-12-24T00:00:00.000Z             │
│ Max bound│ Date.now()                                            │
└──────────┴───────────────────────────────────────────────────────┘
```

### 11.2 Boost Detection

```
┌──────────────────────────────────────────────────────────────────┐
│                   BOOST DETECTION QUICK REFERENCE                 │
├──────────┬───────────────────────────────────────────────────────┤
│ Pattern A│ Tier 4 ID present          → DEFINITELY_BOOSTED       │
│ Pattern C│ ≥2 Tier 2 same timestamp  → DEFINITELY_BOOSTED       │
│ Pattern D│ Tier 0 (ID 6) present      → NATURALLY_LEVELED        │
│ Pattern B│ No original, has expansion → VERY_LIKELY_BOOSTED     │
│ Pattern E│ None of the above         → INDETERMINATE            │
├──────────┼───────────────────────────────────────────────────────┤
│ Priority │ A → C → D → B → E                                   │
│ Type infer│ From Tier 2 ID range or Tier 4 metadata             │
└──────────┴───────────────────────────────────────────────────────┘
```

### 11.3 Error Handling

```
┌──────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING QUICK REFERENCE                │
├──────────┬──────────┬──────────┬────────────────────────────────┤
│ HTTP     │ Status   │ Retry?   │ Action                         │
├──────────┼──────────┼──────────┼────────────────────────────────┤
│ 200      │ varies   │ No       │ Scan achievements               │
│ 404      │ NOT_FOUND│ Never    │ Mark terminal                  │
│ 403      │ TOKEN    │ 1x       │ Refresh token, retry           │
│ 429      │ RATE_LIM │ 5x       │ Backoff: 5→10→20→40→60s        │
│ 5xx      │ SERVER   │ 3x       │ Next batch only                │
│ Timeout  │ TIMEOUT  │ 3x       │ Next batch only                │
│ Network  │ NET_ERR  │ 3x       │ Next batch only                │
└──────────┴──────────┴──────────┴────────────────────────────────┘
```

### 11.4 Throttle Settings

```
┌─────────────────────────────┬─────────────────────────────────────┐
│ Inter-request delay         │ 150ms (~6.7 req/s)                 │
│ Blizzard limit              │ ~100 req/s                         │
│ Safety margin               │ 15x slower than limit              │
│ Batch size                  │ 20 characters                      │
│ Batch pause                 │ 30s (normal), 120s (high failure) │
│ High failure threshold      │ >50% of batch failed               │
│ Stop after                  │ 3 consecutive high-failure batches │
│ Token cache                 │ Until expires_in - 60 seconds      │
│ ID verification             │ One-time before production         │
└─────────────────────────────┴─────────────────────────────────────┘
```

### 11.5 Output Status Combinations

```
┌─────────────────────┬──────────────────────┬─────────────────────┐
│ age_status          │ boost_status         │ Meaning             │
├─────────────────────┼──────────────────────┼─────────────────────┤
│ AGE_RECOVERED       │ NATURALLY_LEVELED    │ Full data, high conf│
│ AGE_RECOVERED       │ DEFINITELY_BOOSTED   │ Age + boost confirmed│
│ AGE_RECOVERED       │ VERY_LIKELY_BOOSTED  │ Age + boost probable│
│ AGE_RECOVERED       │ INDETERMINATE        │ Age only, no boost  │
│ AGE_UNAVAILABLE     │ INDETERMINATE        │ No data at all      │
│ CHAR_NOT_FOUND      │ INDETERMINATE        │ Character gone      │
│ RATE_LIMITED        │ INDETERMINATE        │ Transient, retry    │
│ SERVER_ERROR        │ INDETERMINATE        │ Transient, retry    │
│ INVALID_TOKEN       │ INDETERMINATE        │ Transient, refresh  │
└─────────────────────┴──────────────────────┴─────────────────────┘
```
````
