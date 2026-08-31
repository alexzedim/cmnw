import type { API_HEADERS_ENUM, TOLERANCE_ENUM, WCL_PAYLOAD_SOURCE } from '@app/resources/constants';

export type LogCharacter = {
  guid: string;
  id: number;
  name: string;
  realmName: string;
  realm: string;
  guildRank: number;
  timestamp: number;
};

export type TransformCharacter = Partial<LogCharacter>;

export type RaidCharacter = Partial<LogCharacter> & Required<Pick<LogCharacter, 'guid' | 'name' | 'realm'>>;

export type Actors = {
  type: 'NPC' | 'Player' | 'Pet';
  name: string;
  server: string | null;
};

export type RankedCharacterServer = {
  id: number;
  name: string;
  normalizedName: string;
  slug: string;
};

export type RankedCharacters = {
  id: number;
  name: string;
  guildRank: number;
  server: RankedCharacterServer;
};

export type RaidLogReport = {
  startTime: number;
  rankedCharacters: Array<RankedCharacters>;
  masterData: { actors: Array<Actors> };
};

export type CharacterRaidLogResponse = {
  reportData: {
    report: RaidLogReport;
  };
};

export type ApiConstParams = {
  header: API_HEADERS_ENUM;
  tolerance: TOLERANCE_ENUM;
  isProxyRandom?: boolean;
  isMultiLocale?: boolean;
  ifModifiedSince?: string;
};

export type FightsAPIFriendly = {
  name: string;
  id: number;
  guid: number;
  type: string;
  server: string;
  region?: string;
  icon: string;
  fights: string;
};

export type FightsAPIResponse = {
  lang: string;
  fights: Array<{ id: number; start_time: number; end_time: number }>;
  friendlies: Array<FightsAPIFriendly>;
  enemies: Array<unknown>;
  friendlyPets: Array<unknown>;
  enemyPets: Array<unknown>;
  abilities: Record<string, unknown>;
  logVersion: number;
  gameVersion: number;
  phases: Array<unknown>;
};

export type WclGraphQLReportBody = {
  data?: CharacterRaidLogResponse;
  errors?: Array<{ message: string }>;
};

export type WclRaidLogPayload = {
  fetchedAt: string;
  source: WCL_PAYLOAD_SOURCE;
  data: FightsAPIResponse | WclGraphQLReportBody;
};

export type WclZoneReportsRow = {
  logId: string;
  startedAt: Date | null;
};

export type WclFetchResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'not_found' }
  | { status: 'blocked' }
  | { status: 'error'; message: string };

export type WclNavigationResult =
  | { status: 'ok'; html: string }
  | { status: 'blocked' }
  | { status: 'error'; message: string };

export type WclDownloadOutcome = 'downloaded' | 'not_found' | 'failed';
