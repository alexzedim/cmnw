/**
 * Blizzard API rate limiting configuration
 * Based on Blizzard API limits: 36,000 requests/hour = ~10 req/sec per client
 */
export interface IBlizzardRateLimitConfig {
  /** Maximum tokens in bucket (allows burst) */
  capacity: number;
  /** Tokens added per second */
  refillRate: number;
}

/**
 * Circuit breaker configuration for Blizzard API
 */
export interface IBlizzardCircuitBreakerConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Error percentage threshold to trip circuit */
  errorThresholdPercentage: number;
  /** Time before trying again in milliseconds */
  resetTimeout: number;
  /** Minimum requests before evaluating threshold */
  volumeThreshold: number;
}

/**
 * Retry configuration for Blizzard API
 */
export interface IBlizzardRetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay for exponential backoff in milliseconds */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** HTTP status codes that trigger retry */
  retryableStatusCodes: number[];
}

/**
 * Complete Blizzard API configuration
 */
export interface IBlizzardConfig {
  rateLimit: IBlizzardRateLimitConfig;
  circuitBreaker: IBlizzardCircuitBreakerConfig;
  retry: IBlizzardRetryConfig;
}

/**
 * Blizzard API configuration
 *
 * Environment variables:
 * - BLIZZARD_RATE_CAPACITY: Token bucket capacity (default: 100)
 * - BLIZZARD_RATE_REFILL: Tokens per second (default: 10)
 * - BLIZZARD_CB_TIMEOUT: Circuit breaker timeout ms (default: 30000)
 * - BLIZZARD_CB_ERROR_THRESHOLD: Error % to trip (default: 50)
 * - BLIZZARD_CB_RESET: Time before retry ms (default: 60000)
 * - BLIZZARD_CB_VOLUME: Min requests before evaluating (default: 10)
 * - BLIZZARD_RETRY_MAX: Max retries (default: 3)
 * - BLIZZARD_RETRY_BASE_DELAY: Base delay ms (default: 1000)
 * - BLIZZARD_RETRY_MAX_DELAY: Max delay ms (default: 30000)
 */
export const blizzardConfig: IBlizzardConfig = {
  rateLimit: {
    capacity: parseInt(process.env.BLIZZARD_RATE_CAPACITY || '100', 10),
    refillRate: parseInt(process.env.BLIZZARD_RATE_REFILL || '10', 10),
  },
  circuitBreaker: {
    timeout: parseInt(process.env.BLIZZARD_CB_TIMEOUT || '30000', 10),
    errorThresholdPercentage: parseInt(
      process.env.BLIZZARD_CB_ERROR_THRESHOLD || '50',
      10,
    ),
    resetTimeout: parseInt(process.env.BLIZZARD_CB_RESET || '60000', 10),
    volumeThreshold: parseInt(process.env.BLIZZARD_CB_VOLUME || '10', 10),
  },
  retry: {
    maxRetries: parseInt(process.env.BLIZZARD_RETRY_MAX || '3', 10),
    baseDelayMs: parseInt(process.env.BLIZZARD_RETRY_BASE_DELAY || '1000', 10),
    maxDelayMs: parseInt(process.env.BLIZZARD_RETRY_MAX_DELAY || '30000', 10),
    retryableStatusCodes: [429, 503],
  },
};

/**
 * Default configuration values for code that doesn't use environment variables
 */
export const DEFAULT_BLIZZARD_CONFIG: IBlizzardConfig = {
  rateLimit: {
    capacity: 100,
    refillRate: 10,
  },
  circuitBreaker: {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 10,
  },
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 503],
  },
};
