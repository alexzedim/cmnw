/**
 * BNet API Response Interfaces for Mythic Keystone-related endpoints
 * Used for typing responses from /data/wow/mythic-keystone/ endpoints
 */

import { ISelfKeyHref, ISelfWithNameAndId, ISelfWithId } from '../osint';

/**
 * Mythic Keystone Dungeon Index Response
 * GET /data/wow/mythic-keystone/dungeon/index
 */
export interface MythicKeystoneDungeonResponse {
  _links: Record<string, ISelfKeyHref>;
  dungeons: ISelfWithNameAndId[];
  lastModified?: string;
}

/**
 * Mythic Keystone Season Response
 * GET /data/wow/mythic-keystone/season/index
 */
export interface MythicKeystoneSeason extends ISelfWithNameAndId {}

export interface MythicKeystoneSeasonResponse {
  _links: Record<string, ISelfKeyHref>;
  seasons: MythicKeystoneSeason[];
  current_season: MythicKeystoneSeason;
  lastModified?: string;
}

/**
 * Mythic Keystone Season Detail Response
 * GET /data/wow/mythic-keystone/season/{seasonId}
 */
export interface MythicKeystoneSeasonPeriod extends ISelfWithId {}

export interface MythicKeystoneSeasonDetail {
  _links: Record<string, ISelfKeyHref>;
  id: number;
  start_timestamp: number;
  end_timestamp?: number;
  periods: MythicKeystoneSeasonPeriod[];
  season_name: string | null;
  lastModified?: string;
}

/**
 * Mythic Leaderboard Response
 * GET /data/wow/connected-realm/{connectedRealmId}/mythic-leaderboard/{dungeonId}/period/{period}
 */
export interface MythicLeaderboardMemberProfile {
  name: string;
  id: number;
  realm: {
    key: ISelfKeyHref;
    id: number;
    slug: string;
  };
}

export interface MythicLeaderboardMemberFaction {
  type: string;
}

export interface MythicLeaderboardMemberSpecialization {
  key: ISelfKeyHref;
  id: number;
}

export interface MythicLeaderboardMember {
  profile: MythicLeaderboardMemberProfile;
  faction: MythicLeaderboardMemberFaction;
  specialization: MythicLeaderboardMemberSpecialization;
}

export interface MythicLeaderboardGroup {
  ranking: number;
  duration: number;
  completed_timestamp: number;
  keystone_level: number;
  members: MythicLeaderboardMember[];
}

export interface MythicLeaderboardKeystoneAffix {
  keystone_affix: {
    key: ISelfKeyHref;
    name: string;
    id: number;
  };
  starting_level: number;
}

export interface MythicLeaderboardResponse {
  _links: {
    self: ISelfKeyHref;
  };
  map: {
    name: string;
    id: number;
  };
  period: number;
  period_start_timestamp: number;
  period_end_timestamp: number;
  connected_realm: ISelfKeyHref;
  leading_groups: MythicLeaderboardGroup[];
  keystone_affixes: MythicLeaderboardKeystoneAffix[];
  map_challenge_mode_id: number;
  name: string;
  lastModified?: string;
}

export interface ILeaderboardRequest {
  connectedRealmId: number;
  dungeonId: number;
  period: number;
}

/**
 * PvP Season Index Response
 * GET /data/wow/pvp-season/index
 */
export interface PvPSeason extends ISelfWithId {}

export interface PvPSeasonIndexResponse {
  _links: Record<string, ISelfKeyHref>;
  seasons: PvPSeason[];
  current_season: PvPSeason;
  lastModified?: string;
}

/**
 * Response aggregation types for use in services
 */
export type IMythicKeystoneDungeonResponse = Readonly<MythicKeystoneDungeonResponse>;

export type IMythicKeystoneSeasonResponse = Readonly<MythicKeystoneSeasonResponse>;

export type IMythicKeystoneSeasonDetail = Readonly<MythicKeystoneSeasonDetail>;

export type IMythicLeaderboardResponse = Readonly<MythicLeaderboardResponse>;

export type IPvPSeasonIndexResponse = Readonly<PvPSeasonIndexResponse>;
