export enum AnalyticsMetricCategory {
  CHARACTERS = 'characters',
  GUILDS = 'guilds',
  MARKET = 'market',
  CONTRACTS = 'contracts',
  HALL_OF_FAME = 'hallOfFame',
}

export enum AnalyticsMetricType {
  TOTAL = 'total',
  BY_FACTION = 'byFaction',
  BY_CLASS = 'byClass',
  BY_RACE = 'byRace',
  BY_LEVEL = 'byLevel',
  BY_CLASS_MAX_LEVEL = 'byClassMaxLevel',
  BY_FACTION_MAX_LEVEL = 'byFactionMaxLevel',
  BY_RACE_MAX_LEVEL = 'byRaceMaxLevel',
  BY_LEVEL_MAX_LEVEL = 'byLevelMaxLevel',
  EXTREMES = 'extremes',
  AVERAGES = 'averages',
  UNIQUE_PLAYERS = 'uniquePlayers',
  BY_CONNECTED_REALM = 'byConnectedRealm',
  MEMBERS_DISTRIBUTION = 'membersDistribution',
  ACHIEVEMENTS_DISTRIBUTION = 'achievementsDistribution',
  AGE_DISTRIBUTION = 'ageDistribution',
  TOP_BY_AGE = 'topByAge',
  TOP_BY_ACHIEVEMENTS = 'topByAchievements',
  PRICE_RANGES = 'priceRanges',
  TOP_BY_VOLUME = 'topByVolume',
  TOP_BY_AUCTIONS = 'topByAuctions',
  BY_COMMODITIES = 'byCommodities',
  TOP_BY_QUANTITY = 'topByQuantity',
  TOP_BY_OPEN_INTEREST = 'topByOpenInterest',
  PRICE_VOLATILITY = 'priceVolatility',
  BY_RAID = 'byRaid',
}

export const ARRAY_METRIC_TYPES = [
  AnalyticsMetricType.TOP_BY_ACHIEVEMENTS,
  AnalyticsMetricType.TOP_BY_VOLUME,
  AnalyticsMetricType.TOP_BY_AUCTIONS,
  AnalyticsMetricType.TOP_BY_QUANTITY,
  AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
  AnalyticsMetricType.PRICE_VOLATILITY,
] as const;

export const RETIRED_METRIC_TYPES = ['sizeDistribution', 'topByMembers'] as const;
