# Pricing & Evaluation Logic Analysis and Implementation Plan

## Problem Statement

The system currently has three separate services handling different aspects of item pricing for World of Warcraft items:
1. **PricingService** - Builds pricing methods (recipes, crafting, reverse methods like prospecting/milling/disenchanting)
2. **ValuationsService** - Assigns asset classes to items based on pricing and market data
3. **EvaluationService** - Evaluates items by combining all pricing methods to find profitable opportunities

The goal is to understand the correct sequence of operations and combine these services' logic to accurately evaluate WoW items, focusing on building pricing methods and asset class assignments.

## Current State Analysis

### 1. PricingService (`apps/market/src/services/pricing.service.ts`)

**Purpose**: Builds and indexes all available pricing methods for items.

**Key Methods**:
- `onApplicationBootstrap()` - Initializes all pricing data on startup
- `indexPricing()` - Fetches profession recipes from Blizzard API, queues jobs for processing
- `libPricing()` - Creates reverse pricing methods (prospecting, milling, disenchanting) from static data
- `buildSkillLine()` - Processes CSV data to build skill line entities
- `buildSpellEffect()` - Processes CSV data to build spell effect entities  
- `buildSpellReagents()` - Processes CSV data to build spell reagent entities

**Data Sources**:
- **Blizzard API**: Primary crafting recipes (`PRICING_TYPE.PRIMARY`)
  - Fetches profession index → profession details → skill tiers → recipes
  - Stores in PricingEntity with reagents and derivatives
  
- **Static Libraries**: Reverse pricing methods (`PRICING_TYPE.REVERSE`)
  - `PROSPECTING` - Ore → Gems (Jewelcrafting, spell 31252)
  - `MILLING` - Herbs → Pigments (Inscription, spell 51005)
  - `DISENCHANTING` - Gear → Enchanting Materials (Enchanting, spell 13262)
  - Each method has: reagents (inputs), derivatives (outputs with matRate, minAmount, maxAmount)

- **CSV Files**: WoW game data exports
  - `SkillLineAbility.csv` - Links spells to profession skill lines
  - `SpellEffect.csv` - Defines what items spells create
  - `SpellReagents.csv` - Defines what materials spells require

**Key Data Structure** (PricingEntity):
```typescript
{
  recipeId: number,           // Unique recipe identifier
  spellId: number,            // WoW spell ID
  ticker: string,             // Profession ticker (JWLC, INSC, ENCH, etc)
  profession: string,         // Profession name or ID
  expansion: string,          // TWW, DF, SHDW, etc
  rank: number,              // Recipe quality rank
  type: PRICING_TYPE,        // 'primary' or 'reverse'
  reagents: ItemPricing[],   // Input items: [{itemId, quantity}]
  derivatives: ItemPricing[], // Output items: [{itemId, quantity, matRate?, minAmount?, maxAmount?}]
  createdBy: DMA_SOURCE,     // DMA-API, DMA-LAB, DMA-TSM
}
```

**Processing Order**:
1. Index professions from Blizzard API (if enabled)
2. Build lab pricing methods (prospecting, milling, disenchanting)
3. Build skill line data from CSV
4. Build spell effect data from CSV
5. Build spell reagents data from CSV

### 2. ValuationsService (`apps/market/src/services/valuations.service.ts`)

**Purpose**: Assigns asset classes to items based on their role in the economy.

**Key Methods**:
- `buildAssetClasses()` - Orchestrates all asset class building stages
- `buildAssetClassesFromPricing()` - Marks items as REAGENT or DERIVATIVE based on pricing data
- `buildAssetClassesFromAuctions()` - Marks items as MARKET, COMMDTY, or ITEM based on auction data
- `buildAssetClassesForPremium()` - Marks premium items (reagents with ON_ACQUIRE loot type)
- `buildAssetClassesForCurrency()` - Marks special currency items (Gold, WoW Token)
- `buildTags()` - Builds searchable tags from asset classes and item properties

**Asset Classes** (VALUATION_TYPE):
- `REAGENT` - Item is used as input in recipes
- `DERIVATIVE` - Item is produced by recipes
- `MARKET` - Item appears in auction house
- `COMMDTY` - Item is a commodity (realm-wide pricing)
- `ITEM` - Item is an auction item (realm-specific)
- `PREMIUM` - Special reagent with ON_ACQUIRE loot type
- `GOLD` - Gold currency (item ID 1)
- `WOWTOKEN` - WoW Token (item IDs 122270, 122284)
- `VSP` - Item has vendor sell price

**Processing Order with State Caching**:
Each stage uses Redis to track if it has been processed with the current data state:
1. **Pricing Stage** - Scans all PricingEntity records, assigns REAGENT/DERIVATIVE
2. **Auctions Stage** - Scans MarketEntity records:
   - Assigns MARKET to all items in market
   - Assigns COMMDTY to commodity items (item_id=1 OR type='COMMDTY')
   - Assigns ITEM to auction items (type='AUCTION')
3. **Premium Stage** - Finds items with REAGENT + loot_type='ON_ACQUIRE'
4. **Currency Stage** - Assigns WOWTOKEN and GOLD to specific items
5. **Tags Stage** - Builds tag array from all item properties

**State Management**:
- Uses `generateStateHash()` to create MD5 hash of stage data (pricing count, market count, etc)
- Caches state in Redis with 7-day TTL
- Skips stage if state hash matches cached value

### 3. EvaluationService (`apps/market/src/services/evaluation.service.ts`)

**Purpose**: Evaluates items by combining all pricing methods to determine optimal buying/selling/crafting strategies.

**Key Methods**:
- `evaluateItemPricing()` - Complete evaluation of an item across all pricing methods
- `calculateCraftingCost()` - Computes cost to craft an item from reagents
- `calculateReversePricingValue()` - Computes expected value from reverse methods
- `findProfitableCrafts()` - Identifies all profitable crafting opportunities
- `compareMarketVsCrafting()` - Compares market price to crafting cost
- `scheduledEvaluationJob()` - Runs periodic evaluation for all realms

**Evaluation Process**:
For each item on a realm:
1. Gather all pricing methods:
   - **Market price** from ValuationEntity or MarketEntity
   - **Vendor price** from ItemsEntity.vendorSellPrice
   - **Crafting methods** - Find PricingEntity where item is in derivatives (PRIMARY)
     - Calculate total reagent cost from market prices
     - Calculate cost per unit for each derivative
   - **Reverse methods** - Find PricingEntity where item is in reagents (REVERSE)
     - Calculate expected value from derivative prices × matRate
     - Calculate value per input item

2. Rank methods by confidence and value

3. Determine best methods for different contexts:
   - **Best for buying**: Lowest cost method
   - **Best for selling**: Highest value method
   - **Best for crafting**: Lowest crafting cost

4. Generate recommendations:
   - "Crafting is profitable: XXXg profit (XX% margin)"
   - "Processing is profitable: XXXg per item"
   - "Market price below vendor - buy and vendor"

5. Store in EvaluationEntity for quick retrieval

**Key Calculations**:

Crafting Cost:
```
totalCost = sum(reagent.marketPrice × reagent.quantity)
costPerUnit[derivativeId] = totalCost / derivative.quantity
confidence = (reagentsWithPrices / totalReagents)
```

Reverse Pricing Value:
```
expectedValue = sum(derivative.quantity × derivative.matRate × derivative.marketPrice)
totalCost = sum(reagent.marketPrice × reagent.quantity)
profitMargin = expectedValue - totalCost
profitPercentage = (profitMargin / totalCost) × 100
valuePerInputItem = expectedValue / reagent.quantity
```

**Scheduled Jobs**:
- Runs every 6 hours via cron
- Evaluates all realms
- Stores results in EvaluationEntity for fast queries
- Filters by minimum 5% margin and 100g profit

## Correct Sequence of Operations

### Phase 1: Data Ingestion (PricingService)
**When**: Application bootstrap, scheduled daily

1. **Build Foundation Data** (if enabled):
   ```
   buildSkillLine() - Parse SkillLineAbility.csv
   buildSpellEffect() - Parse SpellEffect.csv  
   buildSpellReagents() - Parse SpellReagents.csv
   ```
   - Creates lookup tables for spell → profession mapping
   - Only runs if CSV hash has changed (Redis cache)

2. **Index Professions from Blizzard API** (if enabled):
   ```
   indexPricing() - Cron: Mon-Fri 10am
   ```
   - Fetches all profession recipes from Blizzard
   - Creates PricingEntity records with type=PRIMARY
   - Queues jobs for detailed processing

3. **Build Lab Pricing Methods** (if enabled):
   ```
   libPricing()
   ├── libPricingProspect() - PROSPECTING methods
   ├── libPricingMilling() - MILLING methods
   └── libPricingDisenchant() - DISENCHANTING methods
   ```
   - Deletes existing lab pricing (createdBy=DMA_SOURCE.LAB)
   - Creates PricingEntity records with type=REVERSE
   - Static data from libs/prospecting.libs.ts, milling.libs.ts, disenchanting.libs.ts

**Output**: PricingEntity table populated with all PRIMARY and REVERSE methods

### Phase 2: Asset Classification (ValuationsService)
**When**: Application bootstrap, after pricing data is available

```
buildAssetClasses()
├── buildAssetClassesFromPricing() - Stage 1: REAGENT, DERIVATIVE
├── buildAssetClassesFromAuctions() - Stage 2: MARKET, COMMDTY, ITEM
├── buildAssetClassesForPremium() - Stage 3: PREMIUM
├── buildAssetClassesForCurrency() - Stage 4: GOLD, WOWTOKEN
└── buildTags() - Stage 5: Tags array
```

Each stage:
- Generates state hash from data
- Checks Redis cache for processed state
- Skips if already processed
- Updates ItemsEntity.assetClass array
- Marks stage as processed in Redis (7-day TTL)

**Output**: ItemsEntity records updated with assetClass arrays and tags

### Phase 3: Evaluation (EvaluationService)
**When**: Scheduled every 6 hours, or on-demand via API

**For Pre-calculation (Scheduled)**:
```
scheduledEvaluationJob() - Cron: Every 6 hours
└── For each realm:
    └── evaluateRealmProfitability()
        ├── findProfitableCrafts() - Find all profitable PRIMARY recipes
        └── For each profitable craft:
            └── evaluateItemPricing() - Full evaluation
                ├── gatherCraftingMethods() - PRIMARY recipes
                ├── gatherReverseMethods() - REVERSE recipes
                ├── getMarketPrice() - Current AH price
                ├── rankPricingMethods() - Sort by confidence
                └── generateRecommendations() - User guidance
```

**For On-Demand (API)**:
```
evaluateItemPricing(itemId, realmId)
├── Get item from ItemsEntity
├── Gather methods:
│   ├── getMarketPrice() - ValuationEntity or MarketEntity
│   ├── vendorPrice - ItemsEntity.vendorSellPrice
│   ├── gatherCraftingMethods() - PricingEntity (derivatives)
│   │   └── calculateCraftingCost() - Sum reagent costs
│   └── gatherReverseMethods() - PricingEntity (reagents)
│       └── calculateReversePricingValue() - Expected value
├── rankPricingMethods() - Sort by confidence/value
├── findBestForBuying/Selling/Crafting()
└── generateRecommendations()
```

**Output**: EvaluationEntity records or ItemEvaluation response

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 1: PRICING                         │
└─────────────────────────────────────────────────────────────────┘
    ↓
Blizzard API        CSV Files              Static Libs
(Professions)       (Game Data)            (TSM Data)
    ↓                   ↓                       ↓
indexPricing()      buildSkillLine()       libPricing()
                    buildSpellEffect()     ├─Prospecting
                    buildSpellReagents()   ├─Milling
                                          └─Disenchanting
    ↓                   ↓                       ↓
└───────────────────────┴───────────────────────┘
                        ↓
              ┌──────────────────┐
              │ PricingEntity    │
              ├──────────────────┤
              │ • PRIMARY        │ ← Crafting recipes
              │ • REVERSE        │ ← Processing methods
              └──────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 2: VALUATION                         │
└─────────────────────────────────────────────────────────────────┘
                        ↓
         buildAssetClassesFromPricing()
                        ↓
              Scan PricingEntity
              ├─ reagents → REAGENT
              └─ derivatives → DERIVATIVE
                        ↓
         buildAssetClassesFromAuctions()
                        ↓
              Scan MarketEntity
              ├─ All items → MARKET
              ├─ Commodities → COMMDTY
              └─ Auctions → ITEM
                        ↓
         buildAssetClassesForPremium()
         buildAssetClassesForCurrency()
         buildTags()
                        ↓
              ┌──────────────────┐
              │ ItemsEntity      │
              ├──────────────────┤
              │ • assetClass[]   │
              │ • tags[]         │
              └──────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 3: EVALUATION                         │
└─────────────────────────────────────────────────────────────────┘
                        ↓
         evaluateItemPricing(itemId, realmId)
                        ↓
    ┌──────────────────┼──────────────────┐
    ↓                  ↓                  ↓
Market Price      Crafting Cost     Reverse Value
(ValuationEntity) (PRIMARY)         (REVERSE)
    ↓                  ↓                  ↓
    └──────────────────┼──────────────────┘
                       ↓
              rankPricingMethods()
              findBestForBuying/Selling/Crafting()
              generateRecommendations()
                       ↓
              ┌──────────────────┐
              │ ItemEvaluation   │ → API Response
              │ EvaluationEntity │ → Pre-calculated
              └──────────────────┘
```

## Key Dependencies and Assumptions

### Dependencies
1. **PricingService** depends on:
   - Blizzard API availability
   - CSV files in S3 (cmnw bucket)
   - Static library data (prospecting, milling, disenchanting)
   - KeysEntity for API credentials

2. **ValuationsService** depends on:
   - PricingEntity being populated
   - MarketEntity having current auction data
   - ItemsEntity having basic item information

3. **EvaluationService** depends on:
   - PricingEntity being populated
   - ItemsEntity having assetClass arrays
   - ValuationEntity or MarketEntity having current prices
   - RealmsEntity for realm information

### Assumptions
1. **Data Freshness**:
   - Market data is refreshed regularly by auction indexing
   - Pricing methods are relatively static (updated daily at most)
   - CSV files change infrequently (game patches)

2. **Price Sources Priority**:
   - ValuationEntity (aggregated) > MarketEntity (raw)
   - Most recent data preferred
   - Weighted average for market prices

3. **Reverse Pricing Matrate**:
   - `matRate` represents drop chance (0.0 to 1.0)
   - `quantity` is base amount before drop chance
   - Expected value = quantity × matRate × market price

4. **Asset Class Uniqueness**:
   - Items can have multiple asset classes (array)
   - Asset classes are additive, not replaced
   - Tags are rebuilt from scratch each time

## Implementation Recommendations

### 1. Processing Order
Always follow this sequence:
```
1. PricingService.indexPricing() / libPricing()
2. ValuationsService.buildAssetClasses()
3. EvaluationService.scheduledEvaluationJob()
```

### 2. Configuration Management
Enable stages based on needs:
```typescript
// For initial setup - run all
DMA_INDEX_ITEMS_PRICING=true
DMA_INDEX_ITEMS_PRICING_BUILD=true
DMA_INDEX_ITEMS_PRICING_LAB=true
DMA_PRICING_LAB_PROSPECTING=true
DMA_PRICING_LAB_MILLING=true
DMA_PRICING_LAB_DISENCHANTING=true
DMA_VALUATIONS_BUILD=true
DMA_VALUATIONS_FROM_PRICING=true
DMA_VALUATIONS_FROM_AUCTIONS=true

// For production - enable only necessary stages
```

### 3. Performance Optimization
- CSV processing uses Redis hash caching to skip unchanged files
- Valuation stages use Redis state hashing to skip unchanged data
- Batch operations use chunking (500 records per batch)
- Evaluation uses batch price fetching for reagents/derivatives

### 4. Data Integrity
- Always delete old lab pricing before recreating
- Use array_append for asset classes to avoid duplicates
- Check for existing asset classes before adding
- Use confidence scores to filter incomplete data

### 5. Error Handling
- Each service method has try/catch with logging
- Invalid API responses are caught and logged
- Missing market data reduces confidence but doesn't fail evaluation
- CSV parsing errors skip individual rows but continue processing

### 6. API Usage
**For Complete Evaluation**:
```typescript
const evaluation = await evaluationService.evaluateItemPricing(
  itemId, 
  connectedRealmId,
  {
    includeVendor: true,
    includeCrafting: true, 
    includeReverse: true,
    minConfidence: 0.5
  }
);
```

**For Profitable Crafts**:
```typescript
const profitable = await evaluationService.findProfitableCrafts(
  connectedRealmId,
  {
    minMargin: 5,        // 5% profit margin
    minProfit: 100,      // 100g absolute profit
    expansion: 'TWW',    // Current expansion
    profession: 'ALCH'   // Specific profession
  }
);
```

**For Pre-calculated Results**:
```typescript
const evaluations = await evaluationService.getPreCalculatedEvaluations(
  connectedRealmId,
  {
    minProfitMargin: 10,
    profession: 'JWLC',
    limit: 50
  }
);
```

## Critical Files

### Service Files
- `apps/market/src/services/pricing.service.ts` - Recipe/method indexing
- `apps/market/src/services/valuations.service.ts` - Asset class assignment  
- `apps/market/src/services/evaluation.service.ts` - Price evaluation

### Entity Files
- `libs/pg/src/entity/pricing.entity.ts` - Recipe storage
- `libs/pg/src/entity/items.entity.ts` - Item data with asset classes
- `libs/pg/src/entity/valuation.entity.ts` - Aggregated market prices
- `libs/pg/src/entity/market.entity.ts` - Raw auction data
- `libs/pg/src/entity/evaluation.entity.ts` - Pre-calculated evaluations

### Static Data Files
- `apps/market/src/libs/prospecting.libs.ts` - Ore to gem conversions
- `apps/market/src/libs/milling.libs.ts` - Herb to pigment conversions
- `apps/market/src/libs/disenchanting.libs.ts` - Gear to enchanting materials

### Configuration Files
- `libs/configuration/src/dma.config.ts` - Feature flags
- `libs/configuration/src/interfaces/dma.interface.ts` - Config interface

### Type Definition Files
- `libs/resources/src/types/evaluation/evaluation.interface.ts` - Evaluation types
- `libs/resources/src/constants/dma.constants.ts` - Enums and constants

## Summary

The system operates in three distinct phases:

1. **Pricing Phase**: Ingests all possible pricing methods from multiple sources (API, CSV, static data)
2. **Valuation Phase**: Classifies items based on their economic roles using the pricing data
3. **Evaluation Phase**: Combines all data to find profitable opportunities and make recommendations

The key to correct operation is ensuring:
- Pricing data is complete before valuation
- Valuation asset classes are assigned before evaluation
- Market data is fresh for accurate price calculations
- Confidence scores are used to filter incomplete data
- State caching prevents redundant processing

Each phase is independently configurable through environment variables, allowing selective execution based on needs.
