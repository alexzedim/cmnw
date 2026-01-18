import { IDmaConfig } from '@app/configuration/interfaces';

export const dmaConfig: IDmaConfig = {
  isIndexAuctions: process.env.DMA_INDEX_AUCTIONS === 'true',
  isIndexCommodity: process.env.DMA_INDEX_COMMODITY === 'true',

  isItemsIndex: process.env.DMA_INDEX_ITEMS === 'true',
  isItemsForceUpdate: process.env.DMA_INDEX_ITEMS_FORCE_UPDATE === 'true',
  isItemsBuild: process.env.DMA_INDEX_ITEMS_BUILD === 'true',

  // Pricing Service - Main Controls
  isItemsPricingInit: process.env.DMA_INDEX_ITEMS_PRICING === 'true',
  isItemsPricingBuild: process.env.DMA_INDEX_ITEMS_PRICING_BUILD === 'true',
  isItemsPricingLab: process.env.DMA_INDEX_ITEMS_PRICING_LAB === 'true',

  // Pricing Service - Granular Controls
  isPricingIndexProfessions: process.env.DMA_PRICING_INDEX_PROFESSIONS === 'true',
  isPricingBuildSkillLine: process.env.DMA_PRICING_BUILD_SKILL_LINE === 'true',
  isPricingBuildSpellEffect: process.env.DMA_PRICING_BUILD_SPELL_EFFECT === 'true',
  isPricingBuildSpellReagents:
    process.env.DMA_PRICING_BUILD_SPELL_REAGENTS === 'true',

  // Pricing Service - Lab Methods
  isPricingLabProspecting: process.env.DMA_PRICING_LAB_PROSPECTING === 'true',
  isPricingLabMilling: process.env.DMA_PRICING_LAB_MILLING === 'true',
  isPricingLabDisenchanting: process.env.DMA_PRICING_LAB_DISENCHANTING === 'true',

  // Valuations Service - Main Control
  isValuationsBuild: process.env.DMA_VALUATIONS_BUILD === 'true',

  // Valuations Service - Stage Controls
  isValuationsFromPricing: process.env.DMA_VALUATIONS_FROM_PRICING === 'true',
  isValuationsFromAuctions: process.env.DMA_VALUATIONS_FROM_AUCTIONS === 'true',
  isValuationsForPremium: process.env.DMA_VALUATIONS_FOR_PREMIUM === 'true',
  isValuationsForCurrency: process.env.DMA_VALUATIONS_FOR_CURRENCY === 'true',
  isValuationsBuildTags: process.env.DMA_VALUATIONS_BUILD_TAGS === 'true',

  // Valuations Service - Auction Sub-stages
  isValuationsMarketAssetClass:
    process.env.DMA_VALUATIONS_MARKET_ASSET_CLASS === 'true',
  isValuationsCommodityAssetClass:
    process.env.DMA_VALUATIONS_COMMODITY_ASSET_CLASS === 'true',
  isValuationsItemAssetClass: process.env.DMA_VALUATIONS_ITEM_ASSET_CLASS === 'true',
};
