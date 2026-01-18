export enum APP_LABELS {
  A = 'analytics',
  C = 'core',
  CH = 'characters',
  CMNW = 'cmnw',
  D = 'dma',
  G = 'guilds',
  I = 'items',
  L = 'ladder',
  M = 'market',
  O = 'osint',
  T = 'test',
  V = 'valuations',
  WCL = 'warcraft-logs',
  W = 'wow-progress',
}

export enum KEY_LOCK {
  AUCTION = 'auction',
  DMA = 'dma',
  MARKET = 'market',
  WARCRAFT_LOGS = 'warcraft-logs',
  WOW_PROGRESS = 'wow-progress',
}

export enum TIME_MS {
  /** Immediate/next-tick update */
  IMMEDIATE = 1,
  /** 1 minute in milliseconds */
  ONE_MINUTE = 60000,
  /** 5 minutes in milliseconds */
  FIVE_MINUTES = 300000,
  /** 10 minutes in milliseconds */
  TEN_MINUTES = 600000,
  /** 30 minutes in milliseconds */
  THIRTY_MINUTES = 1800000,
  /** 1 hour in milliseconds */
  ONE_HOUR = 3600000,
  /** 2 hours in milliseconds */
  TWO_HOURS = 7200000,
  /** 4 hours in milliseconds */
  FOUR_HOURS = 14400000,
  /** 12 hours in milliseconds */
  TWELVE_HOURS = 43200000,
  /** 24 hours in milliseconds */
  TWENTY_FOUR_HOURS = 86400000,
  /** 1 week in milliseconds */
  ONE_WEEK = 604800000,
}
