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

export interface IFeedStatusMeta {
  readonly icon: string;
  readonly color: 'green' | 'yellow' | 'blue' | 'cyan' | 'red' | 'magenta';
  readonly statusText: string;
}

export const FEED_STATUS_META: Record<FeedStatus, IFeedStatusMeta> = {
  [FeedStatus.SUCCESS]: { icon: '✓', color: 'green', statusText: '200' },
  [FeedStatus.PARTIAL]: { icon: '⚠', color: 'yellow', statusText: 'partial' },
  [FeedStatus.WARNING]: { icon: '⚠', color: 'yellow', statusText: 'warn' },
  [FeedStatus.INFO]: { icon: 'ℹ', color: 'cyan', statusText: 'info' },
  [FeedStatus.NOT_MODIFIED]: { icon: 'ℹ', color: 'blue', statusText: '304' },
  [FeedStatus.NOT_FOUND]: { icon: 'ℹ', color: 'blue', statusText: '404' },
  [FeedStatus.RATE_LIMITED]: { icon: '⚠', color: 'yellow', statusText: '429' },
  [FeedStatus.SKIPPED]: { icon: '⊘', color: 'yellow', statusText: 'skip' },
  [FeedStatus.ERROR]: { icon: '✗', color: 'red', statusText: 'fail' },
};

export const FEED_EVENT_CATEGORIES: readonly FeedEventCategory[] = Object.values(FeedEventCategory);
export const FEED_STATUSES: readonly FeedStatus[] = Object.values(FeedStatus);

export function isFeedStatus(value: unknown): value is FeedStatus {
  return typeof value === 'string' && (FEED_STATUSES as readonly string[]).includes(value);
}

export function isFeedEventCategory(value: unknown): value is FeedEventCategory {
  return typeof value === 'string' && (FEED_EVENT_CATEGORIES as readonly string[]).includes(value);
}
