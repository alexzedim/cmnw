import { Logger } from '@nestjs/common';
import chalk from 'chalk';

/**
 * HTTP status codes that indicate rate limiting
 */
export enum RateLimitStatusCode {
  FORBIDDEN = 403,
  TOO_MANY_REQUESTS = 429,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Rate limit headers that may be present in HTTP responses
 */
export interface RateLimitHeaders {
  'retry-after'?: string | number;
  'x-ratelimit-remaining'?: string | number;
  'x-ratelimit-reset'?: string | number;
  'x-ratelimit-limit'?: string | number;
}

/**
 * Result of rate limit detection analysis
 */
export interface RateLimitDetectionResult {
  isRateLimited: boolean;
  statusCode?: number;
  retryAfterMs?: number;
  remainingRequests?: number;
  resetTimeMs?: number;
  detectionSource: 'status-code' | 'header' | 'none';
}

/**
 * Statistics snapshot of the rate limiter state
 */
export interface AdaptiveRateLimiterStats {
  currentDelayMs: number;
  successCount: number;
  rateLimitCount: number;
  totalRequests: number;
  isThrottled: boolean;
  uptime: number;
  averageDelayMs: number;
}

/**
 * Configuration options for AdaptiveRateLimiter
 */
export interface AdaptiveRateLimiterConfig {
  initialDelayMs?: number;
  backoffMultiplier?: number;
  recoveryDivisor?: number;
  successThresholdForRecovery?: number;
  enableJitter?: boolean;
  jitterRangeMs?: number;
}

/**
 * Minimal HTTP response interface for rate limit detection
 * Supports both Axios and native fetch responses
 */
export interface HttpResponse {
  status: number;
  headers?: Record<string, string | number | undefined>;
}

/**
 * Extended response with optional body for error context
 */
export interface HttpResponseWithBody extends HttpResponse {
  data?: any;
  statusText?: string;
}

/**
 * AdaptiveRateLimiter - Sophisticated rate-limiting utility for CMNW microservices
 *
 * Monitors HTTP responses and intelligently adjusts request delays based on rate limit signals.
 * Enables graceful degradation when external APIs (like Blizzard API) enforce rate limits.
 *
 * Key Characteristics:
 * - No min/max bounds on delays (unbounded scaling)
 * - Exponential backoff on rate limit detection (multiply by 1.5)
 * - Gradual recovery on success (divide by 1.1)
 * - Initial delay: 100ms
 * - Header-aware: Monitors Retry-After, X-RateLimit-Remaining, X-RateLimit-Reset
 * - Status code detection: Recognizes 403 (Forbidden), 429 (Too Many Requests), and 503 (Service Unavailable)
 */
export class AdaptiveRateLimiter {
  // Private state variables
  private currentDelayMs: number;
  private readonly initialDelayMs: number;
  private successCount: number = 0;
  private rateLimitCount: number = 0;
  private totalRequests: number = 0;
  private lastRequestTime: number = Date.now();
  private lastRateLimitTime?: number;
  private delayHistory: number[] = [];
  private readonly maxHistorySize: number = 100;

  // Configuration state
  private backoffMultiplier: number;
  private recoveryDivisor: number;
  private successThresholdForRecovery: number;
  private enableJitter: boolean;
  private jitterRangeMs: number;

  // Logger state
  private readonly logger?: Logger;
  private readonly logContext: string = 'AdaptiveRateLimiter';
  private readonly startTime: number = Date.now();

  /**
   * Creates a new AdaptiveRateLimiter instance
   *
   * @param config - Configuration options (all optional, uses sensible defaults)
   * @param logger - Optional NestJS Logger instance for structured logging
   *
   * @example
   * const limiter = new AdaptiveRateLimiter({
   *   initialDelayMs: 100,
   *   backoffMultiplier: 1.5,
   *   recoveryDivisor: 1.1,
   *   successThresholdForRecovery: 5,
   *   enableJitter: true,
   *   jitterRangeMs: 50,
   * });
   */
  constructor(config?: AdaptiveRateLimiterConfig, logger?: Logger) {
    this.logger = logger;

    // Initialize configuration with defaults
    this.initialDelayMs = config?.initialDelayMs ?? 100;
    this.currentDelayMs = this.initialDelayMs;
    this.backoffMultiplier = config?.backoffMultiplier ?? 1.5;
    this.recoveryDivisor = config?.recoveryDivisor ?? 1.1;
    this.successThresholdForRecovery = config?.successThresholdForRecovery ?? 5;
    this.enableJitter = config?.enableJitter ?? true;
    this.jitterRangeMs = config?.jitterRangeMs ?? 50;
  }

  /**
   * Get the current delay in milliseconds
   * Includes optional jitter for distributed request timing
   *
   * @returns Current delay with optional jitter applied
   *
   * @example
   * const delay = limiter.getDelay();
   * await new Promise(resolve => setTimeout(resolve, delay));
   */
  getDelay(): number {
    const baseDelay = this.currentDelayMs;

    if (!this.enableJitter) {
      return baseDelay;
    }

    const jitter = Math.random() * this.jitterRangeMs;
    return baseDelay + jitter;
  }

  /**
   * Get the delay that would be applied without jitter
   * Useful for metrics and monitoring
   *
   * @returns Base delay in milliseconds
   */
  getBaseDelay(): number {
    return this.currentDelayMs;
  }

  /**
   * Wait for the appropriate delay before making the next request
   * Accounts for time already elapsed since last request
   *
   * @returns Promise that resolves after the required delay
   *
   * @example
   * await limiter.wait();
   * const response = await api.call();
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const required = this.getDelay();
    const remaining = Math.max(0, required - elapsed);

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Analyze an HTTP response for rate limit signals
   * Checks both status codes and headers
   *
   * Recognized rate limit status codes:
   * - 403 (Forbidden) - Often used by APIs to indicate rate limiting
   * - 429 (Too Many Requests) - Standard rate limit response
   * - 503 (Service Unavailable) - Server overloaded or rate limited
   *
   * @param response - HTTP response object with status and headers
   * @returns Detection result with detailed information
   *
   * @example
   * const result = limiter.detectRateLimit(response);
   * if (result.isRateLimited) {
   *   limiter.onRateLimit(result);
   * }
   */
  detectRateLimit(response: HttpResponse): RateLimitDetectionResult {
    try {
      // Layer 1: HTTP Status Code Detection
      const isRateLimitStatusCode = this.isRateLimitStatusCode(response.status);
      if (isRateLimitStatusCode) {
        return {
          isRateLimited: true,
          statusCode: response.status,
          detectionSource: 'status-code',
        };
      }

      // Layer 2: Rate Limit Header Detection
      if (response.headers) {
        const headers = this.normalizeHeaders(response.headers);

        // Check for Retry-After header
        if (headers['retry-after'] !== undefined) {
          const retryAfterMs = this.parseRetryAfter(headers['retry-after']);
          if (retryAfterMs !== null) {
            return {
              isRateLimited: true,
              retryAfterMs,
              detectionSource: 'header',
            };
          }
        }

        // Check for X-RateLimit-Remaining: 0
        if (headers['x-ratelimit-remaining'] !== undefined) {
          const remaining = this.parseNumber(headers['x-ratelimit-remaining']);
          if (remaining === 0) {
            const resetTimeMs = this.parseNumber(headers['x-ratelimit-reset']);
            return {
              isRateLimited: true,
              remainingRequests: 0,
              resetTimeMs: resetTimeMs ? resetTimeMs * 1000 : undefined,
              detectionSource: 'header',
            };
          }
        }
      }

      // No rate limit detected
      return {
        isRateLimited: false,
        detectionSource: 'none',
      };
    } catch (error) {
      this.logger?.warn(
        `${chalk.yellow('⚠')} Failed to detect rate limit: ${chalk.dim((error as Error).message)}`,
      );
      return {
        isRateLimited: false,
        detectionSource: 'none',
      };
    }
  }

  /**
   * Record a rate limit event and adjust delay accordingly
   * Exponentially increases delay by backoffMultiplier
   * Resets success counter
   *
   * @param detection - Optional detection result for header-based retry timing
   *
   * @example
   * limiter.onRateLimit();
   * // or with detection result
   * const detection = limiter.detectRateLimit(response);
   * limiter.onRateLimit(detection);
   */
  onRateLimit(detection?: RateLimitDetectionResult): void {
    const previousDelay = this.currentDelayMs;

    // Apply exponential backoff
    this.currentDelayMs = this.currentDelayMs * this.backoffMultiplier;

    // Use Retry-After if available and larger than calculated delay
    if (detection?.retryAfterMs) {
      this.currentDelayMs = Math.max(this.currentDelayMs, detection.retryAfterMs);
    }

    // Reset recovery progress
    this.successCount = 0;
    this.rateLimitCount++;
    this.lastRateLimitTime = Date.now();

    // Add to history
    this.delayHistory.push(this.currentDelayMs);
    if (this.delayHistory.length > this.maxHistorySize) {
      this.delayHistory.shift();
    }

    // Log event
    this.logger?.warn(
      `${chalk.yellow('⚠')} Rate limit detected [${chalk.bold(previousDelay.toFixed(0))}ms → ${chalk.bold(this.currentDelayMs.toFixed(0))}ms] ${chalk.dim(`(${this.rateLimitCount} total)`)}`,
    );
  }

  /**
   * Record a successful request and adjust delay accordingly
   * Gradually decreases delay after successThreshold is reached
   * Resets error counter
   *
   * @example
   * limiter.onSuccess();
   */
  onSuccess(): void {
    this.successCount++;
    this.totalRequests++;

    // Check if threshold reached for recovery
    if (this.successCount >= this.successThresholdForRecovery) {
      const previousDelay = this.currentDelayMs;

      // Apply gradual recovery
      this.currentDelayMs = this.currentDelayMs / this.recoveryDivisor;

      // Reset counter
      this.successCount = 0;

      // Add to history
      this.delayHistory.push(this.currentDelayMs);
      if (this.delayHistory.length > this.maxHistorySize) {
        this.delayHistory.shift();
      }

      // Check if fully recovered
      if (Math.abs(this.currentDelayMs - this.initialDelayMs) < 1) {
        this.currentDelayMs = this.initialDelayMs;
        this.logger?.log(
          `${chalk.green('✓')} Recovered to initial delay [${chalk.bold(this.initialDelayMs)}ms]`,
        );
      } else {
        this.logger?.log(
          `${chalk.green('✓')} Recovery in progress [${chalk.bold(previousDelay.toFixed(0))}ms → ${chalk.bold(this.currentDelayMs.toFixed(0))}ms]`,
        );
      }
    }
  }

  /**
   * Convenience method: detect rate limit and handle in one call
   * Combines detectRateLimit() and onRateLimit()
   *
   * @param response - HTTP response to analyze
   * @returns true if rate limit was detected and handled
   *
   * @example
   * if (limiter.handleResponse(response)) {
   *   // Rate limit detected, delay will be increased
   * }
   */
  handleResponse(response: HttpResponse): boolean {
    const detection = this.detectRateLimit(response);

    if (detection.isRateLimited) {
      this.onRateLimit(detection);
      return true;
    }

    this.onSuccess();
    return false;
  }

  /**
   * Get current statistics snapshot
   *
   * @returns Statistics object with current state
   *
   * @example
   * const stats = limiter.getStats();
   * console.log(`Current delay: ${stats.currentDelayMs}ms`);
   * console.log(`Success rate: ${stats.successCount}/${stats.totalRequests}`);
   */
  getStats(): AdaptiveRateLimiterStats {
    const averageDelayMs =
      this.delayHistory.length > 0
        ? this.delayHistory.reduce((a, b) => a + b, 0) / this.delayHistory.length
        : this.currentDelayMs;

    return {
      currentDelayMs: this.currentDelayMs,
      successCount: this.successCount,
      rateLimitCount: this.rateLimitCount,
      totalRequests: this.totalRequests,
      isThrottled: this.isThrottled(),
      uptime: Date.now() - this.startTime,
      averageDelayMs,
    };
  }

  /**
   * Reset to initial state
   * Clears all counters and resets delay to initial value
   *
   * @example
   * limiter.reset();
   */
  reset(): void {
    this.currentDelayMs = this.initialDelayMs;
    this.successCount = 0;
    this.rateLimitCount = 0;
    this.totalRequests = 0;
    this.delayHistory = [];
    this.lastRequestTime = Date.now();
    this.lastRateLimitTime = undefined;

    this.logger?.log(
      `${chalk.cyan('ℹ')} Rate limiter reset to initial state [${chalk.bold(this.initialDelayMs)}ms]`,
    );
  }

  /**
   * Check if currently throttled (delay > 2x initial delay)
   *
   * @returns true if significantly throttled
   */
  isThrottled(): boolean {
    return this.currentDelayMs > this.initialDelayMs * 2;
  }

  /**
   * Update configuration at runtime
   * Allows dynamic adjustment of backoff parameters
   *
   * @param config - Partial configuration to merge with current
   *
   * @example
   * limiter.updateConfig({
   *   backoffMultiplier: 2.0,
   *   successThresholdForRecovery: 10,
   * });
   */
  updateConfig(config: Partial<AdaptiveRateLimiterConfig>): void {
    if (config.backoffMultiplier !== undefined) {
      this.backoffMultiplier = config.backoffMultiplier;
    }
    if (config.recoveryDivisor !== undefined) {
      this.recoveryDivisor = config.recoveryDivisor;
    }
    if (config.successThresholdForRecovery !== undefined) {
      this.successThresholdForRecovery = config.successThresholdForRecovery;
    }
    if (config.enableJitter !== undefined) {
      this.enableJitter = config.enableJitter;
    }
    if (config.jitterRangeMs !== undefined) {
      this.jitterRangeMs = config.jitterRangeMs;
    }

    this.logger?.log(`${chalk.cyan('ℹ')} Rate limiter configuration updated`);
  }

  /**
   * Log current statistics (called periodically or on demand)
   */
  logStats(): void {
    const stats = this.getStats();

    this.logger?.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 RATE LIMITER STATS')}\n` +
        `${chalk.dim('  Current Delay:')} ${chalk.bold(stats.currentDelayMs.toFixed(0))}ms\n` +
        `${chalk.green('  ✓ Successes:')} ${chalk.green.bold(stats.successCount)}\n` +
        `${chalk.yellow('  ⚠ Rate Limits:')} ${chalk.yellow.bold(stats.rateLimitCount)}\n` +
        `${chalk.dim('  Total Requests:')} ${chalk.bold(stats.totalRequests)}\n` +
        `${chalk.dim('  Throttled:')} ${chalk.bold(stats.isThrottled ? 'YES' : 'NO')}\n` +
        `${chalk.dim('  Average Delay:')} ${chalk.bold(stats.averageDelayMs.toFixed(0))}ms\n` +
        `${chalk.magenta.bold('━'.repeat(60))}\n`,
    );
  }

  /**
   * Normalize headers to lowercase for case-insensitive matching
   */
  private normalizeHeaders(
    headers: Record<string, string | number | undefined>,
  ): Record<string, string | number | undefined> {
    const normalized: Record<string, string | number | undefined> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        normalized[key.toLowerCase()] = value;
      }
    }

    return normalized;
  }

  /**
   * Safely parse Retry-After header
   * Returns milliseconds to wait, or null if parsing fails
   */
  private parseRetryAfter(value: string | number | undefined): number | null {
    if (!value) return null;

    try {
      // If numeric string or number, treat as seconds
      if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        return parseInt(String(value)) * 1000;
      }

      // If HTTP-date, parse and calculate milliseconds
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
      }

      return null;
    } catch (error) {
      this.logger?.warn(
        `${chalk.yellow('⚠')} Failed to parse Retry-After header: ${chalk.dim((error as Error).message)}`,
      );
      return null;
    }
  }

  /**
   * Safely parse a value as a number
   */
  private parseNumber(value: string | number | undefined): number | null {
    if (value === undefined || value === null) return null;

    try {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a status code indicates rate limiting
   * Extracted for improved readability and reusability
   *
   * @param statusCode - HTTP status code to check
   * @returns true if the status code indicates rate limiting
   *
   * @private
   */
  private isRateLimitStatusCode(statusCode: number): boolean {
    return (
      statusCode === RateLimitStatusCode.FORBIDDEN ||
      statusCode === RateLimitStatusCode.TOO_MANY_REQUESTS ||
      statusCode === RateLimitStatusCode.SERVICE_UNAVAILABLE
    );
  }
}
