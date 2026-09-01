export const SESSION_QUERY_KEY = 'session';

export enum FeedEventCategory {
  CHARACTER = 'character',
  GUILD = 'guild',
  AUCTION = 'auction',
  QUEUE = 'queue',
  SYSTEM = 'system',
}

export enum FeedStatus {
  SUCCESS = 'success',
  PARTIAL = 'partial',
  WARNING = 'warning',
  INFO = 'info',
  NOT_MODIFIED = 'not_modified',
  NOT_FOUND = 'not_found',
  RATE_LIMITED = 'rate_limited',
  SKIPPED = 'skipped',
  ERROR = 'error',
}

export const FEED_EVENT_CATEGORIES: readonly FeedEventCategory[] = Object.values(FeedEventCategory);
export const FEED_STATUSES: readonly FeedStatus[] = Object.values(FeedStatus);

export function isFeedStatus(value: unknown): value is FeedStatus {
  return typeof value === 'string' && (FEED_STATUSES as readonly string[]).includes(value);
}

export function isFeedEventCategory(value: unknown): value is FeedEventCategory {
  return typeof value === 'string' && (FEED_EVENT_CATEGORIES as readonly string[]).includes(value);
}
