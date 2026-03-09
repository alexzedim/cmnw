import { AdaptiveRateLimiterConfig } from '../utils/adaptive-rate-limiter';

/**
 * Re-export the AdaptiveRateLimiterConfig type for convenience
 */
export type RateLimiterConfig = Omit<AdaptiveRateLimiterConfig, never>;

/**
 * Default rate limiter configuration for standard API interactions
 *
 * @property initialDelayMs - Starting delay between requests in milliseconds
 * @property backoffMultiplier - Factor to multiply delay by on rate limit detection
 * @property recoveryDivisor - Factor to divide delay by on successful requests
 * @property successThresholdForRecovery - Number of consecutive successes before recovery begins
 * @property enableJitter - Whether to add random variation to delays
 * @property jitterRangeMs - Maximum random variation in milliseconds (+/-)
 * @property maxDelayMs - Maximum allowed delay cap in milliseconds
 */
export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig & {
  maxDelayMs: number;
} = {
  initialDelayMs: 100,
  backoffMultiplier: 1.5,
  recoveryDivisor: 1.1,
  successThresholdForRecovery: 5,
  enableJitter: true,
  jitterRangeMs: 50,
  maxDelayMs: 60000,
};

/**
 * Rate limiter configuration for Warcraft Logs API
 *
 * Uses more aggressive rate limiting due to WCL's stricter limits:
 * - Higher initial delay (2000ms vs 100ms)
 * - Higher max delay cap (120s vs 60s)
 * - Larger jitter range for better distribution
 *
 * @property initialDelayMs - Starting delay between requests in milliseconds
 * @property backoffMultiplier - Factor to multiply delay by on rate limit detection
 * @property recoveryDivisor - Factor to divide delay by on successful requests
 * @property successThresholdForRecovery - Number of consecutive successes before recovery begins
 * @property enableJitter - Whether to add random variation to delays
 * @property jitterRangeMs - Maximum random variation in milliseconds (+/-)
 * @property maxDelayMs - Maximum allowed delay cap in milliseconds
 */
export const WCL_RATE_LIMITER_CONFIG: RateLimiterConfig & {
  maxDelayMs: number;
} = {
  initialDelayMs: 2000,
  backoffMultiplier: 1.5,
  recoveryDivisor: 1.1,
  successThresholdForRecovery: 5,
  enableJitter: true,
  jitterRangeMs: 100,
  maxDelayMs: 120000,
};
