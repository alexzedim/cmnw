import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ItemsEntity,
  MarketEntity,
  PricingEntity,
  ValuationEntity,
} from '@app/pg';
import { In, Repository } from 'typeorm';
import {
  CraftingCost,
  DisenchantValue,
  EvaluationOptions,
  ItemEvaluation,
  PriceComparison,
  PricingMethod,
  ProfitableCraftOptions,
  ReversePricingValue,
} from '@app/resources';
import { PRICING_TYPE, VALUATION_TYPE } from '@app/resources/constants';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(PricingEntity)
    private readonly pricingRepository: Repository<PricingEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ValuationEntity)
    private readonly valuationRepository: Repository<ValuationEntity>,
  ) {}

  /**
   * Main evaluation method - gathers all pricing methods and evaluates an item
   */
  async evaluateItemPricing(
    itemId: number,
    connectedRealmId: number,
    options: EvaluationOptions = {},
  ): Promise<ItemEvaluation> {
    const logTag = 'evaluateItemPricing';
    const timestamp = Date.now();

    try {
      // Get item details
      const item = await this.itemsRepository.findOne({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      const assetClass = item.assetClass || [];

      // Gather all pricing methods
      const methods: PricingMethod[] = [];

      // Get market price
      if (options.includeVendor !== false) {
        const marketPrice = await this.getMarketPrice(
          itemId,
          connectedRealmId,
        );
        if (marketPrice) {
          methods.push({
            source: 'market',
            type: PRICING_TYPE.PRIMARY,
            marketPrice,
            calculatedValue: marketPrice,
            confidence: 0.9,
          });
        }
      }

      // Get vendor price
      if (options.includeVendor && item.vendorSellPrice) {
        methods.push({
          source: 'vendor',
          type: PRICING_TYPE.PRIMARY,
          vendorPrice: item.vendorSellPrice,
          calculatedValue: item.vendorSellPrice,
          confidence: 1.0,
        });
      }

      // Get crafting methods (where this item is a derivative)
      if (options.includeCrafting !== false) {
        const craftingMethods = await this.gatherCraftingMethods(
          itemId,
          connectedRealmId,
        );
        methods.push(...craftingMethods);
      }

      // Get reverse pricing methods (where this item is a reagent)
      if (options.includeReverse !== false) {
        const reverseMethods = await this.gatherReverseMethods(
          itemId,
          connectedRealmId,
        );
        methods.push(...reverseMethods);
      }

      // Filter by confidence if specified
      const filteredMethods =
        options.minConfidence !== undefined
          ? methods.filter((m) => m.confidence >= options.minConfidence!)
          : methods;

      // Rank methods
      const rankedMethods = this.rankPricingMethods(filteredMethods);

      // Determine best methods for different contexts
      const bestForBuying = this.findBestForBuying(rankedMethods);
      const bestForSelling = this.findBestForSelling(rankedMethods);
      const bestForCrafting = this.findBestForCrafting(rankedMethods);

      // Get market data
      const currentMarketPrice = await this.getMarketPrice(
        itemId,
        connectedRealmId,
      );
      const marketVolume = await this.getMarketVolume(
        itemId,
        connectedRealmId,
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        rankedMethods,
        currentMarketPrice,
        item.vendorSellPrice,
      );

      return {
        itemId,
        connectedRealmId,
        timestamp,
        methods: rankedMethods,
        bestForBuying,
        bestForSelling,
        bestForCrafting,
        currentMarketPrice,
        marketVolume,
        vendorSellPrice: item.vendorSellPrice,
        vendorPurchasePrice: item.purchasePrice,
        assetClass,
        recommendations,
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        itemId,
        connectedRealmId,
        errorOrException,
      });
      throw errorOrException;
    }
  }

  /**
   * Gather crafting methods where the item is produced (derivative)
   */
  private async gatherCraftingMethods(
    itemId: number,
    connectedRealmId: number,
  ): Promise<PricingMethod[]> {
    const logTag = 'gatherCraftingMethods';
    const methods: PricingMethod[] = [];

    try {
      // Find all recipes that produce this item
      const pricings = await this.pricingRepository
        .createQueryBuilder('pricing')
        .where("pricing.derivatives::jsonb @> :itemFilter", {
          itemFilter: JSON.stringify([{ itemId }]),
        })
        .andWhere('pricing.type = :type', { type: PRICING_TYPE.PRIMARY })
        .getMany();

      // Calculate crafting cost for each recipe
      for (const pricing of pricings) {
        const craftingCost = await this.calculateCraftingCost(
          pricing,
          connectedRealmId,
        );

        if (craftingCost && craftingCost.costPerUnit[itemId]) {
          methods.push({
            source: 'crafting',
            type: PRICING_TYPE.PRIMARY,
            pricing,
            calculatedValue: craftingCost.costPerUnit[itemId],
            confidence: craftingCost.confidence,
            metadata: {
              craftingCost,
              recipeId: pricing.recipeId,
              expansion: pricing.expansion,
              profession: pricing.profession,
            },
          });
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, itemId, errorOrException });
    }

    return methods;
  }

  /**
   * Gather reverse pricing methods where the item is used (reagent)
   */
  private async gatherReverseMethods(
    itemId: number,
    connectedRealmId: number,
  ): Promise<PricingMethod[]> {
    const logTag = 'gatherReverseMethods';
    const methods: PricingMethod[] = [];

    try {
      // Find all reverse recipes that use this item
      const pricings = await this.pricingRepository
        .createQueryBuilder('pricing')
        .where("pricing.reagents::jsonb @> :itemFilter", {
          itemFilter: JSON.stringify([{ itemId }]),
        })
        .andWhere('pricing.type = :type', { type: PRICING_TYPE.REVERSE })
        .getMany();

      // Calculate reverse value for each recipe
      for (const pricing of pricings) {
        const reverseValue = await this.calculateReversePricingValue(
          pricing,
          connectedRealmId,
        );

        if (reverseValue) {
          // Calculate value per input item
          const reagentsArray =
            typeof pricing.reagents === 'string'
              ? JSON.parse(pricing.reagents)
              : pricing.reagents;

          const reagent = reagentsArray.find((r: any) => {
            const rId = typeof r === 'object' ? r.itemId : r;
            return rId === itemId;
          });

          if (reagent) {
            const quantity =
              typeof reagent === 'object' ? reagent.quantity : 1;
            const valuePerItem = reverseValue.expectedValue / quantity;

            methods.push({
              source: 'reverse',
              type: PRICING_TYPE.REVERSE,
              pricing,
              calculatedValue: valuePerItem,
              confidence: reverseValue.confidence,
              metadata: {
                reverseValue,
                profession: pricing.profession,
                spellId: pricing.spellId,
              },
            });
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, itemId, errorOrException });
    }

    return methods;
  }

  /**
   * Calculate the cost to craft an item from a recipe
   */
  async calculateCraftingCost(
    pricing: PricingEntity,
    connectedRealmId: number,
  ): Promise<CraftingCost | null> {
    const logTag = 'calculateCraftingCost';

    try {
      const reagentsArray =
        typeof pricing.reagents === 'string'
          ? JSON.parse(pricing.reagents)
          : pricing.reagents;

      const derivativesArray =
        typeof pricing.derivatives === 'string'
          ? JSON.parse(pricing.derivatives)
          : pricing.derivatives;

      if (!reagentsArray || reagentsArray.length === 0) {
        return null;
      }

      // Get all reagent item IDs
      const reagentItemIds = reagentsArray.map((r: any) =>
        typeof r === 'object' ? r.itemId : r,
      );

      // Batch fetch market prices
      const marketPrices = await this.batchGetMarketPrices(
        reagentItemIds,
        connectedRealmId,
      );

      let totalCost = 0;
      const reagentCosts: CraftingCost['reagentCosts'] = [];
      const missingData: number[] = [];
      let missingCount = 0;

      // Calculate cost for each reagent
      for (const reagent of reagentsArray) {
        const itemId = typeof reagent === 'object' ? reagent.itemId : reagent;
        const quantity =
          typeof reagent === 'object' ? reagent.quantity : 1;

        const marketPrice = marketPrices.get(itemId);

        if (marketPrice) {
          const cost = marketPrice * quantity;
          totalCost += cost;
          reagentCosts.push({
            itemId,
            cost,
            quantity,
            marketPrice,
          });
        } else {
          missingData.push(itemId);
          missingCount++;
        }
      }

      // Calculate confidence based on data availability
      const confidence =
        reagentsArray.length > 0
          ? (reagentsArray.length - missingCount) / reagentsArray.length
          : 0;

      // Calculate cost per derivative unit
      const costPerUnit: Record<number, number> = {};
      for (const derivative of derivativesArray) {
        const itemId =
          typeof derivative === 'object' ? derivative.itemId : derivative;
        const quantity =
          typeof derivative === 'object' ? derivative.quantity : 1;

        if (quantity > 0) {
          costPerUnit[itemId] = totalCost / quantity;
        }
      }

      return {
        recipeId: pricing.recipeId,
        totalCost,
        reagentCosts,
        derivatives: derivativesArray.map((d: any) => ({
          itemId: typeof d === 'object' ? d.itemId : d,
          quantity: typeof d === 'object' ? d.quantity : 1,
        })),
        costPerUnit,
        missingData,
        confidence,
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        recipeId: pricing.recipeId,
        errorOrException,
      });
      return null;
    }
  }

  /**
   * Calculate expected value from reverse pricing (disenchant/prospect/mill)
   */
  async calculateReversePricingValue(
    pricing: PricingEntity,
    connectedRealmId: number,
  ): Promise<ReversePricingValue | null> {
    const logTag = 'calculateReversePricingValue';

    try {
      const reagentsArray =
        typeof pricing.reagents === 'string'
          ? JSON.parse(pricing.reagents)
          : pricing.reagents;

      const derivativesArray =
        typeof pricing.derivatives === 'string'
          ? JSON.parse(pricing.derivatives)
          : pricing.derivatives;

      if (!derivativesArray || derivativesArray.length === 0) {
        return null;
      }

      // Get all derivative item IDs
      const derivativeItemIds = derivativesArray.map((d: any) =>
        typeof d === 'object' ? d.itemId : d,
      );

      // Batch fetch market prices
      const marketPrices = await this.batchGetMarketPrices(
        derivativeItemIds,
        connectedRealmId,
      );

      let expectedValue = 0;
      const derivatives: ReversePricingValue['derivatives'] = [];
      let missingCount = 0;

      // Calculate expected value for each derivative
      for (const derivative of derivativesArray) {
        const itemId =
          typeof derivative === 'object' ? derivative.itemId : derivative;
        const quantity =
          typeof derivative === 'object' ? derivative.quantity : 0;
        const matRate =
          typeof derivative === 'object' ? derivative.matRate : 1;

        const marketPrice = marketPrices.get(itemId);

        if (marketPrice) {
          // Expected value = quantity * matRate * market price
          const value = quantity * (matRate || 1) * marketPrice;
          expectedValue += value;

          derivatives.push({
            itemId,
            quantity,
            matRate,
            value,
            minAmount:
              typeof derivative === 'object' ? derivative.minAmount : 0,
            maxAmount:
              typeof derivative === 'object' ? derivative.maxAmount : 0,
          });
        } else {
          missingCount++;
          derivatives.push({
            itemId,
            quantity,
            matRate,
            value: 0,
            minAmount:
              typeof derivative === 'object' ? derivative.minAmount : 0,
            maxAmount:
              typeof derivative === 'object' ? derivative.maxAmount : 0,
          });
        }
      }

      // Calculate cost of input materials
      const reagentItemIds = reagentsArray.map((r: any) =>
        typeof r === 'object' ? r.itemId : r,
      );
      const reagentPrices = await this.batchGetMarketPrices(
        reagentItemIds,
        connectedRealmId,
      );

      let totalCost = 0;
      for (const reagent of reagentsArray) {
        const itemId = typeof reagent === 'object' ? reagent.itemId : reagent;
        const quantity =
          typeof reagent === 'object' ? reagent.quantity : 1;
        const price = reagentPrices.get(itemId) || 0;
        totalCost += price * quantity;
      }

      const profitMargin = expectedValue - totalCost;
      const profitPercentage =
        totalCost > 0 ? (profitMargin / totalCost) * 100 : 0;

      // Calculate confidence based on data availability
      const confidence =
        derivativesArray.length > 0
          ? (derivativesArray.length - missingCount) / derivativesArray.length
          : 0;

      return {
        recipeId: pricing.recipeId,
        spellId: pricing.spellId,
        profession: pricing.profession,
        expectedValue,
        totalCost,
        derivatives,
        profitMargin,
        profitPercentage,
        confidence,
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        recipeId: pricing.recipeId,
        errorOrException,
      });
      return null;
    }
  }

  /**
   * Compare market price vs crafting cost for an item
   */
  async compareMarketVsCrafting(
    itemId: number,
    connectedRealmId: number,
  ): Promise<PriceComparison | null> {
    const logTag = 'compareMarketVsCrafting';

    try {
      const marketPrice = await this.getMarketPrice(itemId, connectedRealmId);

      if (!marketPrice) {
        this.logger.warn({
          logTag,
          itemId,
          message: 'No market price available',
        });
        return null;
      }

      // Get all crafting methods
      const craftingMethods = await this.gatherCraftingMethods(
        itemId,
        connectedRealmId,
      );

      if (craftingMethods.length === 0) {
        return null;
      }

      // Find the cheapest crafting method
      const cheapestMethod = craftingMethods.reduce((min, method) =>
        method.calculatedValue < min.calculatedValue ? method : min,
      );

      const craftingCost = cheapestMethod.calculatedValue;
      const profit = marketPrice - craftingCost;
      const profitMargin = (profit / craftingCost) * 100;

      return {
        itemId,
        connectedRealmId,
        marketPrice,
        craftingCost,
        profit,
        profitMargin,
        isProfitable: profit > 0,
        bestRecipe: cheapestMethod.pricing
          ? {
              recipeId: cheapestMethod.pricing.recipeId,
              cost: craftingCost,
              rank: cheapestMethod.pricing.rank,
            }
          : undefined,
      };
    } catch (errorOrException) {
      this.logger.error({ logTag, itemId, errorOrException });
      return null;
    }
  }

  /**
   * Get market price for an item on a specific realm
   */
  private async getMarketPrice(
    itemId: number,
    connectedRealmId: number,
  ): Promise<number | undefined> {
    try {
      // Try valuation entity first (aggregated data)
      const valuation = await this.valuationRepository.findOne({
        where: { itemId, connectedRealmId },
        order: { timestamp: 'DESC' },
      });

      if (valuation?.market) {
        return valuation.market;
      }

      // Fallback to market entity (raw data)
      const markets = await this.marketRepository.find({
        where: { itemId, connectedRealmId },
        order: { timestamp: 'DESC' },
        take: 100,
      });

      if (markets.length > 0) {
        return this.calculateWeightedAverage(markets);
      }

      return undefined;
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getMarketPrice',
        itemId,
        connectedRealmId,
        errorOrException,
      });
      return undefined;
    }
  }

  /**
   * Get market volume for an item
   */
  private async getMarketVolume(
    itemId: number,
    connectedRealmId: number,
  ): Promise<number | undefined> {
    try {
      const markets = await this.marketRepository.find({
        where: { itemId, connectedRealmId },
        order: { timestamp: 'DESC' },
        take: 100,
      });

      if (markets.length > 0) {
        return markets.reduce((sum, m) => sum + (m.quantity || 0), 0);
      }

      return undefined;
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getMarketVolume',
        itemId,
        connectedRealmId,
        errorOrException,
      });
      return undefined;
    }
  }

  /**
   * Batch fetch market prices for multiple items
   */
  private async batchGetMarketPrices(
    itemIds: number[],
    connectedRealmId: number,
  ): Promise<Map<number, number>> {
    const logTag = 'batchGetMarketPrices';
    const priceMap = new Map<number, number>();

    try {
      if (itemIds.length === 0) {
        return priceMap;
      }

      // Try valuations first
      const valuations = await this.valuationRepository.find({
        where: {
          itemId: In(itemIds),
          connectedRealmId,
        },
        order: { timestamp: 'DESC' },
      });

      // Group by itemId and take most recent
      const valuationMap = new Map<number, ValuationEntity>();
      for (const val of valuations) {
        if (
          !valuationMap.has(val.itemId) ||
          val.timestamp > valuationMap.get(val.itemId)!.timestamp
        ) {
          valuationMap.set(val.itemId, val);
        }
      }

      // Add prices from valuations
      for (const [itemId, val] of valuationMap.entries()) {
        if (val.market) {
          priceMap.set(itemId, val.market);
        }
      }

      // For items without valuations, query market entity
      const missingItemIds = itemIds.filter((id) => !priceMap.has(id));

      if (missingItemIds.length > 0) {
        const markets = await this.marketRepository.find({
          where: {
            itemId: In(missingItemIds),
            connectedRealmId,
          },
          order: { timestamp: 'DESC' },
          take: 1000,
        });

        // Group by itemId
        const marketsByItem = new Map<number, MarketEntity[]>();
        for (const market of markets) {
          if (!marketsByItem.has(market.itemId)) {
            marketsByItem.set(market.itemId, []);
          }
          marketsByItem.get(market.itemId)!.push(market);
        }

        // Calculate weighted average for each item
        for (const [itemId, itemMarkets] of marketsByItem.entries()) {
          const avgPrice = this.calculateWeightedAverage(itemMarkets);
          if (avgPrice) {
            priceMap.set(itemId, avgPrice);
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }

    return priceMap;
  }

  /**
   * Calculate weighted average price from market data
   */
  private calculateWeightedAverage(markets: MarketEntity[]): number {
    if (markets.length === 0) return 0;

    let totalValue = 0;
    let totalQuantity = 0;

    for (const market of markets) {
      const quantity = market.quantity || 1;
      totalValue += market.price * quantity;
      totalQuantity += quantity;
    }

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  /**
   * Rank pricing methods by confidence and value
   */
  private rankPricingMethods(methods: PricingMethod[]): PricingMethod[] {
    return methods.sort((a, b) => {
      // Sort by confidence first, then by value
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return a.calculatedValue - b.calculatedValue;
    });
  }

  /**
   * Find best method for buying (lowest cost)
   */
  private findBestForBuying(
    methods: PricingMethod[],
  ): PricingMethod | undefined {
    if (methods.length === 0) return undefined;

    return methods.reduce((min, method) =>
      method.calculatedValue < min.calculatedValue ? method : min,
    );
  }

  /**
   * Find best method for selling (highest value)
   */
  private findBestForSelling(
    methods: PricingMethod[],
  ): PricingMethod | undefined {
    if (methods.length === 0) return undefined;

    return methods.reduce((max, method) =>
      method.calculatedValue > max.calculatedValue ? method : max,
    );
  }

  /**
   * Find best method for crafting (best profit margin)
   */
  private findBestForCrafting(
    methods: PricingMethod[],
  ): PricingMethod | undefined {
    const craftingMethods = methods.filter((m) => m.source === 'crafting');
    if (craftingMethods.length === 0) return undefined;

    return craftingMethods.reduce((min, method) =>
      method.calculatedValue < min.calculatedValue ? method : min,
    );
  }

  /**
   * Generate recommendations based on pricing methods
   */
  private generateRecommendations(
    methods: PricingMethod[],
    marketPrice?: number,
    vendorSellPrice?: number,
  ): string[] {
    const recommendations: string[] = [];

    if (methods.length === 0) {
      recommendations.push('No pricing data available');
      return recommendations;
    }

    const craftingMethods = methods.filter((m) => m.source === 'crafting');
    const reverseMethods = methods.filter((m) => m.source === 'reverse');

    // Check if crafting is profitable
    if (craftingMethods.length > 0 && marketPrice) {
      const cheapestCrafting = craftingMethods.reduce((min, m) =>
        m.calculatedValue < min.calculatedValue ? m : min,
      );

      const profit = marketPrice - cheapestCrafting.calculatedValue;
      if (profit > 0) {
        const margin = ((profit / cheapestCrafting.calculatedValue) * 100).toFixed(1);
        recommendations.push(
          `Crafting is profitable: ${profit.toFixed(0)}g profit (${margin}% margin)`,
        );
      } else {
        recommendations.push('Crafting is not profitable - buy from AH instead');
      }
    }

    // Check reverse pricing value
    if (reverseMethods.length > 0 && marketPrice) {
      for (const method of reverseMethods) {
        if (method.calculatedValue > marketPrice) {
          const profit = method.calculatedValue - marketPrice;
          recommendations.push(
            `${method.metadata?.profession || 'Processing'} is profitable: ${profit.toFixed(0)}g per item`,
          );
        }
      }
    }

    // Vendor sell price comparison
    if (vendorSellPrice && marketPrice) {
      if (marketPrice < vendorSellPrice * 0.8) {
        recommendations.push(
          'Market price is below 80% of vendor value - consider buying and vendoring',
        );
      }
    }

    return recommendations;
  }
}

