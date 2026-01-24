/**
 * BNet API Response Interfaces for Mythic Keystone-related endpoints
 * Used for typing responses from /data/wow/mythic-keystone/ endpoints
 */

import { ISelfKeyHref, ISelfWithNameAndId } from '../osint';

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
 * Response aggregation types for use in services
 */
export type IMythicKeystoneDungeonResponse =
  Readonly<MythicKeystoneDungeonResponse>;

export type IMythicKeystoneSeasonResponse =
  Readonly<MythicKeystoneSeasonResponse>;
