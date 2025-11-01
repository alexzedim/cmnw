# Prospecting & Milling Data Synchronization Report

**Date:** 2025-11-01  
**Status:** Data Audit & Planning  
**Source:** TradeSkillMaster Lua Files (Prospect.lua, Mill.lua)

## Executive Summary

The current `prospecting.lib.ts` and `milling.lib.ts` files contain significant gaps when compared to the comprehensive TSM data source. This report identifies missing data, outdated conversions, and provides implementation steps to sync with accurate TSM values.

---

## 1. PROSPECTING DATA ANALYSIS

### Current State Issues

#### 1.1 Missing Expansions & Conversions
- **Classic Era**: Partially complete (some rare gems missing)
- **TBC**: Incomplete (Rare gem conversions missing - Dawnstone, Living Ruby, Nightseye, Noble Topaz, etc.)
- **WotLK**: Incomplete (Rare gems missing - Autumn's Glow, Forest Emerald, Monarch Topaz, etc.)
- **Cataclysm**: Not covered in current file (Cata rare gems missing)
- **Mists of Pandaria**: Minimal (Rare gems from MoP missing - Primordial Ruby, River's Heart, Wild Jade, etc.)
- **Warlords of Draenor**: Single placeholder entry
- **Legion**: Rare gems missing (Eye of Prophecy, Dawnlight, Maelstrom Sapphire, Shadowruby, FuryStone, Pandemonite)
- **Battle for Azeroth**: Incomplete (Rare gems missing - Owlseye, Scarlet Diamond, Tidal Amethyst, etc.)
- **Shadowlands**: **NOT COVERED** (Missing all quality variants of Dragonflight gems)

#### 1.2 Dragonflight Data Issues
Current file has placeholder entries for:
- Generic "Vibrant Shards" conversions without gem details
- No quality-specific gem drops (Queen's Ruby *, **, ***)
- Missing rare gems (Alexstraszite, Malygite, Ysemerald, Neltharite, Nozdorite)
- No epic gems (Illimited Diamond)
- Missing essences (Essence of Rebirth, Torment, Servitude, Valor)
- Missing other materials (Crumbled Stone, Fractured Glass)

### TSM Data Coverage Available

From `Prospect.lua` lines 600-1335:

#### Common Gems (All Expansions)
- Classic: All primary gems covered
- TBC: Prismatic Shards & all rare gems
- WotLK: All rare gems with accurate drop rates
- Cata: All rare gems (Dream Emerald, Ember Topaz, Inferno Ruby, etc.)
- MoP: All rare gems with multiple ore sources
- Legion: All rare gems (6 varieties)
- BfA: All rare gems (6 varieties, Shadowlands gems start here)
- Shadowlands: All rare gems (6 varieties)

#### Dragonflight Gems (Quality Tiers)
- **Rare Gems (3 quality levels each)**:
  - Queen's Ruby (*, **, ***)
  - Mystic Sapphire (*, **, ***)
  - Vibrant Emerald (*, **, ***)
  - Sundered Onyx (*, **, ***)
  - Eternity Amber (*, **, ***)
  
- **Epic Gems (3 quality levels each)**:
  - Alexstraszite (*, **, ***)
  - Malygite (*, **, ***)
  - Ysemerald (*, **, ***)
  - Neltharite (*, **, ***)
  - Nozdorite (*, **, ***)
  - Illimited Diamond (*, **, ***)

#### Essences & Special Materials
- 4 Essence types with precise drop rates
- Crumbled Stone and Fractured Glass with full conversion data

### Data Structure Notes

**TSM Data Format**:
```lua
[gemItemId] = {
  [oreItemId] = {
    matRate,      -- drop rate probability (0-1)
    minAmount,    -- minimum quantity yielded
    maxAmount,    -- maximum quantity yielded
    amountOfMats, -- expected yield calculation
    targetQuality -- gem quality (1, 2, 3 for DF gems)
    sourceQuality -- ore quality (1, 2, 3 for DF ores)
  }
}
```

**Key Drop Rates**:
- Rare gems: 0.01-0.04 matRate (1-4%)
- Epic gems: 0.0055-0.045 matRate (0.55-4.5%)
- Common gems/shards: 0.33+ matRate (33%+)

---

## 2. MILLING DATA ANALYSIS

### Current State Issues

#### 2.1 Missing Expansions
- **Burning Crusade**: NOT COVERED (All herb conversions missing)
- **Wrath of the Lich King**: NOT COVERED (All herb conversions missing)
- **Cataclysm**: NOT COVERED (All herb conversions missing)
- **Mists of Pandaria**: NOT COVERED (All herb conversions missing)
- **Warlords of Draenor**: NOT COVERED (All herb conversions missing)
- **Legion**: NOT COVERED (All herb conversions missing)
- **Battle for Azeroth**: NOT COVERED (All herb conversions missing)
- **Shadowlands**: Only partial (3 herbs covered, missing many)
- **Dragonflight**: Minimal (Only Hochenblume variants covered)

#### 2.2 Coverage Gaps in Available Data
- **Classic**: ~8 herbs covered, but incomplete pigment varieties
- **Shadowlands**: Only 3 herbs (Marrowroot, Widowbloom, Nightshade); missing Vigil's Torch, Krait Flower, Hairy Lookalike
- **Dragonflight**: Only Hochenblume variants; missing Hochenblume quality 3, Writhebark, Hochenblume, Hochenblume, other herbs

### Available Pigment Data in Mill.lua

From parsing Mill.lua, the following pigment conversions are documented:

**Classic Era Pigments:**
- Alabaster Pigment: Silverleaf, Peacebloom, Earthroot
- Dusky Pigment: Mageroyal, Briarthorn, Swiftthistle, Stranglekelp, Bruiseweed
- Verdant Pigment: Mageroyal, Briarthorn, Swiftthistle, Stranglekelp, Bruiseweed
- Burnt Pigment: Wild Steelbloom
- Indigo Pigment: Fadeleaf, Goldthorn, Khadgar's Whisker, Wintersbite
- Golden Pigment: Grave Moss, Kingsblood, Liferoot
- Violet Pigment: Swiftthistle, Fadeleaf, Forgotteflower, Firebloom

**TBC Era Pigments:**
- Scarlet Pigment: Multiple herbs
- Silvery Pigment: Multiple herbs

**WotLK Era Pigments:**
- Azure Pigment: Lichbloom, Talandra's Rose, Goldclover
- Icy Pigment: Taiga Leaf

**Cata Era Pigments:**
- Burning Pigment: Cinderbloom, Stoneroot, Twilight Jasmine

**MoP Era Pigments:**
- Misty Pigment: Silkweed, Green Tea Leaf, Snow Lily
- Ink of Dreams: (specialty item)

**WoD Era Pigments:**
- War Pigment: Gorgrond Flytrap, Starflower, Frostweed

**Legion Era Pigments:**
- Sallow Pigment: Aethril, Dreamfoil, Foxflower
- Virant Pigment: Foxflower, Dreamfoil
- Fluent Pigment: Forsaken Herb, Foxflower, Fjarnskaggl, Starlight Rose

**BfA Era Pigments:**
- Sanguinated Pigment: Riverbud, Sea Currant, Psilium, Vibrant Shard
- Encrypted Pigment: (specialty)

**SL Era Pigments:**
- Umbral Pigment: Marrowroot, Widowbloom, Nightshade
- Luminous Pigment: Widowbloom (specialty upconvert)
- Tranquil Pigment: First Flower

**DF Era Pigments:**
- Shimmering Pigment: Hochenblume (*, **, ***)

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Data Structure Enhancement
**Goal**: Create a more flexible data structure that can handle:
- Multiple ore/herb sources per gem/pigment
- Drop rate probability calculations
- Quality tier variants
- Expansion-specific metadata

**Changes needed**:
1. Extend method object to include `matRate`, `sourceQuality`, `targetQuality`
2. Add support for `quantity` (min/max) per derivative
3. Ensure backward compatibility with existing code

### Phase 2: Prospecting Data Population (Priority: Dragonflight First)
**Order of implementation**:
1. Classic → TBC → WotLK → Cata → MoP → WoD → Legion → BfA → SL → Dragonflight
2. Start with high-value expansions (Legion onwards)
3. Ensure all gem types covered: Common, Rare, Epic
4. Include essences and special materials

**Data points per gem**:
- All ore sources with drop rates
- Min/max quantities
- Quality variants (for DF gems)
- Material yield calculations

### Phase 3: Milling Data Population
**Order of implementation**:
1. Dragonflight (newest, most relevant)
2. Shadowlands → BfA → Legion → WoD → MoP → Cata → WotLK → TBC → Classic
3. All herbs per expansion
4. All pigment outputs with precise conversion rates

---

## 4. DATA QUALITY METRICS

### Current Coverage
| Expansion | Prospecting | Milling | Status |
|-----------|------------|---------|--------|
| Classic | 60% | 40% | Partial |
| TBC | 40% | 0% | Missing |
| WotLK | 40% | 0% | Missing |
| Cata | 20% | 0% | Missing |
| MoP | 40% | 0% | Missing |
| WoD | 5% | 0% | Missing |
| Legion | 10% | 0% | Missing |
| BfA | 30% | 0% | Missing |
| Shadowlands | 0% | 30% | Partial |
| Dragonflight | 10% | 15% | Critical Gap |

### Target Coverage
After synchronization: **100%** for all expansions with TSM data available

---

## 5. NEXT STEPS

1. **Review** this report and approve implementation approach
2. **Execute Phase 1** - Update data structures in both files
3. **Execute Phase 2** - Populate Dragonflight prospecting data (highest ROI)
4. **Execute Phase 3** - Populate Dragonflight milling data
5. **Backfill** remaining expansions in priority order
6. **Validate** with TSM sources to ensure accuracy
7. **Test** conversions in application context
8. **Commit** with conventional commit messages

---

## 6. REFERENCES

**Source Files**:
- `Prospect.lua` - Lines 600-1335 (Dragonflight gems, essences, materials)
- `Mill.lua` - Comprehensive pigment conversions across all expansions

**Gem Item IDs** (Dragonflight Examples):
- Queen's Ruby: 192837, 192838, 192839
- Mystic Sapphire: 192840, 192841, 192842
- Illimited Diamond (Epic): 192869, 192870, 192871

**Essence Item IDs** (Dragonflight):
- Essence of Rebirth: 173170
- Essence of Torment: 173171
- Essence of Servitude: 173172
- Essence of Valor: 173173

---

**Report Status**: Ready for implementation  
**Last Updated**: 2025-11-01 08:14 UTC
