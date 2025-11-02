export interface IDmaConfig {
  readonly isIndexAuctions: boolean;
  readonly isIndexCommodity: boolean;

  readonly isItemsIndex: boolean;
  readonly isItemsForceUpdate: boolean;
  readonly isItemsBuild: boolean;

  // Pricing Service - Main Controls
  readonly isItemsPricingInit: boolean;
  readonly isItemsPricingBuild: boolean;
  readonly isItemsPricingLab: boolean;

  // Pricing Service - Granular Controls
  readonly isPricingIndexProfessions: boolean;
  readonly isPricingBuildSkillLine: boolean;
  readonly isPricingBuildSpellEffect: boolean;
  readonly isPricingBuildSpellReagents: boolean;

  // Pricing Service - Lab Methods
  readonly isPricingLabProspecting: boolean;
  readonly isPricingLabMilling: boolean;
  readonly isPricingLabDisenchanting: boolean;

  // Valuations Service - Main Control
  readonly isValuationsBuild: boolean;

  // Valuations Service - Stage Controls
  readonly isValuationsFromPricing: boolean;
  readonly isValuationsFromAuctions: boolean;
  readonly isValuationsForPremium: boolean;
  readonly isValuationsForCurrency: boolean;
  readonly isValuationsBuildTags: boolean;

  // Valuations Service - Auction Sub-stages
  readonly isValuationsMarketAssetClass: boolean;
  readonly isValuationsCommodityAssetClass: boolean;
  readonly isValuationsItemAssetClass: boolean;
}
