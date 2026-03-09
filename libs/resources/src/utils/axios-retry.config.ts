/**
 * Configuration interface for axios-retry behavior
 *
 * Defines retry parameters for HTTP requests to external APIs like Blizzard API,
 * supporting exponential backoff with jitter for graceful error recovery.
 */
export interface IAxiosRetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  retries: number;

  /**
   * Base delay in milliseconds for exponential backoff calculation
   * @default 1000
   */
  baseDelayMs: number;

  /**
   * Maximum delay cap in milliseconds to prevent excessive wait times
   * @default 30000
   */
  maxDelayMs: number;

  /**
   * HTTP status codes that should trigger a retry
   * @default [429, 503]
   */
  retryableStatusCodes: number[];
}

/**
 * Default axios-retry configuration optimized for Blizzard API
 *
 * Sensible defaults for handling transient failures and rate limiting:
 * - 3 retries for resilience without excessive delays
 * - 1 second base delay with exponential backoff
 * - 30 second maximum delay cap
 * - Retries on 429 (Too Many Requests) and 503 (Service Unavailable)
 */
export const DEFAULT_AXIOS_RETRY_CONFIG: IAxiosRetryConfig = {
  retries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 503],
};

/**
 * Calculate exponential backoff delay with jitter
 *
 * Implements exponential backoff formula:
 * min(baseDelay * 2^(retryCount-1), maxDelay) + random(0, 500)
 *
 * @param retryCount - Current retry attempt number (1-indexed)
 * @param config - Retry configuration containing delay parameters
 * @returns Delay in milliseconds to wait before next retry
 *
 * @example
 * const delay = createAxiosRetryDelay(1, DEFAULT_AXIOS_RETRY_CONFIG);
 * // Returns ~1000ms + random(0, 500) = 1000-1500ms
 *
 * @example
 * const delay = createAxiosRetryDelay(3, DEFAULT_AXIOS_RETRY_CONFIG);
 * // Returns ~4000ms + random(0, 500) = 4000-4500ms
 */
export function createAxiosRetryDelay(retryCount: number, config: IAxiosRetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, retryCount - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = Math.random() * 500;

  return cappedDelay + jitter;
}

/**
 * Determine if an error should trigger a retry
 *
 * Checks if the HTTP response status code is in the list of retryable status codes.
 *
 * @param error - Axios error object containing response information
 * @param config - Retry configuration containing retryable status codes
 * @returns true if the error should trigger a retry, false otherwise
 *
 * @example
 * const shouldRetry = createAxiosRetryCondition(error, DEFAULT_AXIOS_RETRY_CONFIG);
 * if (shouldRetry) {
 *   // Wait and retry the request
 * }
 */
export function createAxiosRetryCondition(
  error: { response?: { status?: number } },
  config: IAxiosRetryConfig,
): boolean {
  const statusCode = error.response?.status;

  if (statusCode === undefined) {
    return false;
  }

  return config.retryableStatusCodes.includes(statusCode);
}
