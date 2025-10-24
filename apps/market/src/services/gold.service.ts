import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { from, lastValueFrom, toArray } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MarketEntity, RealmsEntity } from '@app/pg';
import { Repository, In } from 'typeorm';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import {
  DMA_SOURCE_GOLD,
  FACTION,
  findRealm,
  GOLD_ITEM_ENTITY,
  IGold,
  isGold,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  round,
} from '@app/resources';

// Realm name normalization map for common scraping variations
const REALM_NAME_NORMALIZATION = new Map<string, string>([
  ['Aggra (Portugues)', 'Aggra (Português)'],
  ['Pozzo dell\'Eternita', 'Pozzo dell\'Eternità'],
  ['Marecage de Zangar', 'Marécage de Zangar'],
]);

@Injectable()
export class GoldService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GoldService.name, { timestamp: true });

  constructor(
    private httpService: HttpService,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {}

  async onApplicationBootstrap() {
      await this.indexGold();
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexGold(): Promise<void> {
    const logTag = this.indexGold.name;
    try {
      const response = await this.httpService.axiosRef.get<string>(DMA_SOURCE_GOLD);

      const exchangeListingPage = cheerio.load(response.data);
      const goldListingMarkup = exchangeListingPage.html('a.tc-item');

      const goldOrders: Array<Partial<IGold>> = [];
      const marketOrders: Array<MarketEntity> = [];
      const realmsEntity = new Map<string, RealmsEntity>([]);
      const connectedRealmIds = new Set<number>();
      const timestamp = DateTime.now().toMillis();

      await Promise.allSettled(
        exchangeListingPage(goldListingMarkup).map((_index, element) => {
          const orderId = exchangeListingPage(element).attr('href');
          const realm = exchangeListingPage(element).find('.tc-server').text();
          const faction = exchangeListingPage(element).find('.tc-side').text();
          const status = Boolean(exchangeListingPage(element).attr('data-online'));
          const quantity = exchangeListingPage(element).find('.tc-amount').text();
          const owner = exchangeListingPage(element).find('.media-user-name').text();
          const price = exchangeListingPage(element).find('.tc-price div').text();
          goldOrders.push({
            realm,
            faction,
            status,
            quantity,
            owner,
            price,
            orderId,
          });
        }),
      );

      const goldMarketEntities = await lastValueFrom(
        from(goldOrders).pipe(
          mergeMap((order) =>
            this.createMarketEntity(order, realmsEntity, connectedRealmIds, timestamp), 5),
          toArray()
        ),
      );

      // Filter out null entities before adding to marketOrders
      const validGoldMarketEntities = goldMarketEntities.filter(
        (entity): entity is MarketEntity => entity !== null
      );

      marketOrders.push(...validGoldMarketEntities);

      const ordersCount = marketOrders.length;

      if (!ordersCount) return;

      const marketEntities = await this.marketRepository.save(marketOrders);
      const marketEntitiesCount = marketEntities.length;

      this.logger.log({ logTag, ordersCount, marketEntitiesCount, timestamp, connectedRealmCount: connectedRealmIds.size, message: `Inserted ${marketEntitiesCount} of ${ordersCount} gold orders for timestamp ${timestamp}` });

      // Update only the realms that had gold orders processed
      if (connectedRealmIds.size > 0) {
        await this.realmsRepository.update(
          { connectedRealmId: In(Array.from(connectedRealmIds)) },
          { goldTimestamp: timestamp }
        );
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  private async createMarketEntity(
    order: Partial<IGold>,
    realmsEntity: Map<string, RealmsEntity>,
    connectedRealmIds: Set<number>,
    timestamp: number,
  ): Promise<MarketEntity | null> {
    const logTag = this.createMarketEntity.name;
    try {
      // Normalize realm name to handle accent variations from scraping
      const normalizedRealmName = REALM_NAME_NORMALIZATION.get(order.realm) || order.realm;
      
      const realmEntity = realmsEntity.has(normalizedRealmName)
        ? realmsEntity.get(normalizedRealmName)
        : await findRealm(this.realmsRepository, normalizedRealmName);

      const connectedRealmId =
        !realmEntity && order.realm === 'Любой'
          ? REALM_ENTITY_ANY.id
          : realmEntity
            ? realmEntity.connectedRealmId
            : 0;

      const isValid = Boolean(
        connectedRealmId && order.price && order.quantity,
      );

      if (!isValid) {
        this.logger.warn({ logTag, realm: order.realm, normalizedRealm: normalizedRealmName, price: order.price, quantity: order.quantity, message: `Invalid order data for realm: ${order.realm}` });
        return null;
      }

      // Cache using normalized name for consistent lookups
      realmsEntity.set(normalizedRealmName, realmEntity);
      connectedRealmIds.add(realmEntity.connectedRealmId);

      const [_url, orderId] = order.orderId.split('=') || null;
      const price = parseFloat(order.price.replace(/ ₽/g, ''));
      const quantity = parseInt(order.quantity.replace(/\s/g, ''));
      const counterparty = order.owner.replace('\n', '').trim();

      const isGoldValid = isGold({
        orderId,
        price,
        quantity,
        counterparty,
      });

      if (!isGoldValid) {
        this.logger.debug({ logTag, orderId, price, quantity, counterparty, message: `Invalid gold order data for order: ${orderId}` });
        return null;
      }
      const value = round(price * (quantity / 1000), 2);

      const isQuantityLimit = quantity > 100_000_000;
      if (isQuantityLimit) {
        // this.logger.debug(`${logTag}: Quantity limit exceeded for ${orderId}: ${quantity}`);
        return null;
      }

      let faction = FACTION.ANY;

      const isOnline = order.status;
      const isHorde = [FACTION.H, 'Орда'].includes(order.faction);
      const isAlliance = [FACTION.A, 'Альянсa', 'Альянс'].includes(
        order.faction,
      );

      if (isAlliance) faction = FACTION.A;
      if (isHorde) faction = FACTION.H;

      return this.marketRepository.create({
        connectedRealmId,
        itemId: GOLD_ITEM_ENTITY.id,
        type: MARKET_TYPE.G,
        orderId,
        faction,
        value,
        quantity,
        isOnline,
        counterparty,
        price,
        timestamp,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
      return null;
    }
  }
}
