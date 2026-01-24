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
 * Response aggregation types for use in services
 */
export type IMythicKeystoneDungeonResponse =
  Readonly<MythicKeystoneDungeonResponse>;
