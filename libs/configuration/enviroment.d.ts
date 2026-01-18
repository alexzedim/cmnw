declare namespace NodeJS {
  interface ProcessEnv {
    // Common
    NODE_ENV?: string;

    // CMNW config (libs/configuration/src/cmnw.config.ts)
    CMNW_PORT?: string;
    BATTLENET_CLIENT_ID?: string;
    BATTLENET_CLIENT_SECRET?: string;
    BATTLENET_CALLBACK_URL?: string;

    // Core config (libs/configuration/src/core.config.ts)
    KEYS_USE_PROXY?: string;

    // DMA config (libs/configuration/src/dma.config.ts)
    DMA_INDEX_AUCTIONS?: string;
    DMA_INDEX_COMMODITY?: string;
    DMA_INDEX_ITEMS?: string;
    DMA_INDEX_ITEMS_FORCE_UPDATE?: string;
    DMA_INDEX_ITEMS_BUILD?: string;
    DMA_INDEX_ITEMS_PRICING?: string;
    DMA_INDEX_ITEMS_PRICING_BUILD?: string;
    DMA_INDEX_ITEMS_PRICING_LAB?: string;
    DMA_PRICING_INDEX_PROFESSIONS?: string;
    DMA_PRICING_BUILD_SKILL_LINE?: string;
    DMA_PRICING_BUILD_SPELL_EFFECT?: string;
    DMA_PRICING_BUILD_SPELL_REAGENTS?: string;
    DMA_PRICING_LAB_PROSPECTING?: string;
    DMA_PRICING_LAB_MILLING?: string;
    DMA_PRICING_LAB_DISENCHANTING?: string;
    DMA_VALUATIONS_BUILD?: string;
    DMA_VALUATIONS_FROM_PRICING?: string;
    DMA_VALUATIONS_FROM_AUCTIONS?: string;
    DMA_VALUATIONS_FOR_PREMIUM?: string;
    DMA_VALUATIONS_FOR_CURRENCY?: string;
    DMA_VALUATIONS_BUILD_TAGS?: string;
    DMA_VALUATIONS_MARKET_ASSET_CLASS?: string;
    DMA_VALUATIONS_COMMODITY_ASSET_CLASS?: string;
    DMA_VALUATIONS_ITEM_ASSET_CLASS?: string;

    // Loki config (libs/configuration/src/loki.config.ts)
    LOKI_URL?: string;

    // OSINT config (libs/configuration/src/osint.config.ts)
    OSINT_INDEX_CHARACTERS_FROM_FILE?: string;
    OSINT_INDEX_GUILDS_FROM_CHARACTERS?: string;
    OSINT_WCL_FROM_PAGE?: string;
    OSINT_WCL_TO_PAGE?: string;
    OSINT_WCL_LOGS?: string;
    OSINT_WCL_CURRENT_RAID_TIER?: string;

    // Postgres config (libs/configuration/src/postgres.config.ts)
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_DB?: string;
    POSTGRES_SSL?: string;
    POSTGRES_SSL_CA?: string;
    PG_SSL_KEY?: string;
    POSTGRES_SSL_KEY?: string;
    PG_SSL_CERT?: string;
    POSTGRES_SSL_CERT?: string;

    // RabbitMQ config (libs/configuration/src/rabbitmq.config.ts)
    RABBITMQ_URI?: string;
    RABBITMQ_USER?: string;
    RABBITMQ_PASSWORD?: string;
    RABBITMQ_HOST?: string;
    RABBITMQ_PORT?: string;
    RABBITMQ_VHOST?: string;
    RABBITMQ_PREFETCH?: string;

    // Redis/Bull config (libs/configuration/src/redis.config.ts, bull.config.ts)
    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_PASSWORD?: string;
    BULL_PORT?: string;

    // S3 config (libs/configuration/src/s3.config.ts)
    S3_ACCESS_KEY_ID?: string;
    S3_SECRET_ACCESS_KEY?: string;
    S3_REGION?: string;
    S3_HOST?: string;

    // Valuations config (libs/configuration/src/valuations.config.ts)
    VALUATIONS_BUILD?: string;

    // Worker config (libs/configuration/src/worker.config.ts)
    WORKER_ID?: string;
    HOSTNAME?: string;
  }
}
