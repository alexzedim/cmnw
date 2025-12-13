export interface AnalyticsMetric {
  category: string;
  metricType: string;
  realmId?: number;
  value: Record<string, any>;
  snapshotDate: Date;
}

export interface CharacterFactionAggregation {
  faction: string;
  count: string;
}

export interface CharacterClassAggregation {
  class: string;
  count: string;
}

export interface CharacterRaceAggregation {
  race: string;
  count: string;
}

export interface CharacterLevelAggregation {
  level: number;
  count: string;
}

export interface CharacterRealmAggregation {
  realmId: number;
  total: string;
  inGuilds: string;
}

export interface CharacterRealmFactionAggregation {
  realmId: number;
  faction: string;
  count: string;
}

export interface CharacterRealmClassAggregation {
  realmId: number;
  class: string;
  count: string;
}

export interface CharacterExtreme {
  guid: string;
  name: string;
  realm: string;
  value: number;
}

export interface CharacterAverages {
  avgAchievement: string;
  avgMounts: string;
  avgPets: string;
  avgItemLevel: string;
}

export interface GuildTotalMetrics {
  sum: string;
}

export interface GuildCountAggregation {
  faction: string;
  count: string;
}

export interface GuildRealmAggregation {
  realmId: number;
  count: string;
  totalMembers: string;
}

export interface GuildRealmFactionAggregation {
  realmId: number;
  faction: string;
  count: string;
}

export interface GuildSizeDistribution {
  tiny: string;
  small: string;
  medium: string;
  large: string;
  massive: string;
}

export interface GuildTopByMembers {
  guid: string;
  name: string;
  realm: string;
  value: number;
}

export interface MarketTotalMetrics {
  sum: string;
}

export interface MarketAggregateCount {
  count: string;
}

export interface MarketAggregatePrice {
  avg: string;
}

export interface MarketByConnectedRealm {
  connectedRealmId: number;
  auctions: string;
  volume: string;
  uniqueItems: string;
  avgPrice: string;
}

export interface MarketByFaction {
  faction: string;
  auctions: string;
  volume: string;
}

export interface MarketPriceRanges {
  under1k: string;
  range1k10k: string;
  range10k100k: string;
  range100k1m: string;
  over1m: string;
}

export interface MarketTopByVolume {
  itemId: number;
  volume: string;
  auctions: string;
}

export interface MarketTopByAuctions {
  itemId: number;
  auctions: string;
}

export interface ContractTotalMetrics {
  totalQuantity: string;
  totalOpenInterest: string;
  uniqueItems: string;
}

export interface ContractCommoditiesData {
  count: string;
  totalQuantity: string;
  totalOpenInterest: string;
}

export interface ContractByConnectedRealm {
  connectedRealmId: number;
  count: string;
  totalQuantity: string;
  totalOpenInterest: string;
}

export interface ContractTopByQuantity {
  itemId: number;
  quantity: string;
  openInterest: string;
}

export interface ContractTopByOpenInterest {
  itemId: number;
  openInterest: string;
  quantity: string;
}

export interface ContractPriceVolatility {
  itemId: number;
  stdDev: string;
  avgPrice: string;
}
