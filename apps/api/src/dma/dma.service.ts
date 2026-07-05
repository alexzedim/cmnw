import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  IBuildYAxis,
  IChartOrder,
  ItemChartDto,
  ItemFeedDto,
  ItemQuotesDto,
  ItemQuotesResponseDto,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  ReqGetItemDto,
  WOW_TOKEN_ITEM_ID,
  WowTokenDto,
} from '@app/resources';
import { ItemRealmDto } from '@app/resources';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { from, lastValueFrom, mergeMap, reduce } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { formatServiceErrorLog } from '@app/logger';
import { assignPriceBucket, buildHybridPriceBins, DEFAULT_BLOCKS } from './price-binning';

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
  ) {}

  // TODO validation on DTO level
  async getItem(input: ReqGetItemDto) {
    const isNotNumber = isNaN(Number(input.id));
    if (isNotNumber) {
      throw new BadRequestException('Please provide correct item ID in your query');
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
    const commodityTimestampKeys = await this.redisService.keys('COMMODITY:TS:*');

    const commodityTimestamp = await this.redisService.mget(commodityTimestampKeys);

    // TODO in case of Redis not found!

    const timestamps = commodityTimestamp.map((t) => Number(t)).sort((a, b) => a - b);

    const latestCommodityTimestamp = timestamps.slice(-1);

    const key = `COMMODITY:CHART:${itemId}:${latestCommodityTimestamp}`;

    return { latestCommodityTimestamp, timestamps, key };
  }

  async getChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const item = await this.queryItem(String(input.id));

    const { timestamps, key } = await this.getLatestTimestampCommodity(item.id);

    // --- read-through cache: serve the precomputed chart if present --- //
    // The key embeds the latest commodity timestamp, so a new snapshot
    // naturally invalidates it. TTL is a 1h safety net in case the snapshot
    // pipeline stalls. Failures here must NOT break the request — fall through
    // to a fresh build.
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached) as ItemChartDto;
      }
    } catch (errorOrException) {
      this.logger.warn(
        `chart cache read failed for item ${item.id}: ${
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException)
        }`,
      );
    }

    const yPriceAxis = await this.priceAxisCommodity({
      itemId: item.id,
    });

    const { dataset, xAxis } = await this.buildChartDataset(yPriceAxis, timestamps, item.id);

    const chart = JSON.stringify({
      yAxis: yPriceAxis,
      xAxis,
      dataset,
    });

    try {
      await this.redisService.set(key, chart, 'EX', 3600);
    } catch (errorOrException) {
      this.logger.warn(
        `chart cache write failed for item ${item.id}: ${
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException)
        }`,
      );
    }

    return { yAxis: yPriceAxis, xAxis, dataset };
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

    const { dataset, xAxis } = await this.buildChartDataset(yPriceAxis, timestampValues, goldItemId);

    return { yAxis: yPriceAxis, xAxis, dataset };
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
   * Build the Y-axis price edges for an item.
   *
   * Delegates to the pure helpers in `price-binning.ts`:
   *   - filters outliers (order-count-weighted IQR on log10 price),
   *   - picks log vs linear bins based on the cleaned range,
   *   - snaps edges to nice 1-2-5 steps and dedupes them.
   *
   * The same edges are used for both the axis labels AND cell assignment, so
   * what the user reads on the axis always matches where orders were bucketed.
   * Returns an empty array if there is no usable market data.
   */
  private async getPriceEdges(itemId: number, blocks = DEFAULT_BLOCKS): Promise<number[]> {
    const marketData = await this.marketRepository.find({
      where: { itemId },
      select: ['price', 'quantity'],
    });

    return buildHybridPriceBins(marketData, blocks);
  }

  async priceAxisCommodity(args: IBuildYAxis): Promise<number[]> {
    return this.getPriceEdges(args.itemId);
  }

  /**
   * Processes market orders for a single timestamp and creates price level dataset.
   *
   * `yPriceAxis` is BOTH the displayed axis labels AND the bucket edges — they
   * are the same array now, so an order lands in exactly the row whose label
   * the user sees.
   */
  private async processTimestampData(
    timestamp: number,
    itx: number,
    yPriceAxis: number[],
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

      // Assign each order to its bucket using the same edges that produced the
      // axis labels. Binary search, O(log n) per order.
      for (const order of marketOrders) {
        const bucketIndex = assignPriceBucket(order.price, yPriceAxis);

        priceLevelDataset[bucketIndex].orders = priceLevelDataset[bucketIndex].orders + 1;
        priceLevelDataset[bucketIndex].oi = priceLevelDataset[bucketIndex].oi + (order.value ?? 0);
        priceLevelDataset[bucketIndex].value = priceLevelDataset[bucketIndex].value + (order.quantity ?? 0);
        priceLevelDataset[bucketIndex].price =
          priceLevelDataset[bucketIndex].value > 0
            ? priceLevelDataset[bucketIndex].oi / priceLevelDataset[bucketIndex].value
            : 0;
      }

      return priceLevelDataset;
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'processTimestampData',
          `item-${itemId}`,
          0,
          `timestamp ${timestamp}: ${
            errorOrException instanceof Error ? errorOrException.message : String(errorOrException)
          }`,
        ),
      );
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

  /**
   * Build the full dataset by processing each timestamp in parallel (RxJS),
   * then trim leading/trailing X-buckets that contain no market activity at
   * all, so the chart doesn't render long empty margins (e.g. a multi-month
   * gap between snapshot batches). Interior gaps are preserved — those carry
   * information about when the market was offline.
   */
  async buildChartDataset(
    yPriceAxis: number[],
    xTimestampAxis: number[],
    itemId: number,
  ): Promise<{ dataset: IChartOrder[]; xAxis: number[] }> {
    if (!yPriceAxis.length) return { dataset: [], xAxis: xTimestampAxis };

    try {
      const dataset = await lastValueFrom(
        from(xTimestampAxis).pipe(
          mergeMap(async (timestamp, itx) => {
            return await this.processTimestampData(timestamp, itx, yPriceAxis, itemId);
          }),
          reduce((acc: IChartOrder[], curr: IChartOrder[]) => [...acc, ...curr], [] as IChartOrder[]),
        ),
      );

      return this.trimEmptyXMargins(dataset, xTimestampAxis);
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'buildChartDataset',
          `item-${itemId}`,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
      return { dataset: [], xAxis: xTimestampAxis };
    }
  }

  /**
   * Drop leading/trailing X indices whose column is entirely empty (every
   * price bucket has value 0). Returns the trimmed dataset and a parallel
   * `xAxis` whose entries match the surviving column indices. The x-indices
   * in the returned dataset are remapped to be 0-based contiguous so the
   * frontend's `dataMap.get(`${xIndex}-${yIndex}`)` lookup still works.
   */
  private trimEmptyXMargins(dataset: IChartOrder[], xAxis: number[]): { dataset: IChartOrder[]; xAxis: number[] } {
    if (!dataset.length || !xAxis.length) {
      return { dataset, xAxis };
    }

    const populatedX = new Set<number>();
    for (const point of dataset) {
      if (point.value > 0) populatedX.add(point.x);
    }

    if (populatedX.size === 0) return { dataset, xAxis };

    const minPopulated = Math.min(...populatedX);
    const maxPopulated = Math.max(...populatedX);

    // No trimming possible — keep as-is to preserve identity with xAxis.
    if (minPopulated === 0 && maxPopulated === xAxis.length - 1) {
      return { dataset, xAxis };
    }

    const keptXIndices: number[] = [];
    for (let x = minPopulated; x <= maxPopulated; x++) {
      keptXIndices.push(x);
    }

    const oldToNew = new Map<number, number>();
    keptXIndices.forEach((oldX, newX) => oldToNew.set(oldX, newX));

    const trimmedDataset = dataset
      .filter((p) => p.x >= minPopulated && p.x <= maxPopulated)
      .map((p) => ({ ...p, x: oldToNew.get(p.x)! }));

    const trimmedXAxis = keptXIndices.map((x) => xAxis[x]);

    return { dataset: trimmedDataset, xAxis: trimmedXAxis };
  }

  async getItemFeed(input: ItemRealmDto): Promise<ItemFeedDto> {
    const item = await this.queryItem(input.id);

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
      throw new BadRequestException('Search query must be at least 2 characters long');
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
      throw new BadRequestException(`Item with ID ${itemId} does not have contract data`);
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
        throw new BadRequestException('Invalid period. Use: 1m, 1w, 30d, 1d, or 24h');
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
      (contract) => contract.timestamp >= startTimestamp && contract.timestamp <= endTimestamp,
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

      throw new BadRequestException(`Error searching for items. Please try a different search term.`);
    }
  }
}
