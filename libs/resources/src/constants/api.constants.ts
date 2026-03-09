import { API_HEADERS_ENUM, DMA_TIMEOUT_TOLERANCE, OSINT_TIMEOUT_TOLERANCE } from '@app/resources';

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

/**
 * API Key status for key pool management
 *
 * Lifecycle: ACTIVE -> RATE_LIMITED (cooldown) -> ACTIVE
 *            ACTIVE -> DISABLED (manual or too many errors)
 */
export enum KEY_STATUS {
  /** Key is available for use */
  ACTIVE = 'ACTIVE',
  /** Key is temporarily in cooldown due to rate limiting */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Key is disabled due to errors or manual intervention */
  DISABLED = 'DISABLED',
  /** Legacy status - keep for backward compatibility during migration */
  FREE = 'FREE',
  /** Legacy status - keep for backward compatibility during migration */
  TAKEN = 'TAKEN',
  /** Legacy status - keep for backward compatibility during migration */
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

/** Maximum consecutive errors before key is disabled */
export const KEY_MAX_CONSECUTIVE_ERRORS = 10;

/** Cooldown duration in minutes after rate limit */
export const KEY_RATE_LIMIT_COOLDOWN_MINUTES = 5;

/** Legacy constant - keep for backward compatibility */
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
