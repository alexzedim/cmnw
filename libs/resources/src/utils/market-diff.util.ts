import { hash32 } from 'farmhash';

export interface IMarketVersionAttrs {
  itemId: number;
  price: number;
  bid: number | null;
  context: number | null;
  bonusList: number[] | null;
  modifiers: unknown;
  petList: unknown;
  quantity: number;
  value: number | null;
  faction: string | null;
  counterparty: string | null;
  isOnline: boolean | null;
}

export interface IMarketLiveRow {
  orderId: string;
  type: string;
  attrHash: number;
  timeLeft: string | null;
}

export interface IMarketIncomingOrder {
  orderId: string;
  type: string;
  attrHash: number;
  timeLeft?: string | null;
}

export interface IMarketTimeleftUpdate {
  orderId: string;
  type: string;
  timeLeft: string | null;
}

export interface IMarketDiffResult<T> {
  fresh: T[];
  changed: T[];
  timeleftOnly: IMarketTimeleftUpdate[];
  ended: IMarketLiveRow[];
}

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `"${key}":${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const computeAttrHash = (attrs: Partial<IMarketVersionAttrs>): number => {
  return hash32(stableStringify(attrs));
};

export interface IMarketHashInput {
  itemId: number;
  price: number;
  bid?: number | null;
  context?: number | null;
  bonusList?: number[] | null;
  modifiers?: unknown;
  petList?: unknown;
  quantity?: number | null;
  value?: number | null;
  faction?: string | null;
  counterparty?: string | null;
  isOnline?: boolean | null;
}

export const computeMarketRowAttrHash = (row: IMarketHashInput): number =>
  computeAttrHash({
    itemId: row.itemId,
    price: row.price,
    bid: row.bid ?? null,
    context: row.context ?? null,
    bonusList: row.bonusList ?? null,
    modifiers: row.modifiers ?? null,
    petList: row.petList ?? null,
    quantity: row.quantity ?? null,
    value: row.value ?? null,
    faction: row.faction ?? null,
    counterparty: row.counterparty ?? null,
    isOnline: row.isOnline ?? null,
  });

export const diffSnapshot = <T extends IMarketIncomingOrder>(
  liveRows: IMarketLiveRow[],
  incoming: T[],
): IMarketDiffResult<T> => {
  const liveByKey = new Map<string, IMarketLiveRow>();
  for (const row of liveRows) {
    liveByKey.set(`${row.type}:${row.orderId}`, row);
  }

  const incomingKeys = new Set<string>();
  const fresh: T[] = [];
  const changed: T[] = [];
  const timeleftOnly: IMarketTimeleftUpdate[] = [];

  for (const order of incoming) {
    const key = `${order.type}:${order.orderId}`;
    incomingKeys.add(key);

    const live = liveByKey.get(key);
    if (!live) {
      fresh.push(order);
      continue;
    }

    if (live.attrHash !== order.attrHash) {
      changed.push(order);
      continue;
    }

    if ((live.timeLeft ?? null) !== (order.timeLeft ?? null)) {
      timeleftOnly.push({ orderId: order.orderId, type: order.type, timeLeft: order.timeLeft });
    }
  }

  const ended = liveRows.filter((row) => !incomingKeys.has(`${row.type}:${row.orderId}`));

  return { fresh, changed, timeleftOnly, ended };
};
