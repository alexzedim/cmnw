import {
  API_HEADERS_ENUM,
  DMA_TIMEOUT_TOLERANCE,
  OSINT_TIMEOUT_TOLERANCE,
} from '@app/resources';

/**
 * HTTP status codes that indicate rate limiting or API key errors
 * Used for efficient status code checking with Set.has() instead of multiple === comparisons
 *
 * Tracked status codes:
 * - 403 (Forbidden) - Often used by APIs to indicate rate limiting
 * - 429 (Too Many Requests) - Standard rate limit response
 */
export const TRACKED_ERROR_STATUS_CODES = new Set<number>([403, 429]);

export enum TOLERANCE_ENUM {
  DMA = DMA_TIMEOUT_TOLERANCE,
  OSINT = OSINT_TIMEOUT_TOLERANCE,
}

export enum KEY_STATUS {
  FREE = 'FREE',
  TAKEN = 'TAKEN',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

export const KEY_LOCK_ERRORS_NUM = 200;

export const apiConstParams = (
  header: API_HEADERS_ENUM,
  tolerance: TOLERANCE_ENUM = TOLERANCE_ENUM.OSINT,
  isMultiLocale?: boolean,
  ifModifiedSince?: string,
) => ({
  params: isMultiLocale ? {} : { locale: 'en_GB' },
  headers: ifModifiedSince
    ? {
        'Battlenet-Namespace': header,
        'If-Modified-Since': ifModifiedSince,
      }
    : {
        'Battlenet-Namespace': header,
      },
  timeout: tolerance,
});
