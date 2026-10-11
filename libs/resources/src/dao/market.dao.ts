import { marketConfig } from '@app/configuration/market.config';
import { MarketEntity } from '@app/pg';
import type { Repository } from 'typeorm';
import { MARKET_TYPE } from '../constants/dma.constants';
import { REALM_ENTITY_ANY } from '../constants/osint.constants';
import type { IMarketLiveRow, IMarketTimeleftUpdate } from '../utils/market-diff.util';

export interface IMarketPersistDiffArgs {
  connectedRealmId: number;
  timestamp: number;
  type: string;
  fresh: MarketEntity[];
  changed: MarketEntity[];
  timeleftOnly: IMarketTimeleftUpdate[];
  ended: IMarketLiveRow[];
}

// alive at snapshot T of the row's own stream (realm + type scope is added by callers)
export const marketAliveAtSql = (alias: string, param: string): string =>
  `${alias}.valid_from <= :${param} AND (${alias}.valid_to IS NULL OR ${alias}.valid_to > :${param})`;

// order versions alive at any point after the threshold ("seen in window")
export const marketSeenInWindowSql = (alias: string, param: string): string =>
  `(${alias}.valid_to IS NULL OR ${alias}.valid_to > :${param})`;

/**
 * Percentile of price over orders alive at the given snapshot timestamp.
 * Gold aggregates across all realms (type GOLD, online sellers only);
 * commodities are scoped to the cross-realm pseudo-realm (type COMMDTY).
 */
export const getPercentileTypeByItemAndTimestamp = async (
  repository: Repository<MarketEntity>,
  type: 'CONT' | 'DISC',
  percentile: number,
  itemId: number,
  timestamp: number,
  isGold = false,
  connectedRealmId?: number,
): Promise<number> => {
  const streamScope = isGold
    ? connectedRealmId
      ? ` WHERE item_id = $1 AND type = '${MARKET_TYPE.G}' AND valid_from <= $2 AND (valid_to IS NULL OR valid_to > $2) AND is_online = true AND connected_realm_id = $3`
      : ` WHERE item_id = $1 AND type = '${MARKET_TYPE.G}' AND valid_from <= $2 AND (valid_to IS NULL OR valid_to > $2) AND is_online = true`
    : ` WHERE item_id = $1 AND connected_realm_id = ${REALM_ENTITY_ANY.id} AND type = '${MARKET_TYPE.C}' AND valid_from <= $2 AND (valid_to IS NULL OR valid_to > $2)`;

  const query = `
      SELECT PERCENTILE_${type}(${percentile}) WITHIN GROUP (ORDER BY price) as percentile
      FROM market
    ${streamScope}`;

  const params: Array<number> = [itemId, timestamp];
  if (isGold && connectedRealmId) params.push(connectedRealmId);

  const result = await repository.query(query, params);
  return result[0].percentile;
};

/**
 * Calculate the 10th percentile using PERCENTILE_CONT
 * This returns an interpolated value
 */
export const getPercentile95Cont = async (
  repository: Repository<MarketEntity>,
  itemId: number,
  timestamp: number,
): Promise<number> => {
  const queryBuilder = repository
    .createQueryBuilder('markets')
    .select('PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY markets.price)', 'percentile95');

  queryBuilder.where('markets.item_id = :itemId', { itemId: itemId });
  queryBuilder.andWhere('markets.connected_realm_id = :realmId', {
    realmId: REALM_ENTITY_ANY.id,
  });
  queryBuilder.andWhere('markets.type = :type', { type: MARKET_TYPE.C });
  queryBuilder.andWhere(marketAliveAtSql('markets', 'timestamp'), { timestamp });

  const result = await queryBuilder.getRawOne();
  return result.percentile95;
};

export const loadLiveMarketRows = async (
  repository: Repository<MarketEntity>,
  connectedRealmId: number,
  type: string,
): Promise<IMarketLiveRow[]> => {
  const rows = await repository
    .createQueryBuilder('m')
    .select('m.order_id', 'order_id')
    .addSelect('m.type', 'type')
    .addSelect('m.attr_hash', 'attr_hash')
    .addSelect('m.time_left', 'time_left')
    .where('m.connected_realm_id = :realm', { realm: connectedRealmId })
    .andWhere('m.type = :type', { type })
    .andWhere('m.valid_to IS NULL')
    .getRawMany<{ order_id: string; type: string; attr_hash: number; time_left: string | null }>();

  return rows.map((row) => ({
    orderId: row.order_id,
    type: row.type,
    attrHash: Number(row.attr_hash),
    timeLeft: row.time_left ?? null,
  }));
};

export interface IMarketLiveRowWithRealm extends IMarketLiveRow {
  connectedRealmId: number;
}

export const loadLiveMarketRowsForType = async (
  repository: Repository<MarketEntity>,
  type: string,
  connectedRealmIds?: number[],
): Promise<IMarketLiveRowWithRealm[]> => {
  const queryBuilder = repository
    .createQueryBuilder('m')
    .select('m.order_id', 'order_id')
    .addSelect('m.type', 'type')
    .addSelect('m.attr_hash', 'attr_hash')
    .addSelect('m.time_left', 'time_left')
    .addSelect('m.connected_realm_id', 'connected_realm_id')
    .where('m.type = :type', { type })
    .andWhere('m.valid_to IS NULL');

  if (connectedRealmIds?.length) {
    queryBuilder.andWhere('m.connected_realm_id IN (:...realms)', { realms: connectedRealmIds });
  }

  const rows = await queryBuilder.getRawMany<{
    order_id: string;
    type: string;
    attr_hash: number;
    time_left: string | null;
    connected_realm_id: number;
  }>();

  return rows.map((row) => ({
    orderId: row.order_id,
    type: row.type,
    attrHash: Number(row.attr_hash),
    timeLeft: row.time_left ?? null,
    connectedRealmId: row.connected_realm_id,
  }));
};

export const persistMarketDiff = async (
  repository: Repository<MarketEntity>,
  args: IMarketPersistDiffArgs,
): Promise<void> => {
  const { connectedRealmId, timestamp, type, fresh, changed, timeleftOnly, ended } = args;

  const insertable = [...fresh, ...changed];
  for (let offset = 0; offset < insertable.length; offset += marketConfig.diffBatchSize) {
    await repository.insert(insertable.slice(offset, offset + marketConfig.diffBatchSize));
  }

  const closableIds = [...changed.map((order) => order.orderId), ...ended.map((order) => order.orderId)];
  for (let offset = 0; offset < closableIds.length; offset += marketConfig.diffBatchSize) {
    await repository
      .createQueryBuilder()
      .update(MarketEntity)
      .set({ validTo: timestamp })
      .where('connected_realm_id = :realm AND type = :type AND valid_to IS NULL AND order_id IN (:...ids)', {
        realm: connectedRealmId,
        type,
        ids: closableIds.slice(offset, offset + marketConfig.diffBatchSize),
      })
      .execute();
  }

  for (let offset = 0; offset < timeleftOnly.length; offset += 1_000) {
    await updateTimeLeft(repository, connectedRealmId, type, timeleftOnly.slice(offset, offset + 1_000));
  }
};

const updateTimeLeft = async (
  repository: Repository<MarketEntity>,
  connectedRealmId: number,
  type: string,
  updates: IMarketTimeleftUpdate[],
): Promise<void> => {
  const params: Array<string | number | null> = [];

  const tuples = updates
    .map((update) => {
      params.push(update.orderId, update.timeLeft);
      return `($${params.length - 1}::varchar, $${params.length}::varchar)`;
    })
    .join(', ');

  params.push(connectedRealmId, type);

  await repository.query(
    `UPDATE market AS m SET time_left = v.tl
     FROM (VALUES ${tuples}) AS v(order_id, tl)
     WHERE m.connected_realm_id = $${params.length - 1}
       AND m.type = $${params.length}
       AND m.valid_to IS NULL
       AND m.order_id = v.order_id`,
    params,
  );
};
