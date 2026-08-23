import { MarketEntity, RealmsEntity } from '@app/pg';
import {
  DMA_SOURCE_GOLD,
  FACTION,
  GOLD_ITEM_ENTITY,
  type IGold,
  isGold,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  REALM_NAME_NORMALIZATION,
  round,
} from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { parse } from 'node-html-parser';
import { from, lastValueFrom, toArray } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { In, MoreThan, type Repository } from 'typeorm';

@Injectable()
export class GoldService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GoldService.name, { timestamp: true });

  constructor(
    private httpService: HttpService,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    private readonly realmsCacheService: RealmsCacheService,
  ) {}

  async onApplicationBootstrap() {
    const logTag = this.onApplicationBootstrap.name;
    const cutoff = DateTime.now().minus({ hours: 1 }).toMillis();
    const isGoldPlaced = await this.marketRepository.exists({
      where: { itemId: GOLD_ITEM_ENTITY.id, timestamp: MoreThan(cutoff) },
    });

    if (isGoldPlaced) {
      this.logger.log({
        logTag,
        message: 'Gold orders already placed within the last hour, skipping bootstrap scrape',
      });
      return;
    }

    await this.indexGold();
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexGold(): Promise<void> {
    const logTag = this.indexGold.name;
    try {
      const response = await this.httpService.axiosRef.get<string>(DMA_SOURCE_GOLD);

      const exchangeListingPage = parse(response.data);

      const goldOrders: Array<Partial<IGold>> = [];
      const marketOrders: Array<MarketEntity> = [];
      const realmsEntity = new Map<string, RealmsEntity>([]);
      const connectedRealmIds = new Set<number>();
      const timestamp = DateTime.now().toMillis();

      exchangeListingPage.querySelectorAll('a.tc-item').forEach((element) => {
        const orderId = element.getAttribute('href') ?? '';
        const realm = element.querySelector('.tc-server')?.text ?? '';
        const faction = element.querySelector('.tc-side')?.text ?? '';
        const status = Boolean(element.getAttribute('data-online'));
        const quantity = element.querySelector('.tc-amount')?.text ?? '';
        const owner = element.querySelector('.media-user-name')?.text ?? '';
        const price = element.querySelector('.tc-price div')?.text ?? '';
        goldOrders.push({
          realm,
          faction,
          status,
          quantity,
          owner,
          price,
          orderId,
        });
      });

      const goldMarketEntities = await lastValueFrom(
        from(goldOrders).pipe(
          mergeMap((order) => this.createMarketEntity(order, realmsEntity, connectedRealmIds, timestamp), 5),
          toArray(),
        ),
        { defaultValue: undefined },
      );

      // Filter out null entities before adding to marketOrders
      const validGoldMarketEntities = goldMarketEntities.filter((entity): entity is MarketEntity => entity !== null);

      marketOrders.push(...validGoldMarketEntities);

      const ordersCount = marketOrders.length;

      if (!ordersCount) return;

      const marketEntities = await this.marketRepository.save(marketOrders);
      const marketEntitiesCount = marketEntities.length;

      this.logger.log({
        logTag,
        ordersCount,
        marketEntitiesCount,
        timestamp,
        connectedRealmCount: connectedRealmIds.size,
        message: `Inserted ${marketEntitiesCount} of ${ordersCount} gold orders for timestamp ${timestamp}`,
      });

      // Update only the realms that had gold orders processed
      if (connectedRealmIds.size > 0) {
        await this.realmsRepository.update(
          { connectedRealmId: In(Array.from(connectedRealmIds)) },
          { goldTimestamp: timestamp },
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
        : await this.realmsCacheService.findRealm(normalizedRealmName);

      const connectedRealmId =
        !realmEntity && order.realm === 'Любой' ? REALM_ENTITY_ANY.id : realmEntity ? realmEntity.connectedRealmId : 0;

      const isValid = Boolean(connectedRealmId && order.price && order.quantity);

      if (!isValid) {
        this.logger.warn({
          logTag,
          realm: order.realm,
          normalizedRealm: normalizedRealmName,
          price: order.price,
          quantity: order.quantity,
          message: `Invalid order data for realm: ${order.realm}`,
        });
        return null;
      }

      // Cache using normalized name for consistent lookups
      realmsEntity.set(normalizedRealmName, realmEntity);
      connectedRealmIds.add(realmEntity.connectedRealmId);

      const [_url, orderId] = order.orderId.split('=') || null;
      const price = parseFloat(order.price.replace(/ ₽/g, ''));
      const quantity = parseInt(order.quantity.replace(/\s/g, ''), 10);
      const counterparty = order.owner.replace('\n', '').trim();

      const isGoldValid = isGold({
        orderId,
        price,
        quantity,
        counterparty,
      });

      if (!isGoldValid) {
        this.logger.verbose({
          logTag,
          orderId,
          price,
          quantity,
          counterparty,
          message: `Invalid gold order data for order: ${orderId}`,
        });
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
      const isAlliance = [FACTION.A, 'Альянсa', 'Альянс'].includes(order.faction);

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
