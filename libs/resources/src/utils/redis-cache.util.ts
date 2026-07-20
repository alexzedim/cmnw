import type Redis from 'ioredis';

export interface ReadThroughCacheOptions {
  ttlSeconds: number;
  cacheNull?: boolean;
}

export type CacheLogger = (message: string) => void;

export async function readThroughCache<T>(
  redis: Redis,
  key: string,
  options: ReadThroughCacheOptions,
  loader: () => Promise<T>,
  logger?: CacheLogger,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (errorOrException) {
    logger?.(formatCacheWarn(key, 'read', errorOrException));
  }

  const value = await loader();

  const shouldCache = options.cacheNull !== false || value !== null;
  if (!shouldCache) return value;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', options.ttlSeconds);
  } catch (errorOrException) {
    logger?.(formatCacheWarn(key, 'write', errorOrException));
  }

  return value;
}

export async function invalidateCachePattern(redis: Redis, pattern: string, logger?: CacheLogger): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    await redis.del(...keys);
    return keys.length;
  } catch (errorOrException) {
    logger?.(formatCacheWarn(pattern, 'invalidate', errorOrException));
    return 0;
  }
}

function formatCacheWarn(
  keyOrPattern: string,
  operation: 'read' | 'write' | 'invalidate',
  errorOrException: unknown,
): string {
  const message = errorOrException instanceof Error ? errorOrException.message : String(errorOrException);

  return `redis cache ${operation} failed for ${keyOrPattern}: ${message}`;
}
