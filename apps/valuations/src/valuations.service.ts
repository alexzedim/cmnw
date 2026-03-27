import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository, In } from 'typeorm';
import { Queue } from 'bullmq';
import { ItemsEntity, RealmsEntity, PricingEntity, MarketEntity } from '@app/pg';
import { ASSET_EVALUATION_PRIORITY, IVAAuctions, IVARealm, VALUATION_TYPE } from '@app/resources';
import { valuationsConfig } from '@app/configuration';
import { ItemPricing } from '@app/resources';

@Injectable()
export class ValuationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ValuationsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(PricingEntity)
    private readonly pricingRepository: Repository<PricingEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectQueue('dma.valuations')
    private readonly valuationsQueue: Queue<any>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.clearQueue();
    await this.buildAssetClasses(['pricing', 'auctions', 'contracts', 'currency', 'tags'], valuationsConfig.build);
  }

  async clearQueue(): Promise<void> {
    await this.valuationsQueue.drain();
  }

  async initValuations(): Promise<void> {
    try {
      const realms = await this.realmsRepository
        .createQueryBuilder('realm')
        .select('DISTINCT realm.connectedRealmId', 'connectedRealmId')
        .addSelect('realm.auctionsTimestamp', 'auctions')
        .addSelect('realm.valuationsTimestamp', 'valuations')
        .groupBy('realm.connectedRealmId')
        .addGroupBy('realm.auctionsTimestamp')
        .addGroupBy('realm.valuationsTimestamp')
        .getRawMany();

      for (const realm of realms) {
        const { connectedRealmId, auctions, valuations } = realm as any;
        if (auctions <= valuations) continue;
        await this.buildValuations(connectedRealmId, auctions);
      }
    } catch (errorOrException) {
      this.logger.error(`initValuations: ${errorOrException}`);
    }
  }

  async buildValuations(connectedRealmId: number, timestamp: number): Promise<void> {
    try {
      for (const [priority, query] of ASSET_EVALUATION_PRIORITY) {
        this.logger.log(`=======================================`);
        this.logger.log(`buildValuations: ${connectedRealmId}-${priority}`);
        const items = await this.itemsRepository.find({ where: query as any });
        for (const item of items) {
          await this.valuationsQueue.add(
            'valuation',
            {
              _id: item.id,
              last_modified: timestamp,
              connected_realm_id: connectedRealmId,
              iteration: 0,
            },
            {
              priority,
            },
          );
        }
        this.logger.log(`=======================================`);
      }
      await this.realmsRepository.update({ connectedRealmId }, { valuationsTimestamp: timestamp });
      this.logger.log(`buildValuations: realm: ${connectedRealmId} updated: ${timestamp}`);
    } catch (errorOrException) {
      this.logger.error(`buildValuations: ${errorOrException}`);
    }
  }

  async buildAssetClasses(
    args: string[] = ['pricing', 'auctions', 'contracts', 'currency', 'tags'],
    init: boolean = true,
  ): Promise<void> {
    try {
      this.logger.log(`buildAssetClasses: init: ${init}`);
      if (!init) {
        return;
      }
      if (args.includes('pricing')) {
        const logTag = 'buildAssetIndex';
        this.logger.debug({
          logTag,
          stage: 'pricing',
          message: 'Pricing stage started',
        });
        const pricingRecords = await this.pricingRepository.find();
        for (const pricing of pricingRecords) {
          const derivatives =
            typeof pricing.derivatives === 'string' ? JSON.parse(pricing.derivatives) : pricing.derivatives;
          const reagents = typeof pricing.reagents === 'string' ? JSON.parse(pricing.reagents) : pricing.reagents;

          for (const derivative of derivatives as ItemPricing[]) {
            const item = await this.itemsRepository.findOne({ where: { id: derivative.itemId } });
            if (item) {
              if (!item.assetClass) item.assetClass = [];
              if (!item.assetClass.includes(VALUATION_TYPE.DERIVATIVE)) {
                item.assetClass.push(VALUATION_TYPE.DERIVATIVE);
              }
              this.logger.debug({
                logTag,
                itemId: derivative.itemId,
                assetClass: VALUATION_TYPE.DERIVATIVE,
                message: `Added derivative asset class to item: ${derivative.itemId}`,
              });
              await this.itemsRepository.save(item);
            }
          }
          for (const reagent of reagents as ItemPricing[]) {
            const item = await this.itemsRepository.findOne({ where: { id: reagent.itemId } });
            if (item) {
              if (!item.assetClass) item.assetClass = [];
              if (!item.assetClass.includes(VALUATION_TYPE.REAGENT)) {
                item.assetClass.push(VALUATION_TYPE.REAGENT);
              }
              this.logger.debug({
                logTag,
                itemId: reagent.itemId,
                assetClass: VALUATION_TYPE.REAGENT,
                message: `Added reagent asset class to item: ${reagent.itemId}`,
              });
              await this.itemsRepository.save(item);
            }
          }
        }
        this.logger.debug({
          logTag,
          stage: 'pricing',
          message: 'Pricing stage ended',
        });
      }
      if (args.includes('auctions')) {
        this.logger.debug('auctions stage started');
        const itemAuctions = await this.marketRepository
          .createQueryBuilder('market')
          .select('market.itemId')
          .groupBy('market.itemId')
          .getRawMany();

        for (const itemAuction of itemAuctions as IVAAuctions[]) {
          const item = await this.itemsRepository.findOne({ where: { id: itemAuction._id } });
          if (item) {
            if (!item.assetClass) item.assetClass = [];
            if (!item.assetClass.includes(VALUATION_TYPE.MARKET)) {
              item.assetClass.push(VALUATION_TYPE.MARKET);
            }
            const auctionData = await this.marketRepository.findOne({
              where: { itemId: itemAuction._id },
            });
            if (auctionData?.price) {
              if (!item.assetClass.includes(VALUATION_TYPE.COMMDTY)) {
                item.assetClass.push(VALUATION_TYPE.COMMDTY);
              }
              this.logger.debug(`item: ${item.id}, asset_class: ${VALUATION_TYPE.COMMDTY}`);
            } else if (auctionData?.bid || auctionData?.price) {
              if (!item.assetClass.includes(VALUATION_TYPE.ITEM)) {
                item.assetClass.push(VALUATION_TYPE.ITEM);
              }
              this.logger.debug(`item: ${item.id}, asset_class: ${VALUATION_TYPE.ITEM}`);
            }
            await this.itemsRepository.save(item);
          }
        }
        this.logger.debug('auctions stage ended');
      }
      if (args.includes('contracts')) {
        this.logger.debug('contracts stage started');
        await this.itemsRepository
          .createQueryBuilder()
          .update(ItemsEntity)
          .set({ hasContracts: true })
          .where('id = :id', { id: 1 })
          .orWhere('(expansion = :expansion AND assetClass @> :assetClass AND ticker IS NOT NULL)', {
            expansion: 'SHDW',
            assetClass: [VALUATION_TYPE.MARKET, VALUATION_TYPE.COMMDTY],
          })
          .execute();
        this.logger.debug('contracts stage ended');
      }
      if (args.includes('premium')) {
        this.logger.debug('premium stage started');
        const premiumItems = await this.itemsRepository.find({
          where: {
            assetClass: In([VALUATION_TYPE.REAGENT]),
            lootType: 'ON_ACQUIRE',
          },
        });
        for (const item of premiumItems) {
          if (!item.assetClass) item.assetClass = [];
          if (!item.assetClass.includes(VALUATION_TYPE.PREMIUM)) {
            item.assetClass.push(VALUATION_TYPE.PREMIUM);
            await this.itemsRepository.save(item);
          }
        }
        this.logger.debug('premium stage ended');
      }
      if (args.includes('currency')) {
        this.logger.debug('currency stage started');
        const item122270 = await this.itemsRepository.findOne({ where: { id: 122270 } });
        if (item122270) {
          if (!item122270.assetClass) item122270.assetClass = [];
          if (!item122270.assetClass.includes(VALUATION_TYPE.WOWTOKEN)) {
            item122270.assetClass.push(VALUATION_TYPE.WOWTOKEN);
            await this.itemsRepository.save(item122270);
          }
        }
        const item122284 = await this.itemsRepository.findOne({ where: { id: 122284 } });
        if (item122284) {
          if (!item122284.assetClass) item122284.assetClass = [];
          if (!item122284.assetClass.includes(VALUATION_TYPE.WOWTOKEN)) {
            item122284.assetClass.push(VALUATION_TYPE.WOWTOKEN);
            await this.itemsRepository.save(item122284);
          }
        }
        const item1 = await this.itemsRepository.findOne({ where: { id: 1 } });
        if (item1) {
          if (!item1.assetClass) item1.assetClass = [];
          if (!item1.assetClass.includes(VALUATION_TYPE.GOLD)) {
            item1.assetClass.push(VALUATION_TYPE.GOLD);
            await this.itemsRepository.save(item1);
          }
        }
        this.logger.debug('currency stage ended');
      }
      if (args.includes('tags')) {
        this.logger.debug('tags stage started');
        const items = await this.itemsRepository.find();
        for (const item of items) {
          if (item.assetClass === null || item.assetClass === undefined) {
            item.assetClass = [];
          }
          if (item.tags === null || item.tags === undefined) {
            item.tags = [];
          }
          if (item.vendorSellPrice && !item.assetClass.includes(VALUATION_TYPE.VSP)) {
            item.assetClass.push(VALUATION_TYPE.VSP);
          }
          if (item.expansion && !item.tags.includes(item.expansion.toLowerCase())) {
            item.tags.push(item.expansion.toLowerCase());
          }
          if (item.professionClass && !item.tags.includes(item.professionClass.toLowerCase())) {
            item.tags.push(item.professionClass.toLowerCase());
          }
          if (item.assetClass) {
            for (const assetClass of item.assetClass) {
              const tag = assetClass.toLowerCase();
              if (!item.tags.includes(tag)) {
                item.tags.push(tag);
              }
            }
          }
          if (item.itemClass && !item.tags.includes(item.itemClass.toLowerCase())) {
            item.tags.push(item.itemClass.toLowerCase());
          }
          if (item.itemSubClass && !item.tags.includes(item.itemSubClass.toLowerCase())) {
            item.tags.push(item.itemSubClass.toLowerCase());
          }
          if (item.quality && !item.tags.includes(item.quality.toLowerCase())) {
            item.tags.push(item.quality.toLowerCase());
          }
          if (item.ticker) {
            const tickerParts = item.ticker.split('.');
            for (const t of tickerParts) {
              const tag = t.toLowerCase();
              if (tag === 'j' || tag === 'petal' || tag === 'nugget') {
                if (!item.tags.includes(tag)) {
                  item.tags.push(tag);
                }
                continue;
              }
              if (!item.tags.includes(tag)) {
                item.tags.push(tag);
              }
            }
          }
          this.logger.debug(`item: ${item.id}, tags: ${item.tags.join(', ')}`);
          await this.itemsRepository.save(item);
        }
        this.logger.debug('tags stage ended');
      }
    } catch (errorOrException) {
      const logTag = 'buildAssetIndex';
      this.logger.error({ logTag, errorOrException });
    }
  }
}
