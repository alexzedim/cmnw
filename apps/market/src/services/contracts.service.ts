import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ContractEntity,
  ItemsEntity,
  MarketEntity,
  RealmsEntity,
} from '@app/pg';
import { LessThan, MoreThan, Not, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  CONTRACT_TYPE,
  GOLD_ITEM_ENTITY,
  REALM_ENTITY_ANY,
  getPercentileTypeByItemAndTimestamp,
  IItemOpenInterest,
  IItemPriceAndQuantity,
  isContractArraysEmpty,
  validateContractData,
  WOW_TOKEN_ITEM_ID,
} from '@app/resources';

@Injectable()
export class ContractsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.setCommodityItemsAsContracts();
    await this.buildCommodityTimestampContracts();
  }

  private async setCommodityItemsAsContracts() {
    const logTag = this.setCommodityItemsAsContracts.name;
    try {
      const commodityItems = await this.marketRepository
        .createQueryBuilder('markets')
        .where({ connectedRealmId: REALM_ENTITY_ANY.connectedRealmId })
        .select('markets.item_id', 'itemId')
        .distinct(true)
        .getRawMany<Pick<MarketEntity, 'itemId'>>();

      const commodityItemsIds = commodityItems.map((item) => item.itemId);
      const contractItems = commodityItemsIds.length;

      let updateResult: number;

      const isItemsEmpty = await this.itemsRepository.count({
        where: {
          id: Not(GOLD_ITEM_ENTITY.id),
        },
      });

      if (isItemsEmpty === 0) {
        const items = commodityItemsIds.map((itemId) =>
          this.itemsRepository.create({
            id: itemId,
            hasContracts: true,
          }),
        );

        const itemsWithContracts = await this.itemsRepository.save(items);

        updateResult = itemsWithContracts.length;
      } else {
        const result = await this.itemsRepository
          .createQueryBuilder()
          .update()
          .set({ hasContracts: true })
          .whereInIds(commodityItemsIds)
          .execute();

        updateResult = result.affected || 0;
      }

      this.logger.log({
        logTag,
        contractItems,
        updateResult,
        message: `Set commodity items as contracts: ${contractItems} items, ${updateResult} updated`,
      });

      return updateResult;
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  @Cron('00 10,18 * * *')
  private async buildCommodityTimestampContracts() {
    const logTag = this.buildCommodityTimestampContracts.name;
    try {
      this.logger.log({
        logTag,
        message: 'Building commodity timestamp contracts started',
      });

      const commodityItems = await this.itemsRepository
        .createQueryBuilder('items')
        .where('items.hasContracts = :hasContracts', { hasContracts: true })
        .andWhere('items.id NOT IN (:...itemIds)', {
          itemIds: [GOLD_ITEM_ENTITY.id, WOW_TOKEN_ITEM_ID],
        })
        .select('items.id')
        .getMany();

      const today = DateTime.now();
      const ytd = today.minus({ days: 1 }).toMillis();

      const timestamps = await this.marketRepository
        .createQueryBuilder('markets')
        .where('markets.item_id NOT IN (:...itemIds)', {
          itemIds: [GOLD_ITEM_ENTITY.id, WOW_TOKEN_ITEM_ID],
        })
        .andWhere({
          connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
          timestamp: MoreThan(ytd),
        })
        .select('timestamp')
        .distinct(true)
        .getRawMany<Pick<MarketEntity, 'timestamp'>>();

      const commodityItemsIds = commodityItems.map((item) => item.id);
      const commodityTimestamps = timestamps.map((t) => t.timestamp);

      this.logger.log({
        logTag,
        itemCount: commodityItemsIds.length,
        timestampCount: commodityTimestamps.length,
        today: today.toISO(),
        ytd,
        message: `Processing ${commodityItemsIds.length} items with ${commodityTimestamps.length} timestamps`,
      });

      const isGuard = isContractArraysEmpty(
        commodityTimestamps,
        commodityItemsIds,
      );
      if (isGuard) {
        this.logger.warn({
          logTag,
          message: 'No items or timestamps provided, skipping processing',
        });
        return;
      }

      for (const commodityItemId of commodityItemsIds) {
        await lastValueFrom(
          from(commodityTimestamps).pipe(
            mergeMap(
              (timestamp) =>
                this.getItemContractIntradayData(
                  commodityItemId,
                  timestamp,
                  today,
                ),
              5,
            ),
          ),
        );
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        error: errorOrException,
      });
    }
  }

  @Cron('00 10,18 * * *')
  private async _buildGoldIntradayContracts() {
    const logTag = this._buildGoldIntradayContracts.name;
    try {
      this.logger.log(`${logTag} started`);

      const today = DateTime.now();
      const ytd = today.minus({ days: 1 }).toMillis();

      const realmsEntities = await this.realmsRepository.find({});

      for (const realmEntity of realmsEntities) {
        const timestamps = await this.marketRepository
          .createQueryBuilder('markets')
          .where({
            itemId: GOLD_ITEM_ENTITY.id,
            timestamp: MoreThan(ytd),
            connectedRealmId: realmEntity.connectedRealmId,
          })
          .select('markets.timestamp', 'timestamp')
          .distinct(true)
          .getRawMany<Pick<MarketEntity, 'timestamp'>>();

        const goldTimestamps = timestamps.map((t) => t.timestamp);

        await lastValueFrom(
          from(goldTimestamps).pipe(
            mergeMap(
              (timestamp) =>
                this.getItemContractIntradayData(
                  GOLD_ITEM_ENTITY.id,
                  timestamp,
                  today,
                ),
              5,
            ),
          ),
        );
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        error: errorOrException,
      });
    }
  }

  private async getItemContractIntradayData(
    itemId: number,
    timestamp: number,
    today: DateTime,
    connectedRealmId?: number,
  ) {
    const logTag = this.getItemContractIntradayData.name;
    const isGold = itemId === GOLD_ITEM_ENTITY.id;
    const contractId = `${itemId}-${today.day}.${today.month}@${timestamp}`;

    try {
      // Check if contract exists but don't rely solely on this check for race conditions
      const isContractExists = await this.contractRepository.exists({
        where: {
          id: contractId,
        },
      });

      if (isContractExists) {
        this.logger.debug(`${logTag}: ${contractId} exists`);
        return;
      }

      const itemPriceAndQuantityWhere = isGold
        ? {
            connectedRealmId: connectedRealmId,
            itemId: itemId,
            timestamp: timestamp,
            isOnline: true,
          }
        : {
            itemId: itemId,
            timestamp: timestamp,
          };

      const itemPriceAndQuantity = await this.marketRepository
        .createQueryBuilder('m')
        .where(itemPriceAndQuantityWhere)
        .select('SUM(m.quantity)', 'q')
        .addSelect('MIN(m.price)', 'p')
        .addSelect('COUNT(m.uuid)', 'orders')
        .getRawOne<IItemPriceAndQuantity>();

      const orders = Number(itemPriceAndQuantity.orders);
      const ordersNotEnough = orders < 10;

      if (ordersNotEnough) {
        this.logger.debug(
          `${logTag}: ${contractId} not enough orders for contract representation`,
        );
        return;
      }

      const [percentile50, percentile98] = await Promise.all([
        await getPercentileTypeByItemAndTimestamp(
          this.marketRepository,
          'DISC',
          0.5,
          itemId,
          timestamp,
          isGold,
          connectedRealmId,
        ),
        await getPercentileTypeByItemAndTimestamp(
          this.marketRepository,
          'DISC',
          0.98,
          itemId,
          timestamp,
          isGold,
          connectedRealmId,
        ),
      ]);

      const itemOpenInterestWhere = isGold
        ? {
            connectedRealmId: connectedRealmId,
            itemId: itemId,
            timestamp: timestamp,
            isOnline: true,
          }
        : {
            itemId: itemId,
            timestamp: timestamp,
          };

      itemOpenInterestWhere['price'] = LessThan(percentile98);

      const itemOpenInterest = await this.marketRepository
        .createQueryBuilder('m')
        .where(itemOpenInterestWhere)
        .select('SUM(m.value)', 'oi')
        .getRawOne<IItemOpenInterest>();

      // Validate and convert quantity and openInterest using type guards
      const validation = validateContractData(
        itemPriceAndQuantity.q,
        itemOpenInterest.oi,
      );

      if (!validation.isValid) {
        if (!validation.quantity.isValid) {
          this.logger.error({
            logTag,
            contractId,
            error: validation.quantity.error,
          });
        }

        if (!validation.openInterest.isValid) {
          this.logger.error({
            logTag,
            contractId,
            error: validation.openInterest.error,
          });
        }

        return;
      }

      // Create contract data object with all required fields
      const contractData = {
        id: contractId,
        itemId: itemId,
        connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
        timestamp: timestamp,
        day: today.day,
        week: today.weekNumber,
        month: today.month,
        year: today.year,
        price: itemPriceAndQuantity.p,
        priceMedian: percentile50,
        priceTop: percentile98,
        quantity: validation.quantity.value,
        openInterest: validation.openInterest.value,
        type: CONTRACT_TYPE.T,
      };

      // Use upsert to handle duplicate key conflicts gracefully
      // This prevents the 23505 unique constraint violation errors
      try {
        await this.contractRepository.query(
          `INSERT INTO contracts(
            id, item_id, connected_realm_id, timestamp, day, week, month, year, 
            price, price_median, price_top, quantity, oi, type
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            price = EXCLUDED.price,
            price_median = EXCLUDED.price_median,
            price_top = EXCLUDED.price_top,
            quantity = EXCLUDED.quantity,
            oi = EXCLUDED.oi,
            type = EXCLUDED.type`,
          [
            contractData.id,
            contractData.itemId,
            contractData.connectedRealmId,
            contractData.timestamp,
            contractData.day,
            contractData.week,
            contractData.month,
            contractData.year,
            contractData.price,
            contractData.priceMedian,
            contractData.priceTop,
            contractData.quantity,
            contractData.openInterest,
            contractData.type,
          ],
        );

        this.logger.log(`${logTag}: ${contractId} - upserted successfully`);
      } catch (dbError) {
        // Log the error but don't throw it unless it's something other than a constraint violation
        // that somehow got through
        this.logger.error({
          logTag,
          contractId,
          error: `Upsert failed: ${JSON.stringify(dbError)}`,
        });
        throw dbError;
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        contractId,
        error: JSON.stringify(errorOrException),
      });
    }
  }
}
