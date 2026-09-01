import type { CharactersEntity, GuildsEntity, ItemsEntity, RealmsEntity } from '@app/pg';

export interface AppHealthPayload {
  status: 'ok';
  version: string;
  uptime: string;
  latestMarketTimestamp: number | null;
}

/**
 * One recently-updated entity rendered as a payload chip by the home
 * backdrop flow schemas (label is prebuilt server-side).
 */
export interface IBackdropFlowPayload {
  readonly guid: string;
  readonly label: string;
}

/** Payload pools for the home backdrop, sampled by entity recency. */
export interface IBackdropFlows {
  readonly characters: IBackdropFlowPayload[];
  readonly guilds: IBackdropFlowPayload[];
  readonly orders: IBackdropFlowPayload[];
}

export interface IRaidLogsStats {
  realmSlug: string | null;
  total: number;
  indexed: number;
  notIndexed: number;
}

export interface ISearchResult {
  characters: CharactersEntity[];
  guilds: GuildsEntity[];
  items: ItemsEntity[];
  realms: RealmsEntity[];
  hashMatches: { count: number };
}
