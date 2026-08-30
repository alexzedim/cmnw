import { setTimeout } from 'node:timers/promises';
import { isEqual } from 'lodash';
import { DateTime } from 'luxon';

/**
 * @description Delay for the selected amount of time in seconds
 * @param seconds {number}
 */
export const delay = async (seconds = 5) => await setTimeout(seconds * 1000);

/**
 * Deep-equality check for analytics values, order-independent. Required because
 * Postgres JSONB may persist keys in a different order than the JS literal we
 * build when computing the value, so JSON.stringify-based comparison would
 * false-negative on semantically-equal payloads.
 */
export const isUnchanged = (a: unknown, b: unknown): boolean => isEqual(a, b);

/**
 * @description Return array of unique strings from object keys or enum.
 * @param obj
 */
export const enumKeys = <O extends object, K extends keyof O = keyof O>(obj: O): K[] =>
  Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];

/**
 * @description Return random integer between minimum and maximum value.
 * @param min {number}
 * @param max {number}
 */
export const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1) + min);

export const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

/**
 * @description Check if guild entity was modified more recently than character entity
 * @param guildLastModified {Date | null | undefined}
 * @param characterLastModified {Date | null | undefined}
 */
export const isGuildUpdateMoreRecent = (
  guildLastModified: Date | null | undefined,
  characterLastModified: Date | null | undefined,
): boolean =>
  guildLastModified != null &&
  characterLastModified != null &&
  guildLastModified.getTime() > characterLastModified.getTime();

/**
 * @description Extract realm slug from Blizzard community guild URL.
 * @param guildUrl {string} e.g. '/guild/eu/some-realm/My Guild/'
 */
export const extractRealmSlug = (guildUrl: string): string | null => {
  const match = guildUrl.match(/\/guild\/[^/]+\/([^/]+)\//);
  return match ? match[1] : null;
};

/**
 * @description Extract numeric id from Blizzard API key href.
 * @param href {string} e.g. 'https://eu.api.blizzard.com/data/wow/realm/1391?namespace=profile-eu'
 */
export const parseIdFromKeyHref = (href: string | undefined): number | null => {
  if (!href) return null;
  const match = href.match(/\/(\d+)(?:\?|$)/);
  return match ? Number(match[1]) : null;
};

/**
 * @description Parse an HTTP Last-Modified header (RFC 2822) into a Date.
 * @param header {unknown} axios header value, guarded to string
 */
export const parseHttpLastModified = (header: unknown): Date | null => {
  if (typeof header !== 'string') return null;
  const parsed = DateTime.fromRFC2822(header);
  return parsed.isValid ? parsed.toJSDate() : null;
};
