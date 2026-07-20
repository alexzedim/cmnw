import {
  AnalyticsMetricHistoryDto,
  AnalyticsMetricSnapshotDto,
  RaidLogsStatsDto,
  RealmDto,
  SearchQueryDto,
} from '../dto';

export const CACHE_NAMESPACE = 'cmnw:cache' as const;

export const CACHE_PATTERN = {
  ANALYTICS: `${CACHE_NAMESPACE}:analytics:*`,
} as const;

function stableDefinedEntries(value: Record<string, unknown>): Array<[string, string]> {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null);
  const stringEntries: Array<[string, string]> = entries.map(([k, v]) => [
    k,
    v instanceof Date ? v.toISOString() : String(v),
  ]);
  stringEntries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return stringEntries;
}

function buildKey(parts: Array<[string, string]>): string {
  if (parts.length === 0) return 'all';
  return parts.map(([k, v]) => `${k}=${v}`).join('&');
}

export function realmsCacheKey(filter: RealmDto): string {
  return `${CACHE_NAMESPACE}:realms:${buildKey(stableDefinedEntries(filter as unknown as Record<string, unknown>))}`;
}

export function snapshotCacheKey(query: AnalyticsMetricSnapshotDto): string {
  return `${CACHE_NAMESPACE}:analytics:snapshot:${buildKey(
    stableDefinedEntries(query as unknown as Record<string, unknown>),
  )}`;
}

export function historyCacheKey(query: AnalyticsMetricHistoryDto): string {
  return `${CACHE_NAMESPACE}:analytics:history:${buildKey(
    stableDefinedEntries(query as unknown as Record<string, unknown>),
  )}`;
}

export function raidLogsCacheKey(query: RaidLogsStatsDto): string {
  return `${CACHE_NAMESPACE}:raid-logs:${buildKey(stableDefinedEntries(query as unknown as Record<string, unknown>))}`;
}

export function searchCacheKey(query: SearchQueryDto): string {
  return `${CACHE_NAMESPACE}:search:${encodeURIComponent(query.searchQuery)}`;
}
