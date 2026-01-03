import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  IBuildYAxis,
  IChartOrder,
  IQItemValuation,
  ItemChartDto,
  ItemFeedDto,
  ItemQuotesDto,
  ItemQuotesResponseDto,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  ReqGetItemDto,
  valuationsQueue,
  WOW_TOKEN_ITEM_ID,
  WowTokenDto,
} from '@app/resources';
import { ItemRealmDto } from '@app/resources';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { from, lastValueFrom, mergeMap, reduce } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';
import { Repository } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class DmaService {
  private readonly logger = new Logger(DmaService.name, { timestamp: true });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly _keysRepository: Repository<KeysEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
    @InjectQueue(valuationsQueue.name)
    private readonly _queueValuations: Queue<IQItemValuation, number>,
  ) {}

  // TODO validation on DTO level
  async getItem(input: ReqGetItemDto) {
    const isNotNumber = isNaN(Number(input.id));
    if (isNotNumber) {
      throw new BadRequestException(
        'Please provide correct item ID in your query',
      );
    }

    const id = typeof input.id === 'number' ? input.id : parseInt(input.id);

    const item = await this.itemsRepository.findOneBy({ id });

    if (!item) {
      throw new BadRequestException(`Item with ID ${id} not found`);
    }

    // Check if item is a commodity (cross-realm)
    const assetClass = item.assetClass || [];
    const isCommdty = assetClass.includes('commdty');

    // For commodities, return empty realm array since they're cross-realm
    // For regular items, would need realm data (not implemented yet)
    const realm = isCommdty ? [] : [];

    return {
      item,
      realm,
    };
  }

  async getItemValuations(_input: ItemRealmDto): Promise<any> {
    // TODO: Implement item valuations logic
    throw new BadRequestException('Item valuations not yet implemented');
  }

  /**
   * @description Auctions DMA store in Redis Latest TimeStamp
   * @description We receive available timestamps for COMMODITY items
   */
  async getLatestTimestampCommodity(itemId: number) {
    const commodityTimestampKeys =
      await this.redisService.keys('COMMODITY:TS:*');

    const commodityTimestamp = await this.redisService.mget(
      commodityTimestampKeys,
    );

    // TODO in case of Redis not found!

    const timestamps = commodityTimestamp
      .map((t) => Number(t))
      .sort((a, b) => a - b);

    const latestCommodityTimestamp = timestamps.slice(-1);

    const key = `COMMODITY:CHART:${itemId}:${latestCommodityTimestamp}`;

    return { latestCommodityTimestamp, timestamps, key };
  }

  async getChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const item = await this.queryItem(String(input.id));

    const { timestamps, key } = await this.getLatestTimestampCommodity(item.id);

    // --- return cached chart from redis on exist -- //
    /*    const getCacheItemChart = await this.redisService.get(key);
    if (getCacheItemChart) {
      console.log('from cache');
      return JSON.parse(getCacheItemChart) as ItemChartDto;
    }*/

    const yPriceAxis = await this.priceAxisCommodity({
      itemId: item.id,
    });

    const { dataset } = await this.buildChartDataset(
      yPriceAxis,
      timestamps,
      item.id,
    );

    const chart = JSON.stringify({
      yAxis: yPriceAxis,
      xAxis: timestamps,
      dataset,
    });

    await this.redisService.set(key, chart, 'EX', 3600);

    return { yAxis: yPriceAxis, xAxis: timestamps, dataset };
  }

  async getGoldChart(_input: ReqGetItemDto): Promise<ItemChartDto> {
    // For gold charts, we use itemId = 1 (gold currency)
    const goldItemId = 1;

    // Get latest timestamps for gold market data
    const timestamps = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.timestamp')
      .where('market.itemId = :itemId', { itemId: goldItemId })
      .orderBy('market.timestamp', 'DESC')
      .limit(50)
      .getRawMany();

    const timestampValues = timestamps.map((t) => t.timestamp);

    const yPriceAxis = await this.priceAxisCommodity({
      itemId: goldItemId,
    });

    const { dataset } = await this.buildChartDataset(
      yPriceAxis,
      timestampValues,
      goldItemId,
    );

    return { yAxis: yPriceAxis, xAxis: timestampValues, dataset };
  }

  /**
   * Unified method to get chart data for both commodity and gold items
   * Transforms the raw chart data to match frontend expectations
   */
  async getItemChart(input: ReqGetItemDto) {
    const item = await this.queryItem(String(input.id));

    // Check if item is gold
    const isGold = item.id === 1;
    // Get raw chart data
    let chartData: ItemChartDto;
    if (isGold) {
      chartData = await this.getGoldChart(input);
    } else {
      chartData = await this.getChart(input);
    }

    // Transform yAxis from numbers to formatted strings
    const formattedYAxis = chartData.yAxis.map((price) =>
      typeof price === 'number' ? price.toFixed(2) : String(price),
    );

    // Transform dataset to match frontend HeatmapDataPoint interface
    const transformedDataset = chartData.dataset.map((point) => ({
      x: point.x,
      y: point.y,
      value: point.value,
      price: point.price,
      orders: point.orders,
      oi: point.oi,
    }));

    return {
      yAxis: formattedYAxis,
      xAxis: chartData.xAxis,
      dataset: transformedDataset,
    };
  }

  /**
   * Calculate price range based on quantity distribution using percentile filtering
   * Filters out price tails with minimal liquidity to create representative bins
   * @param prices sorted array of unique prices
   * @param marketData market orders with price and quantity
   * @param lowerPercentile lower quantile threshold (default 0.05 = 5%)
   * @param upperPercentile upper quantile threshold (default 0.95 = 95%)
   * @returns { floor, cap } representing the quantity-filtered price range
   */
  private calculateQuantileFilteredRange(
    prices: number[],
    marketData: { price: number; quantity?: number }[],
    lowerPercentile: number = 0.05,
    upperPercentile: number = 0.85,
  ): { floor: number; cap: number } {
    // Aggregate quantity by price
    const quantityByPrice = new Map<number, number>();
    for (const order of marketData) {
      const currentQty = quantityByPrice.get(order.price) ?? 0;
      quantityByPrice.set(order.price, currentQty + (order.quantity ?? 1));
    }

    // Calculate total quantity
    const totalQuantity = Array.from(quantityByPrice.values()).reduce(
      (sum, qty) => sum + qty,
      0,
    );

    if (totalQuantity === 0) {
      // Fallback to price-based filtering if no quantity data
      return {
        floor: prices[0],
        cap: prices[Math.floor(prices.length * 0.9)],
      };
    }

    // Build cumulative quantity distribution
    let cumulativeQty = 0;
    let lowerBoundPrice = prices[0];
    let upperBoundPrice = prices[prices.length - 1];

    for (const price of prices) {
      const qtyAtPrice = quantityByPrice.get(price) ?? 0;
      cumulativeQty += qtyAtPrice;
      const percentile = cumulativeQty / totalQuantity;

      // Set lower bound at lower percentile threshold
      if (percentile >= lowerPercentile && lowerBoundPrice === prices[0]) {
        lowerBoundPrice = price;
      }

      // Set upper bound at upper percentile threshold
      if (percentile >= upperPercentile) {
        upperBoundPrice = price;
        break; // Found our upper bound
      }
    }

    return {
      floor: lowerBoundPrice,
      cap: upperBoundPrice,
    };
  }

  /**
   * Build decimal bins for accurate price assignment
   * Uses quantity-weighted distribution to create representative bins
   * Filters out price tails with minimal liquidity (default 5%-95% percentile)
   */
  private async buildDecimalPriceBins(
    itemId: number,
    blocks: number,
  ): Promise<number[]> {
    const now = Date.now();

    // Fetch price and quantity data (not just distinct prices)
    const marketData = await this.marketRepository.find({
      where: {
        itemId,
      },
      select: ['price', 'quantity'],
    });

    if (!marketData.length) return [];

    // Get unique sorted prices
    const uniquePrices = Array.from(
      new Set(marketData.map((m) => m.price)),
    ).sort((a, b) => a - b);

    if (uniquePrices.length === 0) return [];

    // Calculate quantity-filtered range
    const { floor, cap } = this.calculateQuantileFilteredRange(
      uniquePrices,
      marketData,
      0.05, // lower percentile (5%)
      0.9, // upper percentile (85%)
    );

    const priceRange = cap - floor;
    // --- Step represents equal division for each cluster --- //
    const tick = priceRange / blocks;

    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  /**
   * Rebuild decimal bins for use in processTimestampData
   * Used internally for accurate price binning
   */
  private async rebuildDecimalBins(itemId: number): Promise<number[]> {
    return this.buildDecimalPriceBins(itemId, 20);
  }

  /**
   * Detect the appropriate price rounding increment based on price intervals
   * Finds the best-fit increment that is a multiple of 5
   * Examples: 0.05, 0.5, 5, 50, 500, etc.
   */
  private detectPriceRoundingIncrement(prices: number[]): number {
    if (prices.length < 2) return 0.05; // default to smallest increment

    // Calculate intervals between consecutive prices
    const intervals: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const interval = prices[i] - prices[i - 1];
      if (interval > 0) {
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) return 0.05;

    // Calculate median interval to handle outliers
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const medianInterval =
      sortedIntervals[Math.floor(sortedIntervals.length / 2)];

    // Find appropriate power of 10 scale based on interval magnitude
    const magnitude = Math.floor(Math.log10(medianInterval));
    const scale = Math.pow(10, magnitude);

    // Try multiples of 5 at different scales: 0.5x, 5x of the base scale
    // E.g., if scale=1: try 0.5, 5; if scale=0.1: try 0.05, 0.5; if scale=10: try 5, 50
    const candidateIncrements = [scale * 0.5, scale * 5];

    // Find the first increment where median fits within 1-4 increments
    for (const increment of candidateIncrements) {
      if (
        medianInterval >= increment * 0.8 &&
        medianInterval <= increment * 4
      ) {
        return increment;
      }
    }

    // Fallback: use 5x of scale
    return scale * 5;
  }

  /**
   * Round a price to the nearest increment (0.05, 0.25, 0.5, or 5)
   */
  private roundToIncrement(price: number, increment: number): number {
    return Math.round(price / increment) * increment;
  }

  private async getPriceRangeByItem(itemId: number, blocks: number) {
    const decimalBins = await this.buildDecimalPriceBins(itemId, blocks);

    // Detect appropriate rounding increment based on price intervals
    const roundingIncrement = this.detectPriceRoundingIncrement(decimalBins);

    // Round the bins using the detected increment
    return decimalBins.map((price) =>
      parseFloat(this.roundToIncrement(price, roundingIncrement).toFixed(2)),
    );
  }

  async priceAxisCommodity(args: IBuildYAxis): Promise<number[]> {
    const { itemId } = args;

    const blocks = 20;

    return this.getPriceRangeByItem(itemId, blocks);
  }

  /**
   * Helper method to find the correct bucket index for a given price
   * Uses decimal bins for accurate price assignment
   */
  private findPriceBucketIndex(price: number, decimalBins: number[]): number {
    // For each price, find the bucket where: bucketFloor <= price < bucketCeiling
    for (let i = 0; i < decimalBins.length; i++) {
      const bucketFloor = decimalBins[i];
      const bucketCeiling = decimalBins[i + 1] ?? Infinity;

      // Price belongs to this bucket if it's >= floor and < ceiling
      if (price >= bucketFloor && price < bucketCeiling) {
        return i;
      }
    }

    // Fallback: if price is above all buckets, return last index
    return decimalBins.length - 1;
  }

  /**
   * Processes market orders for a single timestamp and creates price level dataset
   */
  private async processTimestampData(
    timestamp: number,
    itx: number,
    yPriceAxis: number[],
    decimalBins: number[],
    itemId: number,
  ): Promise<IChartOrder[]> {
    try {
      // TODO cover find with index
      const marketOrders = await this.marketRepository.find({
        where: {
          itemId,
          timestamp,
        },
        order: { price: 'ASC' },
      });

      // Create price level dataset for this timestamp
      const priceLevelDataset = yPriceAxis.map((priceLevel, ytx) => ({
        lt: yPriceAxis[ytx + 1] ?? priceLevel,
        x: itx,
        y: ytx,
        orders: 0,
        oi: 0,
        price: 0,
        value: 0,
      }));

      // Process market orders for this timestamp
      // Find the correct bucket for each order based on its actual price using decimal bins
      for (const order of marketOrders) {
        const bucketIndex = this.findPriceBucketIndex(order.price, decimalBins);

        priceLevelDataset[bucketIndex].orders =
          priceLevelDataset[bucketIndex].orders + 1;
        priceLevelDataset[bucketIndex].oi =
          priceLevelDataset[bucketIndex].oi + (order.value ?? 0);
        priceLevelDataset[bucketIndex].value =
          priceLevelDataset[bucketIndex].value + (order.quantity ?? 0);
        priceLevelDataset[bucketIndex].price =
          priceLevelDataset[bucketIndex].value > 0
            ? priceLevelDataset[bucketIndex].oi /
              priceLevelDataset[bucketIndex].value
            : 0;
      }

      return priceLevelDataset;
    } catch (errorOrException) {
      // Log error and return empty dataset for this timestamp
      const logTag = 'processTimestampData';
      this.logger.error({
        logTag,
        timestamp,
        itemId,
        errorOrException,
        message: `Error processing timestamp ${timestamp} for item ${itemId}`,
      });
      return yPriceAxis.map((priceLevel, ytx) => ({
        lt: yPriceAxis[ytx + 1] ?? priceLevel,
        x: itx,
        y: ytx,
        orders: 0,
        oi: 0,
        price: 0,
        value: 0,
      }));
    }
  }

  async buildChartDataset(
    yPriceAxis: number[],
    xTimestampAxis: number[],
    itemId: number,
  ) {
    if (!yPriceAxis.length) return { dataset: [] };

    try {
      // yPriceAxis contains rounded values for display
      // We need decimal precision for binning, so reconstruct them
      const decimalBins = await this.rebuildDecimalBins(itemId);

      // Process each timestamp and return the aggregated results
      const dataset = await lastValueFrom(
        from(xTimestampAxis).pipe(
          mergeMap(async (timestamp, itx) => {
            return await this.processTimestampData(
              timestamp,
              itx,
              yPriceAxis,
              decimalBins,
              itemId,
            );
          }),
          // Collect all arrays and flatten them
          reduce(
            (acc: IChartOrder[], curr: IChartOrder[]) => [...acc, ...curr],
            [] as IChartOrder[],
          ),
        ),
      );

      return { dataset };
    } catch (errorOrException) {
      const logTag = 'buildChartDataset';
      this.logger.error({
        logTag,
        itemId,
        errorOrException,
        message: `Error building chart dataset for item ${itemId}`,
      });
      // Return empty dataset on error
      return { dataset: [] };
    }
  }

  async getItemFeed(input: ItemRealmDto): Promise<ItemFeedDto> {
    const item = await this.queryItem(input.id);

    // Parse realm from id format: "itemId@realmSlug"
    const [_itemIdStr, realmSlug] = input.id.split('@');

    if (!realmSlug) {
      throw new BadRequestException(
        'Realm information required for item feed. Use format: itemId@realmSlug',
      );
    }

    // Find recent market data for this item
    const feed = await this.marketRepository.find({
      where: { itemId: item.id },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to recent 50 entries
    });

    return { feed };
  }

  async getItemQuotes(input: ItemRealmDto): Promise<ItemQuotesDto> {
    const item = await this.queryItem(input.id);

    // Get aggregated market data for quotes
    const rawQuotes = await this.marketRepository
      .createQueryBuilder('market')
      .select([
        'market.price as price',
        'COUNT(*) as size',
        'SUM(market.quantity) as quantity',
        'SUM(market.value) as open_interest',
      ])
      .where('market.itemId = :itemId', { itemId: item.id })
      .groupBy('market.price')
      .orderBy('market.price', 'ASC')
      .limit(100)
      .getRawMany();

    const quotes = ItemQuotesResponseDto.remapQuotes(rawQuotes);

    return { quotes };
  }

  async queryItem(input: string): Promise<ItemsEntity> {
    const trimmedQuery = input.trim();

    if (!trimmedQuery) {
      throw new BadRequestException('Item query cannot be empty');
    }

    // Parse as numeric ID only
    const itemId = parseInt(trimmedQuery, 10);

    if (isNaN(itemId)) {
      throw new BadRequestException('Please provide a valid numeric item ID');
    }

    return await this.findItemById(itemId);
  }

  /**
   * Find item by numeric ID
   */
  private async findItemById(id: number): Promise<ItemsEntity> {
    const item = await this.itemsRepository.findOneBy({ id });

    if (!item) {
      throw new BadRequestException(`Item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Find item by name using PostgreSQL full-text search
   * Searches both 'name' field and JSONB 'names' field
   */
  private async findItemByName(searchQuery: string): Promise<ItemsEntity> {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      throw new BadRequestException(
        'Search query must be at least 2 characters long',
      );
    }

    try {
      // Create query builder for complex search
      const queryBuilder = this.itemsRepository.createQueryBuilder('item');

      // Search in multiple fields with different strategies
      const item = await queryBuilder
        .where(
          `(
            -- Exact match on name field
            LOWER(item.name) = :exactQuery
            OR
            -- Partial match on name field
            LOWER(item.name) LIKE :likeQuery
            OR
            -- Full-text search on name field
            to_tsvector('english', COALESCE(item.name, '')) @@ plainto_tsquery('english', :searchQuery)
            OR
            -- Search in JSONB names field (all locales)
            (
              item.names IS NOT NULL AND (
                LOWER(item.names->>'en_US') LIKE :likeQuery OR
                LOWER(item.names->>'en_GB') LIKE :likeQuery OR
                LOWER(item.names->>'de_DE') LIKE :likeQuery OR
                LOWER(item.names->>'fr_FR') LIKE :likeQuery OR
                LOWER(item.names->>'es_ES') LIKE :likeQuery OR
                LOWER(item.names->>'es_MX') LIKE :likeQuery OR
                LOWER(item.names->>'pt_BR') LIKE :likeQuery OR
                LOWER(item.names->>'it_IT') LIKE :likeQuery OR
                LOWER(item.names->>'ru_RU') LIKE :likeQuery OR
                LOWER(item.names->>'ko_KR') LIKE :likeQuery OR
                LOWER(item.names->>'zh_TW') LIKE :likeQuery OR
                LOWER(item.names->>'zh_CN') LIKE :likeQuery
              )
            )
            OR
            -- Full-text search in JSONB names field
            (
              item.names IS NOT NULL AND
              to_tsvector('english',
                COALESCE(item.names->>'en_US', '') || ' ' ||
                COALESCE(item.names->>'en_GB', '') || ' ' ||
                COALESCE(item.names->>'de_DE', '') || ' ' ||
                COALESCE(item.names->>'fr_FR', '')
              ) @@ plainto_tsquery('english', :searchQuery)
            )
          )`,
          {
            exactQuery: normalizedQuery,
            likeQuery: `%${normalizedQuery}%`,
            searchQuery: searchQuery,
          },
        )
        // Order by relevance: exact matches first, then partial matches
        .orderBy(
          `CASE
            WHEN LOWER(item.name) = :exactQuery THEN 1
            WHEN LOWER(item.name) LIKE :startQuery THEN 2
            WHEN LOWER(item.name) LIKE :likeQuery THEN 3
            ELSE 4
          END`,
          'ASC',
        )
        .setParameters({
          exactQuery: normalizedQuery,
          startQuery: `${normalizedQuery}%`,
          likeQuery: `%${normalizedQuery}%`,
          searchQuery: searchQuery,
        })
        .limit(1)
        .getOne();

      if (!item) {
        throw new BadRequestException(
          `No item found matching "${searchQuery}". Try using item ID or a more specific name.`,
        );
      }

      this.logger.log(
        `Found item via name search: "${searchQuery}" -> ID: ${item.id}, Name: ${item.name}`,
        'findItemByName',
      );

      return item;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error searching for item by name: "${searchQuery}"`,
        error instanceof Error ? error.stack : String(error),
        'findItemByName',
      );

      throw new BadRequestException(
        `Error searching for item "${searchQuery}". Please try a different search term or use item ID.`,
      );
    }
  }

  async getWowToken(input: WowTokenDto) {
    return this.marketRepository.find({
      where: {
        itemId: WOW_TOKEN_ITEM_ID,
        connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
        type: MARKET_TYPE.T,
      },
      order: { createdAt: 'DESC' },
      take: input.limit ? input.limit : 1,
    });
  }

  /**
   * Search for items by ID OR name field OR any localized name in JSONB names field
   * Returns a list of matching items for autocomplete
   */
  async getContracts(itemId: number, period: string) {
    // Validate item exists and has contracts
    const item = await this.itemsRepository.findOneBy({ id: itemId });

    if (!item) {
      throw new BadRequestException(`Item with ID ${itemId} not found`);
    }

    if (!item.hasContracts) {
      throw new BadRequestException(
        `Item with ID ${itemId} does not have contract data`,
      );
    }

    // Calculate time range based on period using luxon
    const now = DateTime.now();
    let startTime: DateTime;

    switch (period) {
      case '1m':
        startTime = now.minus({ months: 1 });
        break;
      case '1w':
        startTime = now.minus({ weeks: 1 });
        break;
      case '30d':
        startTime = now.minus({ days: 30 });
        break;
      case '1d':
        startTime = now.minus({ days: 1 });
        break;
      case '24h':
        startTime = now.minus({ hours: 24 });
        break;
      default:
        throw new BadRequestException(
          'Invalid period. Use: 1m, 1w, 30d, 1d, or 24h',
        );
    }

    const startTimestamp = startTime.toMillis();
    const endTimestamp = now.toMillis();

    // Query contracts for the specified period
    const contracts = await this.contractRepository.find({
      where: {
        itemId,
      },
      order: { timestamp: 'DESC' },
    });

    // Filter by timestamp range
    const filtered = contracts.filter(
      (contract) =>
        contract.timestamp >= startTimestamp &&
        contract.timestamp <= endTimestamp,
    );

    return { contracts: filtered };
  }

  async searchItems(query: string, limit: number = 25) {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 1) {
      throw new BadRequestException('Search query is required');
    }

    try {
      const queryBuilder = this.itemsRepository.createQueryBuilder('item');

      // Check if query is a numeric ID
      const isNumericId = /^\d+$/.test(query);

      const items = await queryBuilder
        .select(['item.id', 'item.name', 'item.quality'])
        .where(
          `(
            ${isNumericId ? 'item.id = :itemId' : 'FALSE'}
            OR
            LOWER(item.name) LIKE :likeQuery
            OR
            (
              item.names IS NOT NULL AND (
                LOWER(item.names->>'en_US') LIKE :likeQuery OR
                LOWER(item.names->>'en_GB') LIKE :likeQuery OR
                LOWER(item.names->>'de_DE') LIKE :likeQuery OR
                LOWER(item.names->>'es_ES') LIKE :likeQuery OR
                LOWER(item.names->>'es_MX') LIKE :likeQuery OR
                LOWER(item.names->>'fr_FR') LIKE :likeQuery OR
                LOWER(item.names->>'it_IT') LIKE :likeQuery OR
                LOWER(item.names->>'pt_BR') LIKE :likeQuery OR
                LOWER(item.names->>'ru_RU') LIKE :likeQuery OR
                LOWER(item.names->>'ko_KR') LIKE :likeQuery OR
                LOWER(item.names->>'zh_TW') LIKE :likeQuery OR
                LOWER(item.names->>'zh_CN') LIKE :likeQuery
              )
            )
          )`,
          {
            ...(isNumericId && { itemId: parseInt(query) }),
            likeQuery: `%${normalizedQuery}%`,
          },
        )
        .orderBy(
          `CASE
            ${isNumericId ? 'WHEN item.id = :itemId THEN 0' : ''}
            WHEN LOWER(item.name) = :exactQuery THEN 1
            WHEN LOWER(item.name) LIKE :startQuery THEN 2
            WHEN LOWER(item.name) LIKE :likeQuery THEN 3
            ELSE 4
          END`,
          'ASC',
        )
        .addOrderBy('item.name', 'ASC')
        .setParameters({
          ...(isNumericId && { itemId: parseInt(query) }),
          exactQuery: normalizedQuery,
          startQuery: `${normalizedQuery}%`,
          likeQuery: `%${normalizedQuery}%`,
        })
        .limit(limit)
        .getMany();

      return items.map((item) => ({
        id: item.id,
        name: item.name,
        quality: item.quality ? parseInt(item.quality, 10) : undefined,
      }));
    } catch (error) {
      this.logger.error(
        `Error searching for items: "${query}"`,
        error instanceof Error ? error.stack : String(error),
        'searchItems',
      );

      throw new BadRequestException(
        `Error searching for items. Please try a different search term.`,
      );
    }
  }
}
