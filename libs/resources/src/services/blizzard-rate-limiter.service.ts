import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import chalk from 'chalk';

import { AdaptiveRateLimiter } from '../utils/adaptive-rate-limiter';
import { RedisTokenBucket, TokenBucketConfig, TokenConsumeResult } from '../utils/redis-token-bucket';
import { DEFAULT_BLIZZARD_CONFIG, IBlizzardRateLimitConfig } from '@app/configuration';

export enum RateLimiterMode {
  PROACTIVE = 'proactive',
  REACTIVE = 'reactive',
  HYBRID = 'hybrid',
}

export interface BlizzardRateLimiterStats {
  clientId: string;
  mode: RateLimiterMode;
  proactive: {
    enabled: boolean;
    remaining: number;
    capacity: number;
  } | null;
  reactive: {
    currentDelayMs: number;
    successCount: number;
    rateLimitCount: number;
    isThrottled: boolean;
  };
  totalRequests: number;
  totalAllowed: number;
  totalDenied: number;
}

@Injectable()
export class BlizzardRateLimiterService implements OnModuleInit {
  private readonly logger = new Logger(BlizzardRateLimiterService.name, {
    timestamp: true,
  });

  private tokenBucket: RedisTokenBucket | null = null;
  private readonly reactiveLimiters = new Map<string, AdaptiveRateLimiter>();
  private readonly stats = new Map<string, { requests: number; allowed: number; denied: number }>();

  private readonly config: IBlizzardRateLimitConfig;
  private readonly mode: RateLimiterMode;

  constructor(redis: Redis | null = null, config?: IBlizzardRateLimitConfig) {
    this.config = config ?? DEFAULT_BLIZZARD_CONFIG.rateLimit;

    const redisAvailable = redis !== null;
    this.mode = redisAvailable ? RateLimiterMode.HYBRID : RateLimiterMode.REACTIVE;

    if (redisAvailable) {
      this.tokenBucket = new RedisTokenBucket(redis!, this.logger);
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `${chalk.cyan('ℹ')} BlizzardRateLimiter initialized ` +
        `[${chalk.bold(this.mode)} mode] ` +
        `[${chalk.dim(`capacity=${this.config.capacity}, refill=${this.config.refillRate}/s`)}]`,
    );
  }

  private getReactiveLimiter(clientId: string): AdaptiveRateLimiter {
    let limiter = this.reactiveLimiters.get(clientId);

    if (!limiter) {
      limiter = new AdaptiveRateLimiter(
        {
          initialDelayMs: 100,
          backoffMultiplier: 1.5,
          recoveryDivisor: 1.1,
          maxDelayMs: 60000,
        },
        this.logger,
      );
      this.reactiveLimiters.set(clientId, limiter);
    }

    return limiter;
  }

  private getBucketKey(clientId: string): string {
    return `blizzard:ratelimit:${clientId}`;
  }

  async waitForToken(clientId: string): Promise<TokenConsumeResult> {
    if (!this.stats.has(clientId)) {
      this.stats.set(clientId, { requests: 0, allowed: 0, denied: 0 });
    }
    this.stats.get(clientId)!.requests++;

    if (this.mode !== RateLimiterMode.REACTIVE && this.tokenBucket) {
      const bucketConfig: TokenBucketConfig = {
        key: this.getBucketKey(clientId),
        capacity: this.config.capacity,
        refillRate: this.config.refillRate,
      };

      const result = await this.tokenBucket.waitAndConsume(bucketConfig);

      if (result.allowed) {
        this.stats.get(clientId)!.allowed++;
        return result;
      }
    }

    const limiter = this.getReactiveLimiter(clientId);
    await limiter.wait();

    return {
      allowed: true,
      remaining: this.config.capacity,
      waitTimeMs: 0,
    };
  }

  recordResponse(
    clientId: string,
    response: {
      status: number;
      headers?: Record<string, string | number | undefined>;
    },
  ): void {
    const limiter = this.getReactiveLimiter(clientId);
    const wasRateLimited = limiter.handleResponse(response);

    if (wasRateLimited) {
      this.logger.warn(
        `${chalk.yellow('⚠')} Rate limit detected for client ` + `[${chalk.dim(clientId.substring(0, 8))}...]`,
      );

      if (this.tokenBucket && this.mode !== RateLimiterMode.REACTIVE) {
        this.tokenBucket.reset(this.getBucketKey(clientId), 0);
      }
    }
  }

  async isTokenAvailable(clientId: string): Promise<boolean> {
    if (this.mode === RateLimiterMode.REACTIVE || !this.tokenBucket) {
      const limiter = this.getReactiveLimiter(clientId);
      return !limiter.isThrottled();
    }

    const state = await this.tokenBucket.getState(this.getBucketKey(clientId));

    return state !== null && state.tokens >= 1;
  }

  getStats(clientId: string): BlizzardRateLimiterStats {
    const reactiveLimiter = this.getReactiveLimiter(clientId);
    const reactiveStats = reactiveLimiter.getStats();
    const requestStats = this.stats.get(clientId) ?? {
      requests: 0,
      allowed: 0,
      denied: 0,
    };

    let proactiveStats: BlizzardRateLimiterStats['proactive'] = null;

    if (this.mode !== RateLimiterMode.REACTIVE && this.tokenBucket) {
      proactiveStats = {
        enabled: true,
        remaining: this.config.capacity,
        capacity: this.config.capacity,
      };
    }

    return {
      clientId,
      mode: this.mode,
      proactive: proactiveStats,
      reactive: {
        currentDelayMs: reactiveStats.currentDelayMs,
        successCount: reactiveStats.successCount,
        rateLimitCount: reactiveStats.rateLimitCount,
        isThrottled: reactiveStats.isThrottled,
      },
      totalRequests: requestStats.requests,
      totalAllowed: requestStats.allowed,
      totalDenied: requestStats.denied,
    };
  }

  async reset(clientId: string): Promise<void> {
    const limiter = this.getReactiveLimiter(clientId);
    limiter.reset();

    if (this.tokenBucket && this.mode !== RateLimiterMode.REACTIVE) {
      await this.tokenBucket.reset(this.getBucketKey(clientId), this.config.capacity);
    }

    this.stats.set(clientId, { requests: 0, allowed: 0, denied: 0 });

    this.logger.log(
      `${chalk.cyan('ℹ')} Reset rate limiter for client ` + `[${chalk.dim(clientId.substring(0, 8))}...]`,
    );
  }

  async clearAll(): Promise<void> {
    this.reactiveLimiters.clear();
    this.stats.clear();

    this.logger.log(`${chalk.cyan('ℹ')} Cleared all rate limiters`);
  }
}
