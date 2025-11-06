import { PRICING_TYPE, VALUATION_TYPE } from '@app/resources/constants';
import { PricingEntity } from '@app/pg';

/**
 * Source of pricing information
 */
export type PricingMethodSource = 'crafting' | 'reverse' | 'market' | 'vendor';

/**
 * A pricing method represents one way to obtain or value an item
 */
export interface PricingMethod {
  source: PricingMethodSource;
  type: PRICING_TYPE;
  pricing?: PricingEntity;
  marketPrice?: number;
  vendorPrice?: number;
  calculatedValue: number;
  confidence: number; // 0-1 based on data availability
  metadata?: Record<string, any>;
}

/**
 * Comprehensive evaluation result for an item
 */
export interface ItemEvaluation {
  itemId: number;
  connectedRealmId: number;
  timestamp: number;

  // All available pricing methods
  methods: PricingMethod[];

  // Best method for different contexts
  bestForBuying?: PricingMethod;
  bestForSelling?: PricingMethod;
  bestForCrafting?: PricingMethod;

  // Market data
  currentMarketPrice?: number;
  marketVolume?: number;

  // Vendor data
  vendorSellPrice?: number;
  vendorPurchasePrice?: number;

  // Asset classification
  assetClass: VALUATION_TYPE[];

  // Recommendations
  recommendations: string[];
}

/**
 * Crafting cost calculation result
 */
export interface CraftingCost {
  recipeId: number;
  totalCost: number;
  reagentCosts: Array<{
    itemId: number;
    cost: number;
    quantity: number;
    marketPrice: number;
  }>;
  derivatives: Array<{ itemId: number; quantity: number }>;
  costPerUnit: Record<number, number>; // For each derivative itemId
  missingData: number[]; // Items without market data
  confidence: number;
}

/**
 * Disenchant value calculation result
 */
export interface DisenchantValue {
  itemId: number;
  expectedValue: number;
  derivatives: Array<{
    itemId: number;
    quantity: number;
    matRate: number;
    value: number;
    minAmount: number;
    maxAmount: number;
  }>;
  breakEvenPrice: number;
  confidence: number;
}

/**
 * Prospecting value calculation result (same structure as disenchant)
 */
export type ProspectingValue = DisenchantValue;

/**
 * Milling value calculation result (same structure as disenchant)
 */
export type MillingValue = DisenchantValue;

/**
 * Reverse pricing value (generic for prospecting, milling, disenchanting)
 */
export interface ReversePricingValue {
  recipeId: number;
  spellId: number;
  profession: string;
  expectedValue: number;
  totalCost: number;
  derivatives: Array<{
    itemId: number;
    quantity: number;
    matRate?: number;
    value: number;
    minAmount?: number;
    maxAmount?: number;
  }>;
  profitMargin: number;
  profitPercentage: number;
  confidence: number;
}

/**
 * Comparison between market price and crafting cost
 */
export interface PriceComparison {
  itemId: number;
  connectedRealmId: number;
  marketPrice: number;
  craftingCost: number;
  profit: number;
  profitMargin: number; // percentage
  isProfitable: boolean;
  bestRecipe?: {
    recipeId: number;
    cost: number;
    rank?: number;
  };
}

/**
 * Options for evaluation
 */
export interface EvaluationOptions {
  includeVendor?: boolean;
  includeCrafting?: boolean;
  includeReverse?: boolean;
  minConfidence?: number;
  preferredExpansion?: string;
  includeAlternatives?: boolean;
}

/**
 * Options for finding profitable crafts
 */
export interface ProfitableCraftOptions {
  minMargin?: number; // minimum profit margin percentage
  minProfit?: number; // minimum absolute profit
  maxCraftingCost?: number; // maximum crafting cost
  expansion?: string;
  profession?: string;
}
