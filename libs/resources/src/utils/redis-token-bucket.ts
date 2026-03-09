import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import chalk from 'chalk';

/**
 * Configuration for a token bucket
 */
export interface TokenBucketConfig {
  /** Redis key prefix for this bucket */
  key: string;
  /** Maximum tokens the bucket can hold */
  capacity: number;
  /** Tokens added per second */
  refillRate: number;
}

/**
 * Result of a token consumption attempt
 */
export interface TokenConsumeResult {
  /** Whether the request was allowed */
  allowed: boolean;
  /** Remaining tokens after consumption */
  remaining: number;
  /** Milliseconds to wait if not allowed */
  waitTimeMs: number;
  /** Current bucket state for debugging */
  debug?: {
    tokensBefore: number;
    tokensAfter: number;
    elapsed: number;
  };
}

/**
 * Redis Token Bucket implementation for distributed rate limiting
 *
 * Uses Lua script for atomic token consumption across multiple workers.
 * Based on Blizzard API limits: 36,000 requests/hour = ~10 req/sec per client
 *
 * @example
 * const bucket = new RedisTokenBucket(redis);
 * const result = await bucket.consume({
 *   key: 'blizzard:client:abc123',
 *   capacity: 100,
 *   refillRate: 10,
 * });
 *
 * if (!result.allowed) {
 *   await new Promise(r => setTimeout(r, result.waitTimeMs));
 * }
 */
export class RedisTokenBucket {
  private readonly logger?: Logger;

  /**
   * Lua script for atomic token consumption
   *
   * KEYS[1]: Bucket key
   * ARGV[1]: Capacity (max tokens)
   * ARGV[2]: Current timestamp (ms)
   * ARGV[3]: Refill rate (tokens/sec)
   * ARGV[4]: Tokens to consume
   *
   * Returns: {allowed, remaining, waitTime}
   */
  private readonly consumeScript = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local now = tonumber(ARGV[2])
    local refillRate = tonumber(ARGV[3])
    local tokensRequested = tonumber(ARGV[4])
    
    -- Get current bucket state
    local bucket = redis.call('HMGET', key, 'tokens', 'lastUpdate')
    local tokens = tonumber(bucket[1])
    local lastUpdate = tonumber(bucket[2])
    
    -- Initialize if not exists
    if tokens == nil then
      tokens = capacity
      lastUpdate = now
    end
    
    -- Calculate tokens to add based on elapsed time
    local elapsed = math.max(0, now - lastUpdate)
    local newTokens = math.min(capacity, tokens + (elapsed / 1000 * refillRate))
    
    -- Try to consume tokens
    if newTokens >= tokensRequested then
      local remaining = newTokens - tokensRequested
      redis.call('HMSET', key, 'tokens', remaining, 'lastUpdate', now)
      redis.call('EXPIRE', key, 3600)
      return {1, remaining, 0, newTokens, remaining, elapsed}
    else
      -- Calculate wait time
      local deficit = tokensRequested - newTokens
      local waitTime = math.ceil(deficit / refillRate * 1000)
      return {0, newTokens, waitTime, newTokens, newTokens, elapsed}
    end
  `;

  constructor(
    private readonly redis: Redis,
    logger?: Logger,
  ) {
    this.logger = logger;
  }

  /**
   * Attempt to consume tokens from the bucket
   *
   * @param config - Bucket configuration
   * @param tokens - Number of tokens to consume (default: 1)
   * @returns Result indicating if allowed, remaining tokens, and wait time
   */
  async consume(
    config: TokenBucketConfig,
    tokens: number = 1,
  ): Promise<TokenConsumeResult> {
    const { key, capacity, refillRate } = config;
    const now = Date.now();

    try {
      const result = (await this.redis.eval(
        this.consumeScript,
        1,
        key,
        capacity.toString(),
        now.toString(),
        refillRate.toString(),
        tokens.toString(),
      )) as [number, number, number, number, number, number];

      const [
        allowed,
        remaining,
        waitTimeMs,
        tokensBefore,
        tokensAfter,
        elapsed,
      ] = result;

      if (allowed === 0) {
        this.logger?.debug(
          `${chalk.yellow('⏳')} Rate limit: ${chalk.dim(key)} ` +
            `wait ${chalk.bold(waitTimeMs)}ms ` +
            `(tokens: ${chalk.dim(tokensBefore.toFixed(1))})`,
        );
      }

      return {
        allowed: allowed === 1,
        remaining,
        waitTimeMs,
        debug: {
          tokensBefore,
          tokensAfter,
          elapsed,
        },
      };
    } catch (error) {
      this.logger?.error(
        `${chalk.red('✗')} Redis token bucket error: ${chalk.dim((error as Error).message)}`,
      );

      // Fail open: allow request if Redis is unavailable
      return {
        allowed: true,
        remaining: capacity,
        waitTimeMs: 0,
      };
    }
  }

  /**
   * Get current bucket state without consuming tokens
   *
   * @param key - Redis key for the bucket
   * @returns Current token count or null if not exists
   */
  async getState(
    key: string,
  ): Promise<{ tokens: number; lastUpdate: number } | null> {
    try {
      const result = await this.redis.hmget(key, 'tokens', 'lastUpdate');

      if (result[0] === null || result[1] === null) {
        return null;
      }

      return {
        tokens: parseFloat(result[0] as string),
        lastUpdate: parseInt(result[1] as string, 10),
      };
    } catch (error) {
      this.logger?.error(
        `${chalk.red('✗')} Failed to get bucket state: ${chalk.dim((error as Error).message)}`,
      );
      return null;
    }
  }

  /**
   * Reset a bucket to full capacity
   *
   * @param key - Redis key for the bucket
   * @param capacity - Maximum tokens
   */
  async reset(key: string, capacity: number): Promise<void> {
    try {
      await this.redis.hmset(key, {
        tokens: capacity,
        lastUpdate: Date.now(),
      });
      await this.redis.expire(key, 3600);

      this.logger?.debug(
        `${chalk.cyan('ℹ')} Reset token bucket: ${chalk.dim(key)}`,
      );
    } catch (error) {
      this.logger?.error(
        `${chalk.red('✗')} Failed to reset bucket: ${chalk.dim((error as Error).message)}`,
      );
    }
  }

  /**
   * Wait until tokens are available, then consume
   *
   * @param config - Bucket configuration
   * @param tokens - Number of tokens to consume (default: 1)
   * @returns Promise that resolves when tokens are consumed
   */
  async waitAndConsume(
    config: TokenBucketConfig,
    tokens: number = 1,
  ): Promise<TokenConsumeResult> {
    let result = await this.consume(config, tokens);

    while (!result.allowed) {
      await new Promise((resolve) => setTimeout(resolve, result.waitTimeMs));
      result = await this.consume(config, tokens);
    }

    return result;
  }

  /**
   * Remove a bucket from Redis
   *
   * @param key - Redis key for the bucket
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger?.debug(
        `${chalk.cyan('ℹ')} Deleted token bucket: ${chalk.dim(key)}`,
      );
    } catch (error) {
      this.logger?.error(
        `${chalk.red('✗')} Failed to delete bucket: ${chalk.dim((error as Error).message)}`,
      );
    }
  }
}
