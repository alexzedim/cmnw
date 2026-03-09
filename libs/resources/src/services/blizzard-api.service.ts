import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import chalk from 'chalk';

import { AdaptiveRateLimiter, HttpResponse } from '../utils/adaptive-rate-limiter';

/**
 * Configuration options for creating a BlizzAPI client
 */
export interface IBlizzardApiServiceConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  region?: 'us' | 'eu' | 'kr' | 'tw' | 'cn';
}

/**
 * BlizzardApiService - NestJS service wrapping BlizzAPI with rate limiting and retry capabilities
 *
 * Provides:
 * - Per-clientId rate limiting using AdaptiveRateLimiter
 * - Automatic retry on 429 (Too Many Requests) responses
 * - Centralized BlizzAPI client creation
 * - Request queuing with adaptive delays
 */
@Injectable()
export class BlizzardApiService {
  private readonly logger = new Logger(BlizzardApiService.name, {
    timestamp: true,
  });
  private readonly rateLimiters = new Map<string, AdaptiveRateLimiter>();

  /**
   * Gets or creates an AdaptiveRateLimiter for a specific clientId
   * Each clientId gets its own rate limiter to handle per-client rate limits
   *
   * @param clientId - The Blizzard API client ID
   * @returns AdaptiveRateLimiter instance for the clientId
   */
  getRateLimiter(clientId: string): AdaptiveRateLimiter {
    let limiter = this.rateLimiters.get(clientId);

    if (!limiter) {
      limiter = new AdaptiveRateLimiter(
        {
          initialDelayMs: 100,
          backoffMultiplier: 1.5,
          recoveryDivisor: 1.1,
        },
        this.logger,
      );
      this.rateLimiters.set(clientId, limiter);
      this.logger.log(
        `${chalk.cyan('ℹ')} Created rate limiter for client` +
          ` [${chalk.dim(clientId.substring(0, 8))}...]`,
      );
    }

    return limiter;
  }

  /**
   * Creates a configured BlizzAPI instance
   *
   * @param config - Configuration options for the BlizzAPI client
   * @returns Configured BlizzAPI instance
   */
  createClient(config: IBlizzardApiServiceConfig): BlizzAPI {
    const region = config.region ?? 'eu';

    const client = new BlizzAPI({
      region,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accessToken: config.accessToken,
    });

    this.logger.log(
      `${chalk.green('✓')} Created BlizzAPI client [${chalk.bold(region.toUpperCase())}]`,
    );

    return client;
  }

  /**
   * Executes a BlizzAPI query with rate limiting and automatic retry handling
   *
   * @param BNet - BlizzAPI client instance
   * @param endpoint - API endpoint to query
   * @param params - Optional query parameters
   * @param clientId - Optional clientId for per-client rate limiting
   * @param maxRetries - Maximum number of retries on rate limit (default: 3)
   * @returns Promise resolving to the API response data
   */
  async queryWithRetry<T>(
    BNet: BlizzAPI,
    endpoint: string,
    params?: Record<string, unknown>,
    clientId?: string,
    maxRetries: number = 3,
  ): Promise<T> {
    const limiterKey = clientId ?? 'default';
    const rateLimiter = this.getRateLimiter(limiterKey);

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      await rateLimiter.wait();

      const startTime = Date.now();

      try {
        const response = await BNet.query<T>(endpoint, params);
        const duration = Date.now() - startTime;

        if (this.isResponseError(response)) {
          const httpResponse: HttpResponse = {
            status: 401,
            headers: {},
          };

          rateLimiter.handleResponse(httpResponse);

          this.logger.warn(
            `${chalk.yellow('⚠')} Token error on ${chalk.dim(endpoint)}:` +
              ` ${chalk.bold((response as { error: string }).error)}`,
          );

          throw new Error(
            `Blizzard API error: ${(response as { error: string }).error}`,
          );
        }

        const httpResponse: HttpResponse = {
          status: 200,
          headers: {},
        };

        const wasRateLimited = rateLimiter.handleResponse(httpResponse);

        if (wasRateLimited) {
          this.logger.warn(
            `${chalk.yellow('⚠')} Rate limited on ${chalk.dim(endpoint)}` +
              ` ${chalk.dim(`(${duration}ms)`)}`,
          );
          retryCount++;
          continue;
        }

        this.logger.log(
          `${chalk.green('✓')} Query ${chalk.dim(endpoint)} ${chalk.dim(`(${duration}ms)`)}`,
        );

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const axiosError = error as {
          response?: { status: number; headers?: Record<string, string> };
          message: string;
        };
        const status = axiosError.response?.status;

        if (status === 429 || status === 403 || status === 503) {
          const httpResponse: HttpResponse = {
            status,
            headers: axiosError.response?.headers,
          };

          rateLimiter.handleResponse(httpResponse);

          retryCount++;
          lastError = error as Error;

          this.logger.warn(
            `${chalk.yellow('⚠')} Rate limit error [${chalk.bold(status)}] on` +
              ` ${chalk.dim(endpoint)} ${chalk.dim(`(${duration}ms)`)} - retry` +
              ` ${chalk.bold(retryCount)}/${chalk.bold(maxRetries)}`,
          );

          if (retryCount <= maxRetries) {
            continue;
          }
        }

        this.logger.error(
          `${chalk.red('✗')} Query failed ${chalk.dim(endpoint)}` +
            ` ${chalk.dim(`(${duration}ms)`)} - ${axiosError.message}`,
        );

        throw error;
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  /**
   * Type guard to check if response is a ResponseError
   */
  private isResponseError(response: unknown): response is { error: string } {
    return (
      response !== null &&
      typeof response === 'object' &&
      'error' in response &&
      typeof (response as { error: unknown }).error === 'string'
    );
  }

  /**
   * Gets statistics for all rate limiters
   *
   * @returns Map of clientId to rate limiter statistics
   */
  getAllRateLimiterStats(): Map<
    string,
    ReturnType<AdaptiveRateLimiter['getStats']>
  > {
    const stats = new Map<string, ReturnType<AdaptiveRateLimiter['getStats']>>();

    for (const [clientId, limiter] of this.rateLimiters) {
      stats.set(clientId, limiter.getStats());
    }

    return stats;
  }

  /**
   * Resets all rate limiters to initial state
   */
  resetAllRateLimiters(): void {
    for (const [clientId, limiter] of this.rateLimiters) {
      limiter.reset();
      this.logger.log(
        `${chalk.cyan('ℹ')} Reset rate limiter for client` +
          ` [${chalk.dim(clientId.substring(0, 8))}...]`,
      );
    }
  }

  /**
   * Clears all rate limiters (removes them from memory)
   */
  clearAllRateLimiters(): void {
    this.rateLimiters.clear();
    this.logger.log(`${chalk.cyan('ℹ')} Cleared all rate limiters`);
  }
}
