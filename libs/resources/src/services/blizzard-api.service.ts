import { Injectable, Logger, Optional } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import chalk from 'chalk';
import Redis from 'ioredis';
import { Repository } from 'typeorm';

import { DEFAULT_AXIOS_RETRY_CONFIG, IAxiosRetryConfig } from '../utils/axios-retry.config';
import { IBlizzardApiServiceConfig, ICreateClientOptions } from '../types';
import { KeyPoolService } from './key-pool.service';
import { KeysEntity } from '@app/pg';

@Injectable()
export class BlizzardApiService {
  private readonly logger = new Logger(BlizzardApiService.name, {
    timestamp: true,
  });

  constructor(@Optional() private readonly redis?: Redis) {}

  /**
   * Create a Blizzard API client with built-in retry and rate limiting
   *
   * The client automatically:
   * - Retries on 429/503 errors with exponential backoff
   * - Tracks requests, errors, and rate limits to KeysEntity
   * - Supports key rotation on consecutive 429s
   *
   * @param config - API credentials
   * @param options - Optional configuration for retry, key pool, and tracking
   * @returns Configured BlizzAPI client
   *
   * @example
   * // Simple usage (no key rotation)
   * const client = blizzardApiService.createClient({
   *   clientId: 'xxx',
   *   clientSecret: 'xxx',
   *   accessToken: 'xxx',
   * });
   *
   * @example
   * // With key rotation support
   * const client = blizzardApiService.createClient(
   *   { clientId, clientSecret, accessToken },
   *   { keyPoolService, keysRepository, keyTag: 'blizzard' }
   * );
   */
  createClient(config: IBlizzardApiServiceConfig, options?: ICreateClientOptions): BlizzAPI {
    const region = config.region ?? 'eu';

    const mergedRetryConfig: IAxiosRetryConfig = {
      ...DEFAULT_AXIOS_RETRY_CONFIG,
      ...options?.retryConfig,
    };

    const client = new BlizzAPI({
      region,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accessToken: config.accessToken,
    });

    const axiosInstance = (client as unknown as { axios: AxiosInstance }).axios;

    axiosRetry(axiosInstance, {
      retries: mergedRetryConfig.retries,
      retryDelay: (retryCount, error) => {
        if (options?.keysRepository && config.accessToken) {
          this.trackErrorToKey(options.keysRepository, config.accessToken, error.response?.status ?? 0).catch((err) => {
            this.logger.debug(`Failed to track error: ${err}`);
          });
        }

        if (error.response?.status === 429 && options?.keyPoolService && config.accessToken) {
          this.handleKeyRotation(options.keyPoolService, config.accessToken, options.keyTag).catch((err) => {
            this.logger.debug(`Failed to rotate key: ${err}`);
          });
        }

        const baseDelay = mergedRetryConfig.baseDelayMs * Math.pow(2, retryCount - 1);
        const cappedDelay = Math.min(baseDelay, mergedRetryConfig.maxDelayMs);
        const jitter = Math.random() * 500;
        return cappedDelay + jitter;
      },
      retryCondition: (error) => {
        return mergedRetryConfig.retryableStatusCodes.includes(error.response?.status);
      },
    });

    this.logger.log(
      `${chalk.green('✓')} Created BlizzAPI client [${chalk.bold(region.toUpperCase())}]` +
        ` with axios-retry [${chalk.dim(`retries=${mergedRetryConfig.retries}`)}]`,
    );

    return client;
  }

  /**
   * Track error to KeysEntity
   */
  private async trackErrorToKey(
    keysRepository: Repository<KeysEntity>,
    accessToken: string,
    statusCode: number,
  ): Promise<void> {
    if (statusCode === 429 || statusCode === 403) {
      try {
        const key = await keysRepository.findOne({ where: { token: accessToken } });
        if (key) {
          key.errorCount += 1;
          key.rateLimitCount += 1;
          key.consecutiveErrors += 1;
          key.lastErrorAt = new Date();
          key.lastRateLimitAt = new Date();
          await keysRepository.save(key);
        }
      } catch (error) {
        this.logger.debug(`Failed to track error to key: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Handle key rotation on 429
   */
  private async handleKeyRotation(keyPoolService: KeyPoolService, accessToken: string, keyTag?: string): Promise<void> {
    try {
      const result = await keyPoolService.rotateOnRateLimit(accessToken, { tag: keyTag });
      if (result.key) {
        this.logger.log(
          `${chalk.yellow('↻')} Rotated to new key [${chalk.dim(result.key.client?.substring(0, 8))}...] ` +
            `reason: ${result.reason}`,
        );
      }
    } catch (error) {
      this.logger.debug(`Failed to rotate key: ${(error as Error).message}`);
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis !== undefined && this.redis !== null;
  }
}
