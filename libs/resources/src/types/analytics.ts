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
  realm_id: number;
  total: string;
  in_guilds: string;
}

export interface CharacterRealmFactionAggregation {
  realm_id: number;
  faction: string;
  count: string;
}

export interface CharacterRealmClassAggregation {
  realm_id: number;
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
  avg_achievement: string;
  avg_mounts: string;
  avg_pets: string;
  avg_item_level: string;
}

export interface GuildTotalMetrics {
  sum: string;
}

export interface GuildCountAggregation {
  faction: string;
  count: string;
}

export interface GuildRealmAggregation {
  realm_id: number;
  count: string;
  total_members: string;
}

export interface GuildRealmFactionAggregation {
  realm_id: number;
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
  connected_realm_id: number;
  auctions: string;
  volume: string;
  unique_items: string;
  avg_price: string;
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
  item_id: number;
  volume: string;
  auctions: string;
}

export interface MarketTopByAuctions {
  item_id: number;
  auctions: string;
}

export interface ContractTotalMetrics {
  total_quantity: string;
  total_open_interest: string;
  unique_items: string;
}

export interface ContractCommoditiesData {
  count: string;
  total_quantity: string;
  total_open_interest: string;
}

export interface ContractByConnectedRealm {
  connected_realm_id: number;
  count: string;
  total_quantity: string;
  total_open_interest: string;
}

export interface ContractTopByQuantity {
  item_id: number;
  quantity: string;
  open_interest: string;
}

export interface ContractTopByOpenInterest {
  item_id: number;
  open_interest: string;
  quantity: string;
}

export interface ContractPriceVolatility {
  item_id: number;
  std_dev: string;
  avg_price: string;
}
