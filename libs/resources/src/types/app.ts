import { CharactersEntity, GuildsEntity, ItemsEntity, RealmsEntity } from '@app/pg';

export interface AppHealthPayload {
  status: 'ok';
  version: string;
  uptime: string;
  latestMarketTimestamp: number | null;
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
