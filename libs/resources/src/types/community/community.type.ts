import { API_HEADERS_ENUM, TOLERANCE_ENUM } from '@app/resources/constants';

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

export type RaidCharacter = Partial<LogCharacter> &
  Required<Pick<LogCharacter, 'guid' | 'name' | 'realm' | 'timestamp'>>;

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
  rankedCharacters: Array<RankedCharacters>;
  masterData: Array<Actors>;
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
}
