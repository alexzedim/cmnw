import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlizzAPI, RegionIdOrName } from '@alexzedim/blizzapi';
import { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import chalk from 'chalk';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { KeysEntity } from '@app/pg';
import { KeyPoolOptions, KeyRotationResult } from '@app/resources';
import { DEFAULT_AXIOS_RETRY_CONFIG, IAxiosRetryConfig } from '../utils/axios-retry.config';
import { IBlizzardApiServiceConfig, ICreateClientOptions } from '../types';
import { KEY_STATUS, KEY_MAX_CONSECUTIVE_ERRORS, KEY_RATE_LIMIT_COOLDOWN_MINUTES } from '../constants/api.constants';

@Injectable()
export class BlizzardApiService {
  private readonly logger = new Logger(BlizzardApiService.name, {
    timestamp: true,
  });
  private readonly redisKeyPrefix = 'cmnw:keypool:';

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRedis()
    private readonly redisService: Redis,
  ) {}

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
        if (this.keysRepository && config.accessToken) {
          this.trackErrorToKey(config.accessToken, error.response?.status ?? 0).catch((err) => {
            this.logger.debug(`Failed to track error: ${err}`);
          });
        }

        const baseDelay = mergedRetryConfig.baseDelayMs * Math.pow(2, retryCount - 1);
        const cappedDelay = Math.min(baseDelay, mergedRetryConfig.maxDelayMs);
        const jitter = Math.random() * 500;
        return cappedDelay + jitter;
      },
      retryCondition: (error) => {
        const status = error.response?.status;
        if (status === 429) {
          return false;
        }
        return mergedRetryConfig.retryableStatusCodes.includes(status);
      },
    });

    this.logger.log(
      `${chalk.green('✓')} Created BlizzAPI client [${chalk.bold(String(region).toUpperCase())}]` +
        ` with axios-retry [${chalk.dim(`retries=${mergedRetryConfig.retries}`)}]`,
    );

    return client;
  }

  createClientFromKey(key: KeysEntity, region?: RegionIdOrName): BlizzAPI {
    const clientRegion = region ?? 'eu';

    const client = new BlizzAPI({
      region: clientRegion,
      clientId: key.client,
      clientSecret: key.secret,
      accessToken: key.token,
    });

    this.logger.log(
      `${chalk.green('✓')} Created BlizzAPI client from key [${chalk.dim(key.client?.substring(0, 8) ?? 'unknown')}...]` +
        ` [${chalk.bold(String(clientRegion).toUpperCase())}]` +
        ` ${chalk.dim('(no axios-retry)')}`,
    );

    return client;
  }

  createRotationAwareClient(
    key: KeysEntity,
    region?: RegionIdOrName,
  ): { client: BlizzAPI; updateToken: (newToken: string) => void } {
    const clientRegion = region ?? 'eu';
    let currentToken = key.token;

    const client = new BlizzAPI({
      region: clientRegion,
      clientId: key.client,
      clientSecret: key.secret,
      accessToken: currentToken,
    });

    const updateToken = (newToken: string) => {
      currentToken = newToken;
      (client as unknown as { accessToken: string }).accessToken = newToken;
    };

    this.logger.log(
      `${chalk.green('✓')} Created rotation-aware BlizzAPI client [${chalk.dim(key.client?.substring(0, 8) ?? 'unknown')}...]` +
        ` [${chalk.bold(String(clientRegion).toUpperCase())}]` +
        ` ${chalk.dim('(dynamic token)')}`,
    );

    return { client, updateToken };
  }

  async getNextKey(options: KeyPoolOptions = {}): Promise<KeysEntity | null> {
    const { tag, skipCooldown = true } = options;

    try {
      const query = this.keysRepository.createQueryBuilder('key');

      query.where('key.status = :status', { status: KEY_STATUS.ACTIVE });

      if (tag) {
        query.andWhere(':tag = ANY(key.tags)', { tag });
      }

      if (skipCooldown) {
        query.andWhere('(key.cooldown_until IS NULL OR key.cooldown_until < :now)', {
          now: new Date(),
        });
      }

      query.orderBy('key.priority', 'ASC');
      query.addOrderBy('key.last_request_at', 'ASC', 'NULLS FIRST');
      query.limit(1);

      const key = await query.getOne();

      if (key) {
        this.logger.debug(
          `${chalk.cyan('ℹ')} Selected key [${chalk.dim(key.client?.substring(0, 8) ?? 'unknown')}...] ` +
            `priority=${chalk.bold(key.priority)} ` +
            `requests=${chalk.dim(key.requestCount)}`,
        );
      }

      return key;
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to get next key: ${chalk.dim((error as Error).message)}`);
      return null;
    }
  }

  async recordSuccess(accessToken: string): Promise<KeysEntity | null> {
    try {
      const key = await this.keysRepository.findOne({
        where: { token: accessToken },
      });

      if (!key) {
        return null;
      }

      key.requestCount += 1;
      key.successCount += 1;
      key.consecutiveErrors = 0;
      key.lastSuccessAt = new Date();
      key.lastRequestAt = new Date();

      if (key.status === KEY_STATUS.RATE_LIMITED) {
        key.status = KEY_STATUS.ACTIVE;
        key.cooldownUntil = null;
        this.logger.log(
          `${chalk.green('✓')} Key recovered from rate limit [${chalk.dim(key.client?.substring(0, 8) ?? 'unknown')}...]`,
        );
      }

      return await this.keysRepository.save(key);
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to record success: ${chalk.dim((error as Error).message)}`);
      return null;
    }
  }

  async recordError(accessToken: string, statusCode: number): Promise<KeysEntity | null> {
    try {
      const key = await this.keysRepository.findOne({
        where: { token: accessToken },
      });

      if (!key) {
        return null;
      }

      key.requestCount += 1;
      key.errorCount += 1;
      key.consecutiveErrors += 1;
      key.lastErrorAt = new Date();
      key.lastRequestAt = new Date();

      if (key.consecutiveErrors >= KEY_MAX_CONSECUTIVE_ERRORS) {
        key.status = KEY_STATUS.DISABLED;
        this.logger.warn(
          `${chalk.yellow('⚠')} Key disabled due to consecutive errors [${chalk.dim(key.client?.substring(0, 8) ?? 'unknown')}...] ` +
            `errors=${chalk.bold(key.consecutiveErrors)}`,
        );
      }

      return await this.keysRepository.save(key);
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to record error: ${chalk.dim((error as Error).message)}`);
      return null;
    }
  }

  async recordRateLimit(accessToken: string): Promise<KeysEntity | null> {
    try {
      const key = await this.keysRepository.findOne({
        where: { token: accessToken },
      });

      if (!key) {
        return null;
      }

      const cooldownUntil = DateTime.now().plus({ minutes: KEY_RATE_LIMIT_COOLDOWN_MINUTES }).toJSDate();

      key.requestCount += 1;
      key.rateLimitCount += 1;
      key.consecutiveErrors += 1;
      key.lastRateLimitAt = new Date();
      key.lastRequestAt = new Date();
      key.status = KEY_STATUS.RATE_LIMITED;
      key.cooldownUntil = cooldownUntil;

      this.logger.warn(
        `${chalk.yellow('⚠')} Key rate limited [${chalk.dim(key.client?.substring(0, 8) ?? 'unknown')}...] ` +
          `cooldown until ${chalk.dim(cooldownUntil.toISOString())}`,
      );

      return await this.keysRepository.save(key);
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to record rate limit: ${chalk.dim((error as Error).message)}`);
      return null;
    }
  }

  async rotateOnRateLimit(currentAccessToken: string, options: KeyPoolOptions = {}): Promise<KeyRotationResult> {
    try {
      const previousKey = await this.recordRateLimit(currentAccessToken);

      const nextKey = await this.getNextKey(options);

      if (nextKey && nextKey.token !== currentAccessToken) {
        this.logger.log(
          `${chalk.cyan('🔄')} Rotated key ` +
            `[${chalk.dim(previousKey?.client?.substring(0, 8) ?? 'unknown')}...] → ` +
            `[${chalk.dim(nextKey.client?.substring(0, 8) ?? 'unknown')}...]`,
        );

        return {
          key: nextKey,
          previousKey,
          reason: 'rate_limited',
        };
      }

      this.logger.warn(`${chalk.yellow('⚠')} No alternative key available for rotation`);

      return {
        key: null,
        previousKey,
        reason: 'rate_limited',
      };
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to rotate key: ${chalk.dim((error as Error).message)}`);

      return {
        key: null,
        previousKey: null,
        reason: 'rate_limited',
      };
    }
  }

  async isKeyAvailable(accessToken: string): Promise<boolean> {
    try {
      const key = await this.keysRepository.findOne({
        where: { token: accessToken },
        select: ['status', 'cooldownUntil'],
      });

      if (!key) {
        return false;
      }

      if (key.status === KEY_STATUS.DISABLED) {
        return false;
      }

      if (key.status === KEY_STATUS.RATE_LIMITED && key.cooldownUntil) {
        return new Date() > key.cooldownUntil;
      }

      return true;
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to check key availability: ${chalk.dim((error as Error).message)}`);
      return false;
    }
  }

  async clearCooldown(accessToken: string): Promise<void> {
    try {
      await this.keysRepository.update(
        { token: accessToken },
        {
          status: KEY_STATUS.ACTIVE,
          cooldownUntil: null,
          consecutiveErrors: 0,
        },
      );

      this.logger.log(`${chalk.green('✓')} Cleared cooldown for key [${chalk.dim(accessToken.substring(0, 8))}...]`);
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to clear cooldown: ${chalk.dim((error as Error).message)}`);
    }
  }

  async getPoolStats(tag?: string): Promise<
    Array<{
      client: string;
      status: KEY_STATUS;
      requestCount: number;
      successCount: number;
      errorCount: number;
      rateLimitCount: number;
      consecutiveErrors: number;
      cooldownUntil?: Date;
    }>
  > {
    try {
      const query = this.keysRepository.createQueryBuilder('key');

      if (tag) {
        query.where(':tag = ANY(key.tags)', { tag });
      }

      query.select([
        'key.client',
        'key.status',
        'key.requestCount',
        'key.successCount',
        'key.errorCount',
        'key.rateLimitCount',
        'key.consecutiveErrors',
        'key.cooldownUntil',
      ]);

      return await query.getMany();
    } catch (error) {
      this.logger.error(`${chalk.red('✗')} Failed to get pool stats: ${chalk.dim((error as Error).message)}`);
      return [];
    }
  }

  private async trackErrorToKey(accessToken: string, statusCode: number): Promise<void> {
    if (statusCode === 429 || statusCode === 403) {
      await this.recordError(accessToken, statusCode);
    }
  }

  private async handleKeyRotation(accessToken: string, keyTag?: string): Promise<void> {
    try {
      const result = await this.rotateOnRateLimit(accessToken, { tag: keyTag });
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

  isRedisAvailable(): boolean {
    return this.redisService !== undefined && this.redisService !== null;
  }
}
