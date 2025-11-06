import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ItemsEntity,
  MarketEntity,
  PricingEntity,
  RealmsEntity,
  ValuationEntity,
} from '@app/pg';
import { In, Repository } from 'typeorm';
import {
  IAssetClassBuildArgs,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  VALUATION_TYPE,
} from '@app/resources';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { dmaConfig } from '@app/configuration';

@Injectable()
export class ValuationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ValuationsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(PricingEntity)
    private readonly pricingRepository: Repository<PricingEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ValuationEntity)
    private readonly valuationRepository: Repository<ValuationEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.buildAssetClasses(
      {
        isByPricing: dmaConfig.isValuationsFromPricing,
        isByAuctions: dmaConfig.isValuationsFromAuctions,
        isByPremium: dmaConfig.isValuationsForPremium,
        isByCurrency: dmaConfig.isValuationsForCurrency,
        isByTags: dmaConfig.isValuationsBuildTags,
      },
      dmaConfig.isValuationsBuild,
    );
  }

  /**
   * Generate state hash for a stage to detect if data has changed
   */
  private async generateStateHash(stage: string): Promise<string> {
    const logTag = 'generateStateHash';
    try {
      let stateData = '';

      switch (stage) {
        case 'pricing':
          const pricingCount = await this.pricingRepository.count();
          const latestPricing = await this.pricingRepository.find({
            order: { updatedAt: 'DESC' },
            take: 1,
          });
          stateData = `${pricingCount}:${latestPricing[0]?.updatedAt || ''}`;
          break;

        case 'auctions':
          const marketCount = await this.marketRepository.count();
          const latestMarket = await this.marketRepository.find({
            order: { createdAt: 'DESC' },
            take: 1,
          });
          stateData = `${marketCount}:${latestMarket[0]?.createdAt || ''}`;
          break;

        case 'premium':
        case 'currency':
        case 'tags':
          const itemsCount = await this.itemsRepository.count();
          stateData = `${itemsCount}:${stage}`;
          break;

        default:
          stateData = `${stage}:${Date.now()}`;
      }

      return createHash('md5').update(stateData).digest('hex');
    } catch (errorOrException) {
      this.logger.error({ logTag, stage, errorOrException });
      return createHash('md5')
        .update(`${stage}:${Date.now()}`)
        .digest('hex');
    }
  }

  /**
   * Check if a stage has been processed with current state
   */
  private async isStageProcessed(stage: string): Promise<boolean> {
    const stateHash = await this.generateStateHash(stage);
    const redisKey = `VALUATION_STAGE_PROCESSED:${stage}:${stateHash}`;
    const exists = await this.redisService.exists(redisKey);
    return exists === 1;
  }

  /**
   * Mark a stage as processed (expires after 7 days)
   */
  private async markStageAsProcessed(stage: string): Promise<void> {
    const stateHash = await this.generateStateHash(stage);
    const redisKey = `VALUATION_STAGE_PROCESSED:${stage}:${stateHash}`;
    const ttl = 60 * 60 * 24 * 7; // 7 days
    await this.redisService.setex(redisKey, ttl, new Date().toISOString());
    this.logger.debug({
      logTag: 'markStageAsProcessed',
      stage,
      stateHash,
      redisKey,
      ttl,
      message: `Marked stage as processed: ${stage}`,
    });
  }

  /**
   * Build asset classes based on various data sources
   * @param args Object with flags for each stage to process
   * @param init Whether to initialize the build
   */
  async buildAssetClasses(
    args: IAssetClassBuildArgs = {
      isByPricing: true,
      isByAuctions: true,
      isByPremium: false,
      isByCurrency: true,
      isByTags: true,
    },
    init: boolean = true,
  ): Promise<void> {
    try {
      const logTag = 'buildAssetClasses';
      this.logger.log({
        logTag,
        init,
        args,
        message: `Building asset classes: init=${init}`,
      });

      if (!init) {
        this.logger.debug({
          logTag,
          message: 'Valuations build disabled',
        });
        return;
      }

      if (args.isByPricing) {
        await this.buildAssetClassesFromPricing();
      }

      if (args.isByAuctions) {
        await this.buildAssetClassesFromAuctions();
      }

      if (args.isByPremium) {
        await this.buildAssetClassesForPremium();
      }

      if (args.isByCurrency) {
        await this.buildAssetClassesForCurrency();
      }

      if (args.isByTags) {
        await this.buildTags();
      }
    } catch (errorOrException) {
      const logTag = 'buildAssetClasses';
      this.logger.error({ logTag, errorOrException });
    }
  }

  /**
   * This stage adds asset_classes from pricing
   * such as REAGENT / DERIVATIVE
   */
  private async buildAssetClassesFromPricing(): Promise<void> {
    const logTag = 'buildAssetClassesFromPricing';
    this.logger.debug({ logTag, message: 'Pricing stage started' });

    const isProcessed = await this.isStageProcessed('pricing');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'pricing',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    const pricings = await this.pricingRepository.find();

    for (const pricing of pricings) {
      // Handle derivatives
      if (pricing.derivatives) {
        const derivativesArray =
          typeof pricing.derivatives === 'string'
            ? JSON.parse(pricing.derivatives)
            : pricing.derivatives;

        for (const derivative of derivativesArray) {
          const itemId =
            typeof derivative === 'object' ? derivative.itemId : derivative;
          if (itemId) {
            await this.addAssetClassToItem(itemId, VALUATION_TYPE.DERIVATIVE);
          }
        }
      }

      // Handle reagents
      if (pricing.reagents) {
        const reagentsArray =
          typeof pricing.reagents === 'string'
            ? JSON.parse(pricing.reagents)
            : pricing.reagents;

        for (const reagent of reagentsArray) {
          const itemId = typeof reagent === 'object' ? reagent.itemId : reagent;
          if (itemId) {
            await this.addAssetClassToItem(itemId, VALUATION_TYPE.REAGENT);
          }
        }
      }
    }

    await this.markStageAsProcessed('pricing');
    this.logger.debug({ logTag, message: 'Pricing stage ended' });
  }

  /**
   * This stage adds asset_classes from market/auction data
   * such as COMMDTY / ITEM and MARKET
   */
  private async buildAssetClassesFromAuctions(): Promise<void> {
    const logTag = 'buildAssetClassesFromAuctions';
    this.logger.debug({ logTag, message: 'Auctions stage started' });

    const isProcessed = await this.isStageProcessed('auctions');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'auctions',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    if (dmaConfig.isValuationsMarketAssetClass) {
      await this.addMarketAssetClass();
    }

    if (dmaConfig.isValuationsCommodityAssetClass) {
      await this.addCommodityAssetClass();
    }

    if (dmaConfig.isValuationsItemAssetClass) {
      await this.addItemAssetClass();
    }

    await this.markStageAsProcessed('auctions');
    this.logger.debug({ logTag, message: 'Auctions stage ended' });
  }

  /**
   * Add MARKET asset class to all items present in the market table
   */
  private async addMarketAssetClass(): Promise<void> {
    const logTag = 'addMarketAssetClass';
    this.logger.debug({
      logTag,
      message: 'Adding MARKET asset class',
    });

    // Get all distinct item IDs from market table
    const distinctItemIds = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.item_id', 'itemId')
      .getRawMany();

    const allItemIds = distinctItemIds.map((item) => item.itemId);

    if (allItemIds.length > 0) {
      // Add MARKET asset class to all items (if not already present)
      await this.itemsRepository
        .createQueryBuilder()
        .update(ItemsEntity)
        .set({
          assetClass: () =>
            `array_append(asset_class, '${VALUATION_TYPE.MARKET}')`,
        })
        .where('id = ANY(:ids)', { ids: allItemIds })
        .andWhere('NOT (:market = ANY(asset_class))', {
          market: VALUATION_TYPE.MARKET,
        })
        .execute();

      this.logger.debug({
        logTag,
        count: allItemIds.length,
        assetClass: VALUATION_TYPE.MARKET,
        message: `Added MARKET asset class to ${allItemIds.length} items`,
      });
    }
  }

  /**
   * Add COMMDTY asset class to commodity items (item_id = 1 OR type = 'COMMDTY')
   */
  private async addCommodityAssetClass(): Promise<void> {
    const logTag = 'addCommodityAssetClass';
    this.logger.debug({
      logTag,
      message: 'Adding COMMDTY asset class',
    });

    // Get commodity item IDs (item_id = 1 OR type = 'COMMDTY')
    const commodityItemIds = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.item_id', 'itemId')
      .where('market.item_id = :goldId', { goldId: 1 })
      .orWhere('market.type = :type', { type: MARKET_TYPE.C })
      .getRawMany();

    const commodityIds = commodityItemIds.map((item) => item.itemId);

    if (commodityIds.length > 0) {
      // Add COMMDTY asset class (if not already present)
      await this.itemsRepository
        .createQueryBuilder()
        .update(ItemsEntity)
        .set({
          assetClass: () =>
            `array_append(asset_class, '${VALUATION_TYPE.COMMDTY}')`,
        })
        .where('id = ANY(:ids)', { ids: commodityIds })
        .andWhere('NOT (:commdty = ANY(asset_class))', {
          commdty: VALUATION_TYPE.COMMDTY,
        })
        .execute();

      this.logger.debug({
        logTag,
        count: commodityIds.length,
        assetClass: VALUATION_TYPE.COMMDTY,
        message: `Added COMMDTY asset class to ${commodityIds.length} items`,
      });
    }
  }

  /**
   * Add ITEM asset class to auction items (type = 'AUCTION')
   */
  private async addItemAssetClass(): Promise<void> {
    const logTag = 'addItemAssetClass';
    this.logger.debug({
      logTag,
      message: 'Adding ITEM asset class',
    });

    // Get auction item IDs (type = 'AUCTION')
    const auctionItemIds = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.item_id', 'itemId')
      .where('market.type = :type', { type: MARKET_TYPE.A })
      .getRawMany();

    const auctionIds = auctionItemIds.map((item) => item.itemId);

    if (auctionIds.length > 0) {
      // Add ITEM asset class (if not already present)
      await this.itemsRepository
        .createQueryBuilder()
        .update(ItemsEntity)
        .set({
          assetClass: () =>
            `array_append(asset_class, '${VALUATION_TYPE.ITEM}')`,
        })
        .where('id = ANY(:ids)', { ids: auctionIds })
        .andWhere('NOT (:item = ANY(asset_class))', {
          item: VALUATION_TYPE.ITEM,
        })
        .execute();

      this.logger.debug({
        logTag,
        count: auctionIds.length,
        assetClass: VALUATION_TYPE.ITEM,
        message: `Added ITEM asset class to ${auctionIds.length} items`,
      });
    }
  }

  /**
   * This stage defines PREMIUM asset_class for items
   * based on loot_type and asset_class: REAGENT
   */
  private async buildAssetClassesForPremium(): Promise<void> {
    const logTag = 'buildAssetClassesForPremium';
    this.logger.debug({ logTag, message: 'Premium stage started' });

    const isProcessed = await this.isStageProcessed('premium');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'premium',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    const premiumItems = await this.itemsRepository
      .createQueryBuilder('item')
      .where(':reagent = ANY(item.asset_class)', {
        reagent: VALUATION_TYPE.REAGENT,
      })
      .andWhere('item.loot_type = :lootType', { lootType: 'ON_ACQUIRE' })
      .getMany();

    for (const item of premiumItems) {
      await this.addAssetClassToItem(item.id, VALUATION_TYPE.PREMIUM);
    }

    await this.markStageAsProcessed('premium');
    this.logger.debug({ logTag, message: 'Premium stage ended' });
  }

  /**
   * This stage defines CURRENCY and WOWTOKEN asset classes
   */
  private async buildAssetClassesForCurrency(): Promise<void> {
    const logTag = 'buildAssetClassesForCurrency';
    this.logger.debug({ logTag, message: 'Currency stage started' });

    const isProcessed = await this.isStageProcessed('currency');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'currency',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    await this.addAssetClassToItem(122270, VALUATION_TYPE.WOWTOKEN);
    await this.addAssetClassToItem(122284, VALUATION_TYPE.WOWTOKEN);
    await this.addAssetClassToItem(1, VALUATION_TYPE.GOLD);

    await this.markStageAsProcessed('currency');
    this.logger.debug({ logTag, message: 'Currency stage ended' });
  }

  /**
   * In this stage we build tags
   */
  private async buildTags(): Promise<void> {
    const logTag = 'buildTags';
    this.logger.debug({ logTag, message: 'Tags stage started' });

    const isProcessed = await this.isStageProcessed('tags');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'tags',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    const items = await this.itemsRepository.find();

    for (const item of items) {
      const tagsSet = new Set<string>(item.tags || []);

      if (item.vendorSellPrice) {
        await this.addAssetClassToItem(item.id, VALUATION_TYPE.VSP);
      }

      if (item.expansion) tagsSet.add(item.expansion.toLowerCase());
      if (item.professionClass) tagsSet.add(item.professionClass.toLowerCase());

      if (item.assetClass) {
        item.assetClass.forEach((assetClass) => {
          tagsSet.add(assetClass.toLowerCase());
        });
      }

      if (item.itemClass) tagsSet.add(item.itemClass.toLowerCase());
      if (item.itemSubClass) tagsSet.add(item.itemSubClass.toLowerCase());
      if (item.quality) tagsSet.add(item.quality.toLowerCase());

      if (item.ticker) {
        item.ticker.split('.').forEach((ticker) => {
          const t = ticker.toLowerCase();
          if (t === 'j' || t === 'petal' || t === 'nugget') {
            tagsSet.add(t);
            return;
          }
          tagsSet.add(t);
        });
      }

      // Convert Set back to array
      const uniqueTags = Array.from(tagsSet);

      await this.itemsRepository.update({ id: item.id }, { tags: uniqueTags });

      this.logger.debug({
        logTag,
        itemId: item.id,
        tags: uniqueTags.join(', '),
        message: `Updated tags for item: ${item.id}`,
      });
    }

    await this.markStageAsProcessed('tags');
    this.logger.debug({ logTag, message: 'Tags stage ended' });
  }

  /**
   * Helper method to add an asset class to an item
   */
  private async addAssetClassToItem(
    itemId: number,
    assetClass: VALUATION_TYPE,
  ): Promise<void> {
    const logTag = 'addAssetClassToItem';

    const item = await this.itemsRepository.findOne({ where: { id: itemId } });

    if (!item) {
      this.logger.warn({
        logTag,
        itemId,
        assetClass,
        message: `Item not found: ${itemId}`,
      });
      return;
    }

    const currentAssetClasses = item.assetClass || [];

    if (!currentAssetClasses.includes(assetClass)) {
      await this.itemsRepository.update(
        { id: itemId },
        { assetClass: [...currentAssetClasses, assetClass] },
      );

      this.logger.debug({
        logTag,
        itemId,
        assetClass,
        message: `Added ${assetClass} asset class to item: ${itemId}`,
      });
    }
  }
}
