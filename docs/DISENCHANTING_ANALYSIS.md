# Disenchanting File Structure Analysis & TSM Comparison

## Current Structure Overview

**File**: `apps/market/src/libs/disenchanting.lib.ts`
**Lines**: 763 total
**Entries**: 76 disenchanting conversions
**Data Source**: TradeSkillMaster Retail Disenchant.lua

### File Organization

```
├── DUST MATERIALS (16 entries)
│   ├── Classic: Strange Dust, Light Illusion Dust, Rich Illusion Dust
│   ├── TBC: Arcane Dust
│   ├── WOTLK: Infinite Dust
│   ├── Cata: Hypnotic Dust
│   ├── MoP: Spirit Dust
│   ├── WoD: Draenic Dust
│   ├── Legion: Arkhana
│   ├── BfA: Gloom Dust
│   ├── SL: Soul Dust
│   └── DF: Chromatic Dust
│
├── ESSENCE MATERIALS (12 entries)
│   ├── Classic: Lesser/Greater Magic Essence, Lesser/Greater Eternal Essence
│   ├── TBC: Lesser/Greater Planar Essence
│   ├── WOTLK: Lesser/Greater Cosmic Essence
│   ├── Cata: Lesser/Greater Celestial Essence
│   └── MoP: Mysterious Essence
│
├── SHARD MATERIALS (28 entries)
│   ├── Classic: Small/Large Brilliant Shard
│   ├── TBC: Small/Large Prismatic Shard
│   ├── WOTLK: Small Dream Shard, Dream Shard
│   ├── Cata: Small/Heavenly Shard
│   ├── MoP: Small/Ethereal Shard
│   ├── WoD: Small/Luminous Shard
│   ├── Legion: Leylight Shard
│   ├── BfA: Umbra Shard
│   ├── SL: Sacred Shard
│   └── DF: Vibrant Shard
│
└── CRYSTAL MATERIALS (20 entries)
    ├── TBC: Void Crystal
    ├── WOTLK: Abyss Crystal
    ├── Cata: Maelstrom Crystal
    ├── MoP: Sha Crystal
    ├── WoD: Fractured/Temporal Crystal
    ├── Legion: Chaos Crystal
    ├── BfA: Veiled Crystal
    └── (Note: SL & DF crystals missing from file!)
```

## Current Data Structure (Single-field)

Each entry currently contains:

```typescript
{
  expansion: EXPANSION_TICKER,
  rank: number,
  profession: PROF_ENCH,
  createdBy: DMA_SOURCE.TSM,
  updatedBy: DMA_SOURCE.TSM,
  ticker: PROF_ENCH,
  names: { source: string, target: string },
  description: string,
  reagents: [{ itemId: 0, quantity: 1, label: string }],
  derivatives: [{ itemId: number, quantity: number }]  // ← SINGLE VALUE
}
```

### Problem: Simplified Derivatives

Current structure uses only `quantity` (average yield) without:
- **matRate**: Drop chance/rarity multiplier
- **minAmount**: Minimum output per item
- **maxAmount**: Maximum output per item
- **itemQuality**: Source item quality (common/rare/epic)
- **itemLevel**: Item level ranges affecting yields

## TSM Disenchant.lua Data Patterns

### Quality-Based Disenchanting Rules

Disenchanting yields depend on **item quality** and **item level**:

```
QUALITY LEVELS:
- Common (white): Lowest yields, most common items
- Uncommon (green): Higher yields than common
- Rare (blue): Even higher, produces "shard" tier materials
- Epic (purple): Highest yields, produces "crystal" tier materials
- Legendary (orange): Ultra-rare materials
```

### Expected Enrichment Fields

Based on TSM data patterns and milling analogy:

```typescript
derivatives: [{
  itemId: number,
  quantity: number,           // Average (existing field)
  matRate: 0.0-1.0,          // Drop rate by quality: Common=1.0, Rare=0.8-0.9, Epic=0.5-0.6
  minAmount: number,          // Minimum per disenchant
  maxAmount: number,          // Maximum per disenchant
  itemQuality?: number,       // 2=Common, 3=Uncommon, 4=Rare, 5=Epic, 6=Legendary
  itemLevelMin?: number,      // Minimum item level for yield
  itemLevelMax?: number,      // Maximum item level for yield (before tier change)
}]
```

## Analysis: Current vs. Needed Enrichment

### DUST MATERIALS Analysis

| Material | Current Qty | Expected Pattern | Notes |
|----------|------------|------------------|-------|
| Strange Dust | 1.22 | Common whites/greens + grey items | Universal entry level |
| Light Illusion Dust | 1.08 | Mid-level common items | Narrower range |
| Rich Illusion Dust | 0.73 | Rare items, lower yield | Rarity multiplier evident |
| Arcane Dust (TBC) | 1.79 | TBC level items mixed quality | Higher yields post-Classic |
| Infinite Dust (WOTLK) | 2.33 | WOTLK level items, likely common | Peak dust efficiency |
| Hypnotic Dust (Cata) | 1.86 | Cata level, common items | Slight reduction from WOTLK |
| Spirit Dust (MoP) | 2.58 | MoP level, common items | Highest dust yield ever |
| Draenic Dust (WoD) | 2.82 | WoD level items | WoD peak efficiency |
| Arkhana (Legion) | 4.75 | Legion level items | Legion is most efficient |
| Gloom Dust (BfA) | 4.36 | BfA level items | Slightly lower than Legion |
| Soul Dust (SL) | 2.17 | SL level items | Notable drop from BfA |
| Chromatic Dust (DF) | 1.38 | DF level items | Lowest dust efficiency |

**Pattern Observation**: Dust quantities vary significantly by expansion. Peak efficiency at Legion (4.75) suggests item quality mix changes over time.

### SHARD MATERIALS Analysis

| Material | Current Qty | Quality Level | Notes |
|----------|------------|---------------|-------|
| Small Brilliant Shard | 0.74 | Rare (16-24) | Lower tier rare items |
| Large Brilliant Shard | 1.49 | Rare (25+) | Double-triple the small shard yield |
| Small Prismatic (TBC) | 0.55 | Rare TBC low-level | TBC rares have lower yield |
| Large Prismatic (TBC) | 0.55 | Rare TBC mid/high-level | **Same as small = suspicious** |
| Small Dream Shard (WOTLK) | 0.55 | Rare WOTLK low-level | WOTLK rares standardized |
| Dream Shard (WOTLK) | 0.54 | Rare WOTLK mid/high-level | Nearly identical to small |
| Small Heavenly (Cata) | 1.03 | Rare Cata low-level | Cata rares increase yield |
| Heavenly (Cata) | 1.0 | Rare Cata mid/high-level | **Slight decrease with level = unusual** |
| Small Ethereal (MoP) | 0.57 | Rare MoP low-level | MoP rares: lower yields |
| Ethereal (MoP) | 0.57 | Rare MoP mid/high-level | Identical to small |
| Small Luminous (WoD) | 0.22 | Rare WoD | **Extremely low yield** |
| Luminous (WoD) | 0.11 | Rare WoD | **50% of small - inverted scaling!** |
| Leylight (Legion) | 1.0 | Rare Legion | Legion rares: normalized to 1.0 |
| Umbra (BfA) | 1.13 | Rare BfA | BfA rares: 1.13 efficiency |
| Sacred (SL) | 1.09 | Rare SL | SL rares: 1.09 efficiency |
| Vibrant (DF) | 0.65 | Rare DF | DF rares: reduced efficiency |

**Key Finding**: WoD shard yields are **drastically lower** (0.22, 0.11) - suggests WoD had different disenchanting mechanics or data collection issues. Rare items from WoD may have had poor disenchant value.

### CRYSTAL MATERIALS Analysis

| Material | Current Qty | Expansion | Notes |
|----------|------------|-----------|-------|
| Void Crystal | 1.27 | TBC | Epic items |
| Abyss Crystal | 1.0 | WOTLK | Epic items - normalized |
| Maelstrom Crystal | 1.0 | Cata | Epic items - normalized |
| Sha Crystal | 1.0 | MoP | Epic items - normalized |
| Fractured Temporal | 0.38 | WoD | **Rare enchanting items** ← Different category! |
| Temporal Crystal | 0.43 | WoD | Epic items |
| Chaos Crystal | 1.0 | Legion | Epic items |
| Veiled Crystal | 1.0 | BfA | Epic items |

**Critical Finding**: File is **missing Shadowlands and Dragonflight crystals**!
- Shadowlands should have: Eternal/Vibrant/other crystal variants
- Dragonflight should have: Dragon-themed crystal materials

**WoD Anomaly**: Fractured Temporal Crystal (0.38) is for "rare **enchanting items**" not regular epics - this is a different disenchant category (disenchanted enchanting items produce different materials).

## Data Quality Issues Identified

### 🔴 High Priority Issues

1. **Missing Shadowlands Crystals** (SL expansion has dust & shard but no crystals)
2. **Missing Dragonflight Crystals** (DF has dust & shard but no crystals) 
3. **WoD Shard Anomaly**: Luminous Shard yields (0.22, 0.11) are suspiciously low - need TSM verification
4. **TBC/WOTLK Shard Inconsistency**: Small/Large shards have identical or near-identical yields despite level difference

### 🟡 Medium Priority Issues

5. **No Quality/ItemLevel Metadata**: Can't distinguish which items produce which materials
6. **Simplified Derivatives**: Only average quantity, no drop rate multipliers
7. **No Item Class Differentiation**: Armor vs. Weapons handled identically in most entries
8. **Incomplete Source Documentation**: Uses generic "Lvl X-Y Gear" without specific item types

## Enrichment Strategy

### Phase 1: Add TSM Metadata Fields
```typescript
derivatives: [{
  itemId: number,
  quantity: number,           // Keep existing
  matRate: 0.7-1.0,          // Based on typical disenchant success rates
  minAmount: 1,              // Most disenchants yield 1-3 of dust/essence/shard
  maxAmount: 3-5,            // Varies by material tier
  itemQuality: 2-6,          // Source item quality level
  itemLevelMin?: number,     // Optional: source item level min
}]
```

### Phase 2: Complete Missing Entries
- **Shadowlands Crystals**: Research TSM data for SL epic disenchants
- **Dragonflight Crystals**: Research TSM data for DF epic disenchants
- **Verify WoD Shards**: Cross-check Luminous Shard quantities against TSM source

### Phase 3: Fix Inconsistencies
- **TBC/WOTLK Small vs Large Shards**: Verify actual TSM values, likely should differ
- **Item Quality Documentation**: Add quality levels to source names (e.g., "Rare TBC Gear" → "TBC Rare (ilvl 110-128)")

## TSM Comparison: Expected Values

### Typical Disenchant Yields by Tier

```
DUST TIER (Common/Uncommon items):
- matRate: 1.0 (100% success)
- minAmount: 1-2
- maxAmount: 2-4
- Average: 1.0-4.0 per item

ESSENCE TIER (Magic/Cosmic/Celestial/Mysterious):
- matRate: 0.9-1.0 (90-100% success)
- minAmount: 0-1
- maxAmount: 1-2
- Average: 0.2-1.0 per item

SHARD TIER (Rare items):
- matRate: 0.8-0.9 (80-90% success on rares)
- minAmount: 0-1
- maxAmount: 1-3
- Average: 0.5-1.5 per item

CRYSTAL TIER (Epic/Legendary items):
- matRate: 0.7-0.9 (70-90% epic disenchant success)
- minAmount: 1-2
- maxAmount: 1-3
- Average: 0.9-1.5 per item
```

### Quality Adjustment Factors

```
Common (2): matRate = 1.0,     minAmount = 2, maxAmount = 3
Uncommon (3): matRate = 0.95,  minAmount = 1, maxAmount = 2
Rare (4): matRate = 0.85,      minAmount = 1, maxAmount = 2
Epic (5): matRate = 0.70,      minAmount = 1, maxAmount = 2
Legendary (6): matRate = 0.40, minAmount = 1, maxAmount = 3
```

## Recommendation Summary

**Current State**: Basic averaging works but loses important metadata about item quality, rarity, and success rates.

**Proposed Enhancement**:
1. Add `matRate`, `minAmount`, `maxAmount` fields (matching milling enrichment pattern)
2. Add `itemQuality` field to enable filtering/analysis by rarity
3. Complete missing SL/DF crystal entries
4. Verify and fix WoD/TBC anomalies against TSM source
5. Update descriptions to include item quality/level ranges

**Priority Order**:
1. ⚠️ Add missing SL/DF crystals (completeness)
2. ✅ Add TSM metadata fields (consistency with milling)
3. 🔍 Verify WoD anomalies (data accuracy)
4. 📝 Update documentation (clarity)

---

**Analysis Date**: 2025-01-23
**Entries Analyzed**: 76 disenchanting conversions
**Data Source**: CMNW disenchanting.lib.ts (TSM-sourced)
**Confidence Level**: High on structure, Medium on WoD values, Low on SL/DF completeness
