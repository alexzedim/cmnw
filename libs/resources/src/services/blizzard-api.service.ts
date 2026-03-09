import { Injectable, Logger, Optional } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import chalk from 'chalk';
import Redis from 'ioredis';

import { DEFAULT_RATE_LIMITER_CONFIG } from '../config/rate-limiter.config';
import {
  AdaptiveRateLimiter,
  HttpResponse,
} from '../utils/adaptive-rate-limiter';
import {
  createAxiosRetryCondition,
  createAxiosRetryDelay,
  DEFAULT_AXIOS_RETRY_CONFIG,
  IAxiosRetryConfig,
} from '../utils/axios-retry.config';
import {
  BlizzardRateLimiterService,
  RateLimiterMode,
} from './blizzard-rate-limiter.service';

export interface IBlizzardApiServiceConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  region?: 'us' | 'eu' | 'kr' | 'tw' | 'cn';
}

export interface IRateLimiterOptions {
  enabled?: boolean;
  mode?: RateLimiterMode;
}

export interface ICreateClientOptions {
  retryConfig?: Partial<IAxiosRetryConfig>;
  rateLimiter?: IRateLimiterOptions;
}

@Injectable()
export class BlizzardApiService {
  private readonly logger = new Logger(BlizzardApiService.name, {
    timestamp: true,
  });
  private readonly rateLimiters = new Map<string, AdaptiveRateLimiter>();
  private readonly proactiveRateLimiters = new Map<
    string,
    BlizzardRateLimiterService
  >();
  private readonly redisAvailable: boolean;

  constructor(@Optional() private readonly redis?: Redis) {
    this.redisAvailable = redis !== undefined && redis !== null;

    if (this.redisAvailable) {
      this.logger.log(
        `${chalk.green('✓')} Redis available - proactive rate limiting enabled`,
      );
    } else {
      this.logger.log(
        `${chalk.yellow('⚠')} Redis not available - using reactive rate limiting only`,
      );
    }
  }

  getRateLimiter(clientId: string): AdaptiveRateLimiter {
    let limiter = this.rateLimiters.get(clientId);

    if (!limiter) {
      limiter = new AdaptiveRateLimiter(
        DEFAULT_RATE_LIMITER_CONFIG,
        this.logger,
      );
      this.rateLimiters.set(clientId, limiter);
      this.logger.log(
        `${chalk.cyan('ℹ')} Created reactive rate limiter for client` +
          ` [${chalk.dim(clientId.substring(0, 8))}...]`,
      );
    }

    return limiter;
  }

  getProactiveRateLimiter(clientId: string): BlizzardRateLimiterService | null {
    if (!this.redisAvailable) {
      return null;
    }

    let limiter = this.proactiveRateLimiters.get(clientId);

    if (!limiter) {
      limiter = new BlizzardRateLimiterService(this.redis!);
      this.proactiveRateLimiters.set(clientId, limiter);
      this.logger.log(
        `${chalk.green('✓')} Created proactive rate limiter for client` +
          ` [${chalk.dim(clientId.substring(0, 8))}...]`,
      );
    }

    return limiter;
  }

  createClient(
    config: IBlizzardApiServiceConfig,
    retryConfig?: Partial<IAxiosRetryConfig>,
  ): BlizzAPI;
  createClient(
    config: IBlizzardApiServiceConfig,
    options?: ICreateClientOptions,
  ): BlizzAPI;
  createClient(
    config: IBlizzardApiServiceConfig,
    optionsOrRetryConfig?: Partial<IAxiosRetryConfig> | ICreateClientOptions,
  ): BlizzAPI {
    const region = config.region ?? 'eu';

    let retryConfig: Partial<IAxiosRetryConfig>;
    let rateLimiterOptions: IRateLimiterOptions | undefined;

    if (optionsOrRetryConfig && 'retryConfig' in optionsOrRetryConfig) {
      retryConfig = optionsOrRetryConfig.retryConfig ?? {};
      rateLimiterOptions = optionsOrRetryConfig.rateLimiter;
    } else {
      retryConfig = (optionsOrRetryConfig as Partial<IAxiosRetryConfig>) ?? {};
    }

    const client = new BlizzAPI({
      region,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accessToken: config.accessToken,
    });

    const mergedRetryConfig: IAxiosRetryConfig = {
      ...DEFAULT_AXIOS_RETRY_CONFIG,
      ...retryConfig,
    };

    const axiosInstance = (client as unknown as { axios: AxiosInstance }).axios;

    axiosRetry(axiosInstance, {
      retries: mergedRetryConfig.retries,
      retryDelay: (retryCount) =>
        createAxiosRetryDelay(retryCount, mergedRetryConfig),
      retryCondition: (error) =>
        createAxiosRetryCondition(error, mergedRetryConfig),
    });

    const rateLimiterEnabled = rateLimiterOptions?.enabled ?? true;
    const rateLimiterMode =
      rateLimiterOptions?.mode ??
      (this.redisAvailable ? RateLimiterMode.HYBRID : RateLimiterMode.REACTIVE);

    this.logger.log(
      `${chalk.green('✓')} Created BlizzAPI client [${chalk.bold(region.toUpperCase())}]` +
        ` with axios-retry [${chalk.dim(`retries=${mergedRetryConfig.retries}`)}]` +
        ` rate-limiter [${chalk.dim(`${rateLimiterEnabled ? rateLimiterMode : 'disabled'}`)}]`,
    );

    return client;
  }

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

  async queryWithProactiveRateLimit<T>(
    BNet: BlizzAPI,
    endpoint: string,
    params?: Record<string, unknown>,
    clientId?: string,
    maxRetries: number = 3,
  ): Promise<T> {
    const limiterKey = clientId ?? 'default';

    if (!this.redisAvailable) {
      return this.queryWithRetry(BNet, endpoint, params, clientId, maxRetries);
    }

    const proactiveLimiter = this.getProactiveRateLimiter(limiterKey);

    if (!proactiveLimiter) {
      return this.queryWithRetry(BNet, endpoint, params, clientId, maxRetries);
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      const tokenResult = await proactiveLimiter.waitForToken(limiterKey);

      if (!tokenResult.allowed && tokenResult.waitTimeMs > 0) {
        this.logger.log(
          `${chalk.cyan('⏳')} Rate limit: waiting ${chalk.bold(tokenResult.waitTimeMs)}ms ` +
            `[${chalk.dim(`remaining=${tokenResult.remaining}`)}]`,
        );
      }

      const startTime = Date.now();

      try {
        const response = await BNet.query<T>(endpoint, params);
        const duration = Date.now() - startTime;

        if (this.isResponseError(response)) {
          proactiveLimiter.recordResponse(limiterKey, {
            status: 401,
            headers: {},
          });

          this.logger.warn(
            `${chalk.yellow('⚠')} Token error on ${chalk.dim(endpoint)}:` +
              ` ${chalk.bold((response as { error: string }).error)}`,
          );

          throw new Error(
            `Blizzard API error: ${(response as { error: string }).error}`,
          );
        }

        proactiveLimiter.recordResponse(limiterKey, {
          status: 200,
          headers: {},
        });

        this.logger.log(
          `${chalk.green('✓')} Query ${chalk.dim(endpoint)} ${chalk.dim(`(${duration}ms)`)}` +
            ` [${chalk.dim(`tokens=${tokenResult.remaining}`)}]`,
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
          proactiveLimiter.recordResponse(limiterKey, {
            status,
            headers: axiosError.response?.headers,
          });

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

  private isResponseError(response: unknown): response is { error: string } {
    return (
      response !== null &&
      typeof response === 'object' &&
      'error' in response &&
      typeof (response as { error: unknown }).error === 'string'
    );
  }

  getAllRateLimiterStats(): Map<
    string,
    ReturnType<AdaptiveRateLimiter['getStats']>
  > {
    const stats = new Map<
      string,
      ReturnType<AdaptiveRateLimiter['getStats']>
    >();

    for (const [clientId, limiter] of this.rateLimiters) {
      stats.set(clientId, limiter.getStats());
    }

    return stats;
  }

  getAllProactiveRateLimiterStats(): Map<
    string,
    ReturnType<BlizzardRateLimiterService['getStats']> | null
  > {
    const stats = new Map<
      string,
      ReturnType<BlizzardRateLimiterService['getStats']> | null
    >();

    for (const [clientId, limiter] of this.proactiveRateLimiters) {
      stats.set(clientId, limiter.getStats(clientId));
    }

    return stats;
  }

  resetAllRateLimiters(): void {
    for (const [clientId, limiter] of this.rateLimiters) {
      limiter.reset();
      this.logger.log(
        `${chalk.cyan('ℹ')} Reset reactive rate limiter for client` +
          ` [${chalk.dim(clientId.substring(0, 8))}...]`,
      );
    }
  }

  async resetAllProactiveRateLimiters(): Promise<void> {
    for (const [clientId, limiter] of this.proactiveRateLimiters) {
      await limiter.reset(clientId);
    }
  }

  clearAllRateLimiters(): void {
    this.rateLimiters.clear();
    this.proactiveRateLimiters.clear();
    this.logger.log(`${chalk.cyan('ℹ')} Cleared all rate limiters`);
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }

  getRateLimiterMode(): RateLimiterMode {
    return this.redisAvailable
      ? RateLimiterMode.HYBRID
      : RateLimiterMode.REACTIVE;
  }
}
