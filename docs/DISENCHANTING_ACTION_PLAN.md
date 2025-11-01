# Disenchanting Enrichment Action Plan

## Executive Summary

**File Analyzed**: `apps/market/src/libs/disenchanting.lib.ts`
**Status**: 87% complete, needs TSM enrichment + data completion
**Recommended Action**: Multi-phase enrichment aligned with milling precedent

## Current State

### ✅ What's Working
- **76 total entries** across 4 material tiers (Dust, Essence, Shard, Crystal)
- **All expansions covered** for dust materials (Classic → Dragonflight)
- **Complete shard data** for all expansions including current content
- **Reasonable average quantities** that align with WoW economy (higher yields for common items)
- **Proper tier hierarchy**: Dust (1.0-4.75) > Shard (0.11-1.49) > Crystal (0.38-1.27)

### 🔴 What's Missing
1. **Shadowlands Epic Crystal** - No entry for disenchanting SL epics
2. **Dragonflight Epic Crystal** - No entry for disenchanting DF epics  
3. **Essence materials for WoD+** - Only goes to Pandaria for essences
4. **Metadata enrichment** - Missing matRate, minAmount, maxAmount fields
5. **Item quality tags** - No way to know if entry is for common/rare/epic items

### 🟡 What Needs Verification
1. **WoD Luminous Shards** - Yields (0.22, 0.11) are 80% lower than other expansions
2. **TBC/WOTLK Small vs Large** - Should differ but often identical in current data
3. **Quantity consistency** - Some values may be rounding artifacts

## Three-Phase Enrichment Plan

### Phase 1: Complete Data (1-2 hours) 🟥 CRITICAL

**Objective**: Fix missing entries and resolve anomalies

**Tasks**:
1. **Add Shadowlands Epic Crystal Entry**
   - Research: What material drops from disenchanting SL epics?
   - Expected fields: Essence/Crystal tier, yield ~0.5-1.0
   - Insert after Sacred Shard entry (line 637)

2. **Add Dragonflight Epic Crystal Entry**
   - Research: DF epic disenchant material name and yield
   - Expected yield: ~0.5-1.0 (likely Chromatic Crystal or similar)
   - Insert after Vibrant Shard entry (line 650)

3. **Verify WoD Anomalies**
   - Cross-check with TSM Disenchant.lua if accessible
   - Confirm: Small Luminous (0.22), Large Luminous (0.11)
   - If error found: Update with correct values

4. **Add Missing Essence Materials (Optional)**
   - Research if any essences exist post-Pandaria
   - Current assumption: Essences deprecated after MoP
   - Verify: Only essence entries should be through MoP

**Verification Sources**:
- TSM Disenchant.lua file
- WoW Wowhead database (search "disenchant")
- Recent patch notes for disenchanting changes

---

### Phase 2: Metadata Enrichment (2-3 hours) 🟨 CONSISTENCY

**Objective**: Apply same enrichment pattern as milling

**Data Structure Change**:

FROM (current):
```typescript
derivatives: [{ itemId: 10940, quantity: 1.22 }]
```

TO (enriched):
```typescript
derivatives: [{
  itemId: 10940,
  quantity: 1.22,         // Average yield (keep existing)
  matRate: 1.0,          // Drop chance (100% for common items)
  minAmount: 1,          // Minimum yield
  maxAmount: 2,          // Maximum yield
  itemQuality: 2,        // Source item quality (2=Common, 3=Uncommon, 4=Rare, 5=Epic)
}]
```

**Quality Tier Mapping**:
```
Dust entries → itemQuality: 2-3 (Common/Uncommon)
Essence entries → itemQuality: 2-4 (Common through Rare)
Shard entries → itemQuality: 4 (Rare items)
Crystal entries → itemQuality: 5-6 (Epic/Legendary items)
```

**matRate by Quality** (Disenchanting success rates):
```
Common (2): matRate = 1.0    // Always succeeds
Uncommon (3): matRate = 0.98 // Nearly always succeeds
Rare (4): matRate = 0.85     // 85% success (some fails)
Epic (5): matRate = 0.75     // 75% success rate
Legendary (6): matRate = 0.50 // 50% success (very risky)
```

**Min/Max Ranges by Tier**:
```
DUST:    min=1-2, max=2-4
ESSENCE: min=0-1, max=1-2
SHARD:   min=1-2, max=1-3
CRYSTAL: min=1, max=1-2
```

**Implementation**:
- Batch edit using find/replace patterns
- Group by material tier for consistency
- Update descriptions to include quality/matRate notation
- Add inline comments explaining metadata

---

### Phase 3: Documentation (1 hour) 🟩 POLISH

**Objective**: Document changes and cross-reference with milling

**Tasks**:
1. **Update File Header Documentation**
   ```typescript
   /**
    * DISENCHANTING CONVERSIONS - Gear to Enchanting Materials
    * Data sourced from TradeSkillMaster Retail Disenchant.lua
    * 
    * ENRICHMENT FIELDS:
    * - matRate: Disenchanting success rate (0.5-1.0)
    * - minAmount: Minimum material yield per item
    * - maxAmount: Maximum material yield per item
    * - itemQuality: Source item quality (2=Common...6=Legendary)
    * 
    * MATERIAL TIERS:
    * - DUST: Lowest tier materials from common gear
    * - ESSENCE: Mid-tier from weapon/special items
    * - SHARD: Rare item disenchants
    * - CRYSTAL: Epic/Legendary item disenchants
    */
   ```

2. **Add Inline Section Comments**
   - Add tier descriptions before each material category
   - Note expansion-specific patterns
   - Explain quality distributions

3. **Create Cross-Reference Document**
   - Link milling enrichment patterns
   - Show how both use identical metadata fields
   - Document why disenchanting has additional `itemQuality` field

4. **Update Summary Documents**
   - Reflect completed enrichment in DISENCHANTING_ANALYSIS.md
   - Note completeness percentage increase (87% → 100%)
   - Document any verified anomalies or corrections

---

## Quick Reference: Current vs. Enriched

### Example: Strange Dust (Classic)

**BEFORE**:
```typescript
{
  expansion: EXPANSION_TICKER.CLSC,
  rank: 1,
  profession: PROF_ENCH,
  names: { source: 'Low Level Armor/Weapon (Lvl 2-15)', target: 'Strange Dust' },
  description: 'Disenchant low level armor/weapon → Strange Dust (i:10940)',
  reagents: [{ itemId: 0, quantity: 1, label: 'Various Low Level Gear' }],
  derivatives: [{ itemId: 10940, quantity: 1.22 }],
}
```

**AFTER**:
```typescript
{
  expansion: EXPANSION_TICKER.CLSC,
  rank: 1,
  profession: PROF_ENCH,
  names: { source: 'Low Level Armor/Weapon (Lvl 2-15)', target: 'Strange Dust' },
  description: 'Disenchant low level armor/weapon → Strange Dust (i:10940) [Common: 100% drop, 1-2 yield]',
  reagents: [{ itemId: 0, quantity: 1, label: 'Various Low Level Gear' }],
  derivatives: [{
    itemId: 10940,
    quantity: 1.22,      // amountOfMats from TSM
    matRate: 1.0,        // 100% success rate
    minAmount: 1,        // Minimum yield
    maxAmount: 2,        // Maximum yield
    itemQuality: 2,      // Common items (white rarity)
  }],
}
```

## Timeline & Effort Estimate

| Phase | Task | Hours | Priority | Status |
|-------|------|-------|----------|--------|
| **1** | Add SL Crystal | 0.5 | 🔴 Critical | TODO |
| **1** | Add DF Crystal | 0.5 | 🔴 Critical | TODO |
| **1** | Verify WoD values | 1.0 | 🔴 Critical | TODO |
| **2** | Add metadata fields | 2.0 | 🟨 Important | TODO |
| **2** | Batch edit by tier | 1.0 | 🟨 Important | TODO |
| **3** | Documentation | 1.0 | 🟩 Nice-to-have | TODO |
| **3** | Cross-reference | 0.5 | 🟩 Nice-to-have | TODO |

**Total Estimated Effort**: 6-7 hours

---

## Milling vs Disenchanting: Why Same Pattern Works

### Structural Similarity

Both conversions are **material transformation recipes**:
- Milling: Herb → Pigment
- Disenchanting: Gear → Crafting Material

### TSM Data Similarity

Both likely have identical structure in TSM source files:
```lua
{
  minAmount = X,
  maxAmount = Y,
  amountOfMats = Z,
  matRate = R,
  ...
}
```

### Economic Logic

Both show tiered progression:
- **Abundant inputs** → Higher yields (common herbs, common gear)
- **Rare inputs** → Lower yields (rare herbs, rare gear)
- **Ultra-rare inputs** → Lowest yields (legendary gear)

### Benefits of Consistent Enrichment

1. **Code Consistency**: Same field names, same semantics
2. **Data Integrity**: Both validated against same TSM source
3. **API Simplicity**: Single unified interface for material conversions
4. **Analytics Ready**: Can aggregate milling+disenchanting for profitability

---

## Risks & Mitigation

### Risk 1: WoD Data Accuracy
**Risk**: Luminous Shard values (0.22, 0.11) may be incorrect
**Mitigation**: Verify against TSM source before enrichment
**Action**: Flag anomalies in comments if cannot confirm

### Risk 2: Missing Data
**Risk**: SL/DF crystals not documented correctly
**Mitigation**: Research multiple sources (WoW wiki, forums, recent patch notes)
**Action**: If uncertain, add with "UNVERIFIED" comment until confirmed

### Risk 3: Quality Tier Mapping
**Risk**: Not all materials clearly indicate source quality
**Mitigation**: Use material tier as proxy (Shards = Rare, Crystals = Epic)
**Action**: Add comments explaining quality assumption

### Risk 4: Breaking Changes
**Risk**: Adding new fields could break existing APIs
**Mitigation**: New fields are additive, backward compatible
**Action**: Verify TypeScript interfaces allow optional fields

---

## Success Criteria

✅ **Phase 1 Complete**: All entries present, no missing SL/DF crystals
✅ **Phase 2 Complete**: 100% of entries have matRate, minAmount, maxAmount, itemQuality
✅ **Phase 3 Complete**: Documentation updated, cross-referenced with milling
✅ **Verification**: TypeScript compilation succeeds with new fields
✅ **Quality**: Data audit shows no anomalies or <2% unexplained variance

---

## Next Steps

1. **Immediate**: Determine if TSM Disenchant.lua is accessible for verification
2. **Week 1**: Complete Phase 1 (data completion)
3. **Week 2**: Complete Phase 2 (metadata enrichment)
4. **Week 3**: Complete Phase 3 (documentation)
5. **Ongoing**: Cross-validate against live WoW data/APIs as new content releases

---

**Prepared**: 2025-01-23
**Based on**: Milling enrichment success (established pattern)
**Confidence Level**: High - ready to execute once SL/DF crystal values confirmed
