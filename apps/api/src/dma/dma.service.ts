import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  IBuildYAxis,
  IChartOrder,
  IQItemValuation,
  ItemChartDto,
  ItemFeedDto,
  ItemQuotesDto,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  ReqGetItemDto,
  valuationsQueue,
  WOW_TOKEN_ITEM_ID,
  WowtokenDto,
} from '@app/resources';
import { ItemRealmDto } from '@app/resources';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { from, lastValueFrom, mergeMap, reduce } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';
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
    @InjectQueue(valuationsQueue.name)
    private readonly _queueValuations: Queue<IQItemValuation, number>,
  ) {}

  // TODO validation on DTO level
  async getItem(input: ReqGetItemDto): Promise<ItemsEntity> {
    const isNotNumber = isNaN(Number(input.id));
    if (isNotNumber) {
      throw new BadRequestException('Please provide correct item ID in your query');
    }

    const id = parseInt(input.id);
    // TODO return DTO?
    return await this.itemsRepository.findOneBy({ id });
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

    const timestamps = commodityTimestamp
      .map((t) => Number(t)).sort((a, b) => a - b);

    const latestCommodityTimestamp = timestamps.slice(-1);

    const key = `COMMODITY:CHART:${itemId}:${latestCommodityTimestamp}`;

    return { latestCommodityTimestamp, timestamps, key };
  }

  async getChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const item = await this.queryItem(input.id);

    const { timestamps, key } = await this.getLatestTimestampCommodity(item.id);

    // --- return cached chart from redis on exist -- //
    const getCacheItemChart = await this.redisService.get(key);
    if (getCacheItemChart) {
      return JSON.parse(getCacheItemChart) as ItemChartDto;
    }

    const yPriceAxis = await this.priceAxisCommodity({
      itemId: item.id,
      isGold: false,
    });

    const { dataset } = await this.buildChartDataset(yPriceAxis, timestamps, item.id);

    const chart =  JSON.stringify({ yAxis: yPriceAxis, xAxis: timestamps, dataset });

    await this.redisService.set(
      key,
      chart,
      'EX',
      3600,
    );

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

    const timestampValues = timestamps.map(t => t.timestamp);

    const yPriceAxis = await this.priceAxisCommodity({
      itemId: goldItemId,
      isGold: true,
    });

    const { dataset } = await this.buildChartDataset(yPriceAxis, timestampValues, goldItemId);

    return { yAxis: yPriceAxis, xAxis: timestampValues, dataset };
  }

  private async yPriceRange(itemId: number, blocks: number) {
    const marketQuotes = await this.marketRepository
      .createQueryBuilder('markets')
      .where({ itemId }) // TODO itemId if GOLD add realmId
      .distinctOn(['markets.price'])
      .getMany();

    const quotes = marketQuotes.map((q) => q.price);

    if (!quotes.length) return [];
    const length = quotes.length > 3 ? quotes.length - 3 : quotes.length;
    const start = length === 1 ? 0 : 1;

    const cap = Math.round(quotes[Math.floor(length * 0.9)]);
    const floor = Math.round(quotes[start]);
    const priceRange = cap - floor;
    // --- Step represents 5% for each cluster --- //
    const tick = priceRange / blocks;

    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  async priceAxisCommodity(args: IBuildYAxis): Promise<number[]> {
    const { itemId, isGold: _isGold } = args;

    const blocks = 20;

    return this.yPriceRange(itemId, blocks);
  }

  /**
   * Processes market orders for a single timestamp and creates price level dataset
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

      let priceItx = 0;

      // Process market orders for this timestamp
      for (const order of marketOrders) {
        const isPriceItxUp =
          order.price >= priceLevelDataset[priceItx].lt &&
          Boolean(priceLevelDataset[priceItx + 1]);

        if (isPriceItxUp) priceItx = priceItx + 1;

        priceLevelDataset[priceItx].orders = priceLevelDataset[priceItx].orders + 1;
        priceLevelDataset[priceItx].oi = priceLevelDataset[priceItx].oi + (order.value ?? 0);
        priceLevelDataset[priceItx].value = priceLevelDataset[priceItx].value + (order.quantity ?? 0);
        priceLevelDataset[priceItx].price =
          priceLevelDataset[priceItx].value > 0
            ? priceLevelDataset[priceItx].oi / priceLevelDataset[priceItx].value
            : 0;
      }

      return priceLevelDataset;
    } catch (errorOrException) {
      // Log error and return empty dataset for this timestamp
      const logTag = 'processTimestampData';
      this.logger.error({ logTag, timestamp, itemId, errorOrException, message: `Error processing timestamp ${timestamp} for item ${itemId}` });
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

  async buildChartDataset(yPriceAxis: number[], xTimestampAxis: number[], itemId: number) {
    if (!yPriceAxis.length) return { dataset: [] };

    try {
      // Process each timestamp and return the aggregated results
      const dataset = await lastValueFrom(
        from(xTimestampAxis).pipe(
          mergeMap(async (timestamp, itx) => {
            return await this.processTimestampData(timestamp, itx, yPriceAxis, itemId);
          }),
          // Collect all arrays and flatten them
          reduce((acc: IChartOrder[], curr: IChartOrder[]) => [...acc, ...curr], [] as IChartOrder[])
        ),
      );

      return { dataset };
    } catch (errorOrException) {
      const logTag = 'buildChartDataset';
      this.logger.error({ logTag, itemId, errorOrException, message: `Error building chart dataset for item ${itemId}` });
      // Return empty dataset on error
      return { dataset: [] };
    }
  }


  async getItemFeed(input: ItemRealmDto): Promise<ItemFeedDto> {
    const item = await this.queryItem(input.itemRealm);

    // Parse realm from itemRealm format: "itemId@realmSlug"
    const [_itemIdStr, realmSlug] = input.itemRealm.split('@');

    if (!realmSlug) {
      throw new BadRequestException('Realm information required for item feed. Use format: itemId@realmSlug');
    }

    // Find recent market data for this item
    const feed = await this.marketRepository.find({
      where: { itemId: item.id },
      order: { createdAt: 'DESC' },
      take: 50 // Limit to recent 50 entries
    });

    return { feed };
  }

  async getAssetQuotes(input: ItemRealmDto): Promise<ItemQuotesDto> {
    const item = await this.queryItem(input.itemRealm);

    // Get aggregated market data for quotes
    const quotes = await this.marketRepository
      .createQueryBuilder('market')
      .select([
        'market.price as price',
        'COUNT(*) as orders',
        'SUM(market.quantity) as quantity',
        'SUM(market.value) as open_interest'
      ])
      .where('market.itemId = :itemId', { itemId: item.id })
      .groupBy('market.price')
      .orderBy('market.price', 'ASC')
      .limit(100)
      .getRawMany();

    return { quotes };
  }

  async queryItem(input: string): Promise<ItemsEntity> {
    // Parse itemRealm format: "itemId" or "itemId@realmSlug" or "itemName@realmSlug"
    const [itemQuery] = input.split('@');
    const trimmedQuery = itemQuery.trim();
    
    if (!trimmedQuery) {
      throw new BadRequestException('Item query cannot be empty');
    }

    // Check if input is a numeric ID
    const isNumeric = !isNaN(Number(trimmedQuery)) && Number.isInteger(Number(trimmedQuery));
    
    if (isNumeric) {
      return await this.findItemById(parseInt(trimmedQuery));
    } else {
      return await this.findItemByName(trimmedQuery);
    }
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
            searchQuery: searchQuery
          }
        )
        // Order by relevance: exact matches first, then partial matches
        .orderBy(
          `CASE 
            WHEN LOWER(item.name) = :exactQuery THEN 1
            WHEN LOWER(item.name) LIKE :startQuery THEN 2
            WHEN LOWER(item.name) LIKE :likeQuery THEN 3
            ELSE 4
          END`,
          'ASC'
        )
        .setParameters({
          exactQuery: normalizedQuery,
          startQuery: `${normalizedQuery}%`,
          likeQuery: `%${normalizedQuery}%`,
          searchQuery: searchQuery
        })
        .limit(1)
        .getOne();

      if (!item) {
        throw new BadRequestException(`No item found matching "${searchQuery}". Try using item ID or a more specific name.`);
      }

      this.logger.log(
        `Found item via name search: "${searchQuery}" -> ID: ${item.id}, Name: ${item.name}`,
        'findItemByName'
      );

      return item;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(
        `Error searching for item by name: "${searchQuery}"`,
        error instanceof Error ? error.stack : String(error),
        'findItemByName'
      );
      
      throw new BadRequestException(`Error searching for item "${searchQuery}". Please try a different search term or use item ID.`);
    }
  }

  async getWowToken(input: WowtokenDto) {
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
}
