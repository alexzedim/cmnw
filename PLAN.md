# Implementation Plan: Item Pricing & Valuation Evaluation System

## Problem Statement

The current system has two separate services that handle pricing data:
1. **PricingService** - Manages pricing methods (crafting recipes, prospecting, milling, disenchanting) from various sources (Blizzard API, CSV files, hardcoded data)
2. **ValuationsService** - Builds asset classes for items based on their role in the economy (REAGENT, DERIVATIVE, MARKET, COMMDTY, etc.)

These services work independently and don't provide a unified way to evaluate item values across different pricing methods. We need to create a comprehensive evaluation system that:
- Gathers all pricing methods applicable to an item
- Calculates values using different strategies (market price, crafting cost, disenchant value, etc.)
- Evaluates which pricing method is most favorable
- Provides a complete pricing picture for each item

## Current State

### PricingService (`apps/market/src/services/pricing.service.ts`)

**Purpose:** Manages pricing methods and recipe data

**Key Methods:**
- `indexPricing()` - Fetches profession recipes from Blizzard API, queues them for processing
- `libPricing()` - Creates reverse pricing methods (prospecting, milling, disenchanting)
- `buildSkillLine()` - Builds skill line data from CSV (SkillLineAbility.csv)
- `buildSpellEffect()` - Builds spell effect data from CSV (SpellEffect.csv)
- `buildSpellReagents()` - Builds spell reagents data from CSV (SpellReagents.csv)

**Data Sources:**
1. **Blizzard API** - Primary crafting recipes via profession index
2. **Local CSV files** - SkillLineAbility, SpellEffect, SpellReagents from S3
3. **Hardcoded Libraries** - PROSPECTING, MILLING, DISENCHANTING constants with predefined conversion rates

**PricingEntity Structure:**
```typescript
{
  ticker: string,                    // e.g., "JWLC", "ENCH"
  names: ItemNames,                  // Localized names
  description: ItemNames,            // Localized descriptions
  media: string,                     // Icon URL
  derivatives: ItemPricing[],        // Output items: [{itemId, quantity}]
  reagents: ItemPricing[],          // Input items: [{itemId, quantity}]
  recipeId: number,                 // Unique recipe identifier
  spellId: number,                  // Spell ID for crafting
  profession: string,               // Profession name/ID
  expansion: string,                // CLSC, TBC, TWW, etc.
  rank: number,                     // Recipe rank/tier
  type: PRICING_TYPE,               // primary, reverse, derivative, review
  createdBy: DMA_SOURCE,            // API, LAB, TSM
  updatedBy: DMA_SOURCE
}
```

**Pricing Types:**
- `PRIMARY` - Normal crafting (reagents → derivatives)
- `REVERSE` - Reverse operations (prospecting, milling, disenchanting)
- `DERIVATIVE` - (not currently used)
- `REVIEW` - (not currently used)

### ValuationsService (`apps/market/src/services/valuations.service.ts`)

**Purpose:** Categorizes items by their economic role

**Key Methods:**
- `buildAssetClassesFromPricing()` - Marks items as REAGENT or DERIVATIVE based on pricing recipes
- `buildAssetClassesFromAuctions()` - Marks items as MARKET, COMMDTY, or ITEM based on auction data
- `buildAssetClassesForPremium()` - Marks special reagents as PREMIUM
- `buildAssetClassesForCurrency()` - Marks currency items (Gold, WoW Token)
- `buildTags()` - Builds searchable tags from item properties
- `addAssetClassToItem()` - Helper to add asset class to item

**Asset Classes (VALUATION_TYPE):**
- `REAGENT` - Used as input in crafting recipes
- `DERIVATIVE` - Produced by crafting recipes
- `MARKET` - Available on any market (auction house)
- `COMMDTY` - Commodity (realm-wide market)
- `ITEM` - Auction item (server-specific)
- `PREMIUM` - Special reagents with ON_ACQUIRE loot type
- `VSP` - Has vendor sell price
- `GOLD` - Gold currency (item_id: 1)
- `WOWTOKEN` - WoW Token (item_id: 122270, 122284)

**State Management:**
- Uses Redis to track processed state by hashing data
- Skips re-processing if data hasn't changed
- Each stage (pricing, auctions, premium, currency, tags) tracked separately

### MarketEntity & ValuationEntity

**MarketEntity** - Raw auction/commodity data:
```typescript
{
  orderId: string,
  itemId: number,
  connectedRealmId: number,
  price: number,               // Listed price
  bid: number,                 // Bid price (auctions)
  quantity: number,            // Stack size
  value: number,               // Calculated value
  type: MARKET_TYPE,           // AUCTION, COMMDTY, GOLD, TOKEN
  timestamp: number
}
```

**ValuationEntity** - Aggregated market valuations:
```typescript
{
  itemId: number,
  connectedRealmId: number,
  open: number,                // Opening price
  high: number,                // High price
  low: number,                 // Low price
  close: number,               // Closing price
  market: number,              // Market price (calculated)
  value: number,               // Total value
  vendorSellPrice: number,     // VSP fallback
  quantity: number,            // Total quantity
  iteration: number,           // Processing iteration
  timestamp: number
}
```

### Related Constants & Types

**PRICING_TYPE:**
- `primary` - Standard crafting recipes
- `reverse` - Prospecting, milling, disenchanting
- `derivative` - Derived pricing
- `review` - Review pricing

**DMA_SOURCE:**
- `DMA-API` - Blizzard API
- `DMA-LAB` - Locally generated data
- `DMA-TSM` - TradeSkillMaster data

**Reverse Pricing Examples:**
- **PROSPECTING** (spellId: 31252) - 5 ore → 0.5-1.0 gems
- **MILLING** (spellId: 51005) - 5 herbs → pigments
- **DISENCHANTING** (spellId: 13262) - 1 gear → dust/essence/shard

## Proposed Changes

### 1. Create New Evaluation Service

**File:** `apps/market/src/services/evaluation.service.ts`

**Purpose:** Centralized service to evaluate item pricing using all available methods

**Key Responsibilities:**
- Gather all pricing methods for a given item
- Calculate values using different strategies
- Determine optimal pricing method
- Support multiple evaluation contexts (buyer, seller, crafter)

### 2. Core Evaluation Methods

#### `gatherPricingMethods(itemId: number): Promise<PricingMethod[]>`
Collect all pricing methods where the item appears:
- As a derivative (items that can produce this item)
- As a reagent (items this can produce)
- From market data (current market prices)
- VSP (vendor sell price)

#### `evaluateItemPricing(itemId: number, connectedRealmId: number, options?: EvaluationOptions): Promise<ItemEvaluation>`
Main evaluation method that:
1. Gathers all pricing methods
2. Fetches current market data
3. Calculates values for each method
4. Ranks methods by profitability/relevance
5. Returns comprehensive evaluation result

#### `calculateCraftingCost(pricing: PricingEntity, marketData: Map<number, number>): Promise<CraftingCost>`
Calculate the cost to craft an item:
- Sum reagent costs (quantity × market price)
- Handle missing market data (use alternatives or VSP)
- Calculate per-unit cost for derivatives

#### `calculateDisenchantValue(pricing: PricingEntity, marketData: Map<number, number>): Promise<DisenchantValue>`
Calculate expected value from disenchanting:
- Sum derivative values weighted by probability (matRate × quantity)
- Account for min/max amounts
- Return expected value per item

#### `calculateProspectingValue(pricing: PricingEntity, marketData: Map<number, number>): Promise<ProspectingValue>`
Similar to disenchant, but for ore → gems conversion

#### `compareMarketVsCrafting(itemId: number, connectedRealmId: number): Promise<PriceComparison>`
Compare market price vs crafting cost:
- Calculate profit margin
- Identify arbitrage opportunities
- Consider all recipe ranks/variants

### 3. Supporting Types & Interfaces

```typescript
interface PricingMethod {
  source: 'crafting' | 'reverse' | 'market' | 'vendor';
  type: PRICING_TYPE;
  pricing?: PricingEntity;
  marketPrice?: number;
  vendorPrice?: number;
  calculatedValue: number;
  confidence: number; // 0-1 based on data availability
}

interface ItemEvaluation {
  itemId: number;
  connectedRealmId: number;
  timestamp: number;
  
  // All available pricing methods
  methods: PricingMethod[];
  
  // Best method for different contexts
  bestForBuying: PricingMethod;
  bestForSelling: PricingMethod;
  bestForCrafting: PricingMethod;
  
  // Market data
  currentMarketPrice: number;
  marketVolume: number;
  
  // Vendor data
  vendorSellPrice: number;
  vendorPurchasePrice: number;
  
  // Asset classification
  assetClass: VALUATION_TYPE[];
  
  // Recommendations
  recommendations: string[];
}

interface CraftingCost {
  recipeId: number;
  totalCost: number;
  reagentCosts: { itemId: number; cost: number; quantity: number }[];
  derivatives: { itemId: number; quantity: number }[];
  costPerUnit: Map<number, number>; // For each derivative
  missingData: number[]; // Items without market data
}

interface DisenchantValue {
  itemId: number;
  expectedValue: number;
  derivatives: {
    itemId: number;
    quantity: number;
    matRate: number;
    value: number;
    minAmount: number;
    maxAmount: number;
  }[];
  breakEvenPrice: number;
}

interface EvaluationOptions {
  includeVendor?: boolean;
  includeCrafting?: boolean;
  includeReverse?: boolean;
  minConfidence?: number;
  preferredExpansion?: string;
}
```

### 4. Integration Points

#### With PricingService
- Read from `PricingEntity` repository
- Use existing pricing data without modification
- No changes needed to PricingService

#### With ValuationsService
- Read `assetClass` from `ItemsEntity`
- Use asset classes to filter/prioritize methods
- No changes needed to ValuationsService

#### With MarketEntity
- Query latest market data by itemId and connectedRealmId
- Calculate weighted averages for pricing
- Use quantity as volume indicator

#### With ValuationEntity
- Use aggregated market price if available
- Fallback to direct MarketEntity queries if needed

### 5. Helper Methods

```typescript
// Get latest market price for an item
private async getMarketPrice(itemId: number, connectedRealmId: number): Promise<number>

// Get vendor sell price
private async getVendorSellPrice(itemId: number): Promise<number>

// Fetch market data for multiple items efficiently
private async batchGetMarketPrices(itemIds: number[], connectedRealmId: number): Promise<Map<number, number>>

// Calculate weighted average market price
private calculateWeightedAverage(markets: MarketEntity[]): number

// Check if pricing method is applicable based on asset class
private isPricingMethodApplicable(pricing: PricingEntity, assetClass: string[]): boolean

// Rank pricing methods by confidence and value
private rankPricingMethods(methods: PricingMethod[]): PricingMethod[]
```

### 6. Usage Examples

```typescript
// Evaluate a single item
const evaluation = await evaluationService.evaluateItemPricing(
  152631, // Shimmerscale
  3391,   // EU realm
  { includeCrafting: true, includeReverse: true }
);

// Compare crafting vs buying
const comparison = await evaluationService.compareMarketVsCrafting(152631, 3391);

// Find all items that can be crafted profitably
const profitable = await evaluationService.findProfitableCrafts(3391, { minMargin: 0.1 });

// Evaluate disenchanting value
const item = await itemsRepository.findOne({ where: { id: 12345 } });
const pricings = await pricingRepository.find({
  where: { reagents: /* contains item */ }
});
for (const pricing of pricings) {
  const value = await evaluationService.calculateDisenchantValue(pricing, marketData);
}
```

### 7. Implementation Steps

1. ✅ **Create base evaluation service structure**
   - ✅ Set up dependency injection
   - ✅ Add repository injections (PricingEntity, ItemsEntity, MarketEntity, ValuationEntity, EvaluationEntity, RealmsEntity)
   - ✅ Create logger

2. ✅ **Implement data gathering methods**
   - ✅ `gatherPricingMethods()`
   - ✅ `gatherCraftingMethods()`
   - ✅ `gatherReverseMethods()`
   - ✅ `batchGetMarketPrices()`
   - ✅ Helper methods for data fetching

3. ✅ **Implement calculation methods**
   - ✅ `calculateCraftingCost()`
   - ✅ `calculateReversePricingValue()` (covers disenchant, prospecting, milling)

4. ✅ **Implement main evaluation method**
   - ✅ `evaluateItemPricing()`
   - ✅ Ranking and recommendation logic

5. ✅ **Add comparison methods**
   - ✅ `compareMarketVsCrafting()`
   - ✅ `findProfitableCrafts()`

6. ✅ **Add scheduled evaluation system**
   - ✅ Created `EvaluationEntity` to store results
   - ✅ Implemented `scheduledEvaluationJob()` (runs every 6 hours)
   - ✅ Implemented `evaluateRealmProfitability()` for batch processing
   - ✅ Implemented `getPreCalculatedEvaluations()` for querying results

7. 🔄 **Create unit tests** (TODO)
   - Mock repositories
   - Test calculation logic
   - Test edge cases (missing data, multiple methods)

8. 🔄 **Integration testing** (TODO)
   - Test with real data from development database
   - Verify performance with large datasets

9. 🔄 **Documentation** (TODO)
   - Add JSDoc comments
   - Create usage guide
   - Document pricing method priorities

## Scheduled Evaluation System

### Overview
The system now includes a scheduled job that pre-calculates profitable crafting opportunities and stores them in the `evaluations` table for fast retrieval.

### Schedule
- **Frequency**: Every 6 hours (cron: `0 */6 * * *`)
- **Trigger**: Automatic via `@Cron` decorator
- **Bootstrap**: Commented out by default to avoid running on every startup

### Process Flow
1. Job fetches all realms from database
2. For each realm:
   - Calls `findProfitableCrafts()` with filters:
     - Minimum 5% profit margin
     - Minimum 100g absolute profit
   - Evaluates each profitable craft for full context
   - Creates `EvaluationEntity` records with:
     - Market price, crafting cost, profit, margin
     - Best recipe ID and rank
     - Profession and expansion
     - Asset classes
     - Recommendations
     - Confidence score and market volume
3. Batch saves evaluations (500 per chunk)
4. Logs summary statistics

### Data Storage
**EvaluationEntity** stores:
- Item and realm identifiers
- Price data (market, crafting, vendor, reverse)
- Profitability metrics (profit, margin, isProfitable flag)
- Recipe details (ID, rank, profession, expansion)
- Metadata (asset classes, recommendations, confidence)
- Timestamps for freshness tracking

### Indexes
- `item_id` - for item lookups
- `connected_realm_id` - for realm filtering
- `timestamp` - for freshness queries
- `profit_margin` - for sorting by profitability

### Retrieval
Use `getPreCalculatedEvaluations()` with options:
- `minProfitMargin` - filter by minimum margin %
- `profession` - filter by profession (e.g., "JWLC")
- `expansion` - filter by expansion (e.g., "TWW")
- `limit` - limit number of results

Results are ordered by profit margin (descending) by default.

### Benefits
- Fast queries without real-time calculation
- Historical tracking of profitable opportunities
- Reduced load on market price queries
- Pre-filtered results for UI consumption

## Notes

- The evaluation service is read-only and doesn't modify existing pricing/valuation data
- Market prices should be cached to avoid repeated queries
- Consider adding Redis caching for frequently evaluated items
- Handle missing market data gracefully (fallback to VSP or skip)
- The service should be stateless to support horizontal scaling
- Pricing confidence scores help users understand data quality
- Reverse pricing probabilities (matRate) represent expected yield
- Multiple recipe ranks should be evaluated (higher rank = lower cost usually)
- Scheduled job can be resource-intensive on large datasets - monitor performance
- Old evaluations are deleted before inserting new ones to prevent table bloat
