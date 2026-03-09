# HTTP 429 (Too Many Requests) Error Handling - Best Practices Analysis

> Comprehensive analysis of strategies for handling rate limiting errors with axios in a NestJS microservices environment.

## Table of Contents

1. [Overview](#overview)
2. [axios-retry Library](#1-axios-retry-library)
3. [Exponential Backoff Strategies](#2-exponential-backoff-strategies)
4. [Rate Limiting Patterns](#3-rate-limiting-patterns)
5. [Circuit Breaker Pattern](#4-circuit-breaker-pattern)
6. [Queue-Based Request Throttling](#5-queue-based-request-throttling)
7. [Comparison Matrix](#comparison-matrix)
8. [Recommended Approach for CMNW](#recommended-approach-for-cmnw)

---

## Overview

### What is HTTP 429?

HTTP 429 (Too Many Requests) indicates the user has sent too many requests in a given time period. The response typically includes:

- **`Retry-After` header**: Seconds to wait before retrying (or HTTP date)
- **Rate limit headers** (varies by API):
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when the window resets

### Blizzard API Specific Considerations

| Endpoint Category | Rate Limit | Window                |
| ----------------- | ---------- | --------------------- |
| Game Data APIs    | 36,000     | 1 hour                |
| Profile APIs      | 36,000     | 1 hour                |
| OAuth Token       | 100        | 1 second (per client) |

**Key Blizzard Headers:**

- `X-Plan-Prefix`: Plan identifier
- Rate limiting applied per OAuth client credentials
- No `Retry-After` header on 429 (must implement own backoff)

---

## 1. axios-retry Library

### How It Works

`axios-retry` is an axios interceptor that automatically retries failed HTTP requests based on configurable conditions.

```typescript
// Conceptual Installation
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create();
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});
```

### Configuration Options

| Option                    | Type                             | Default                   | Description                        |
| ------------------------- | -------------------------------- | ------------------------- | ---------------------------------- |
| `retries`                 | `number`                         | `3`                       | Number of retry attempts           |
| `retryCondition`          | `(error) => boolean`             | Network/5xx on idempotent | Custom retry condition             |
| `retryDelay`              | `(count, error) => number`       | `0`                       | Delay between retries in ms        |
| `shouldResetTimeout`      | `boolean`                        | `false`                   | Reset timeout on each retry        |
| `onRetry`                 | `(count, error, config) => void` | `noop`                    | Callback before each retry         |
| `onMaxRetryTimesExceeded` | `(error, count) => void`         | `noop`                    | Callback when max retries exceeded |
| `validateResponse`        | `(response) => boolean`          | `null`                    | Custom response validation         |

### 429-Specific Handling

```typescript
// Conceptual: Custom retry condition for 429
axiosRetry(axiosInstance, {
  retries: 5,
  retryCondition: (error) => {
    return error.response?.status === 429 || error.response?.status >= 500;
  },
  retryDelay: (retryCount, error) => {
    // Respect Retry-After header if present
    const retryAfter = error.response?.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    // Otherwise use exponential backoff
    return axiosRetry.exponentialDelay(retryCount, error, 1000);
  },
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn(
      `Retry ${retryCount} for ${requestConfig.url}: ${error.message}`,
    );
  },
});
```

### Pros & Cons

| Pros                                           | Cons                                                  |
| ---------------------------------------------- | ----------------------------------------------------- |
| ✅ Simple setup, minimal code                  | ❌ No global rate limit awareness                     |
| ✅ Respects `Retry-After` header automatically | ❌ Per-instance only, no cross-worker coordination    |
| ✅ Built-in exponential backoff                | ❌ Can still exceed rate limits with multiple workers |
| ✅ Request-specific configuration              | ❌ No circuit breaker functionality                   |
| ✅ Well-maintained, TypeScript support         | ❌ Reactive only (doesn't prevent 429s)               |

### Implementation Complexity: **Low**

- ~10-20 lines of code
- Single npm dependency
- No infrastructure changes

### NestJS Integration

```typescript
// Conceptual: As a custom provider
@Injectable()
export class BlizzardApiService {
  private readonly axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: 'https://us.api.blizzard.com',
      timeout: 30000,
    });

    axiosRetry(this.axios, {
      retries: 3,
      retryCondition: (error) => error.response?.status === 429,
      retryDelay: axiosRetry.exponentialDelay,
    });
  }

  async getCharacter(realm: string, name: string) {
    return this.axios.get(`/profile/wow/character/${realm}/${name}`);
  }
}
```

---

## 2. Exponential Backoff Strategies

### The Formula

**Standard Exponential Backoff:**

```
delay = baseDelay * (2 ^ attempt) + jitter
```

**Full Jitter (Recommended):**

```
delay = random(0, baseDelay * (2 ^ attempt))
```

**Decorrelated Jitter:**

```
delay = min(cap, random(base, sleep * 3))
```

### Backoff Strategies Comparison

| Strategy                | Formula                                      | Use Case                                   |
| ----------------------- | -------------------------------------------- | ------------------------------------------ |
| **No Jitter**           | `base * 2^n`                                 | Predictable, but can cause thundering herd |
| **Full Jitter**         | `random(0, base * 2^n)`                      | Best for distributed systems               |
| **Decorrelated Jitter** | `min(cap, random(base, sleep*3))`            | Better for long-running retries            |
| **Equal Jitter**        | `base * 2^n / 2 + random(0, base * 2^n / 2)` | Balanced approach                          |

### Implementation Example

```typescript
// Conceptual: Exponential backoff with jitter
interface BackoffConfig {
  baseDelay: number; // Initial delay in ms (e.g., 1000)
  maxDelay: number; // Maximum delay cap (e.g., 30000)
  maxRetries: number; // Maximum retry attempts (e.g., 5)
  jitter: 'full' | 'equal' | 'decorrelated' | 'none';
}

function calculateBackoff(attempt: number, config: BackoffConfig): number {
  const { baseDelay, maxDelay, jitter } = config;

  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

  switch (jitter) {
    case 'full':
      return Math.random() * exponentialDelay;
    case 'equal':
      return exponentialDelay / 2 + Math.random() * (exponentialDelay / 2);
    case 'decorrelated':
      return Math.min(
        maxDelay,
        baseDelay + Math.random() * (exponentialDelay * 3),
      );
    default:
      return exponentialDelay;
  }
}

// Usage
async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  config: BackoffConfig,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status !== 429) throw error;

      lastError = error;
      const delay = calculateBackoff(attempt, config);

      logger.warn(
        `429 received, waiting ${delay}ms before retry ${attempt + 1}`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
```

### Blizzard API Specific Backoff

```typescript
// Conceptual: Blizzard-aware backoff
const BLIZZARD_CONFIG: BackoffConfig = {
  baseDelay: 1000, // Start with 1 second
  maxDelay: 60000, // Max 1 minute wait
  maxRetries: 5,
  jitter: 'full', // Prevent thundering herd
};

// Blizzard doesn't send Retry-After, so we estimate
async function handleBlizzard429(error: AxiosError): Promise<number> {
  // Check if we have rate limit headers
  const remaining = error.response?.headers?.['x-ratelimit-remaining'];
  const reset = error.response?.headers?.['x-ratelimit-reset'];

  if (reset) {
    const resetTime = parseInt(reset) * 1000; // Convert to ms
    return Math.max(resetTime - Date.now(), 1000);
  }

  // Default exponential backoff
  return calculateBackoff(currentAttempt, BLIZZARD_CONFIG);
}
```

### Pros & Cons

| Pros                                    | Cons                                            |
| --------------------------------------- | ----------------------------------------------- |
| ✅ Prevents thundering herd with jitter | ❌ Still reactive, not proactive                |
| ✅ Mathematically sound approach        | ❌ Can waste time if rate limit window is known |
| ✅ Self-limiting by design              | ❌ No coordination between workers              |
| ✅ Works with any retry mechanism       | ❌ May exceed max delay for user experience     |

### Implementation Complexity: **Low-Medium**

- 20-50 lines of code
- No external dependencies
- Requires retry logic wrapper

---

## 3. Rate Limiting Patterns

### 3.1 Token Bucket Algorithm

**How it works:**

- Bucket holds tokens (max = bucket size)
- Tokens are added at a fixed rate
- Each request consumes one token
- If bucket is empty, request is blocked/delayed

```
┌─────────────────────────────────────┐
│           TOKEN BUCKET              │
│  ┌───┬───┬───┬───┬───┐             │
│  │ ● │ ● │ ● │ ● │ ○ │  ← Tokens   │
│  └───┴───┴───┴───┴───┘             │
│  Refill Rate: 10 tokens/sec         │
│  Max Capacity: 100 tokens           │
└─────────────────────────────────────┘
         │
         ▼
    Request arrives → Consume 1 token → Proceed
    If empty → Wait or Reject
```

**Redis Implementation:**

```typescript
// Conceptual: Redis-based Token Bucket
interface TokenBucketConfig {
  key: string; // Redis key for this bucket
  capacity: number; // Maximum tokens
  refillRate: number; // Tokens per second
}

class RedisTokenBucket {
  constructor(private redis: Redis) {}

  async consume(
    config: TokenBucketConfig,
    tokens: number = 1,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    waitTime: number;
  }> {
    const { key, capacity, refillRate } = config;
    const now = Date.now();

    const script = `
      local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'lastUpdate')
      local tokens = tonumber(bucket[1]) or ARGV[1]
      local lastUpdate = tonumber(bucket[2]) or ARGV[2]
      
      -- Calculate tokens to add
      local elapsed = ARGV[2] - lastUpdate
      local newTokens = math.min(ARGV[1], tokens + (elapsed / 1000 * ARGV[3]))
      
      if newTokens >= ARGV[4] then
        local remaining = newTokens - ARGV[4]
        redis.call('HMSET', KEYS[1], 'tokens', remaining, 'lastUpdate', ARGV[2])
        redis.call('EXPIRE', KEYS[1], 3600)
        return {1, remaining, 0}
      else
        local waitTime = math.ceil((ARGV[4] - newTokens) / ARGV[3] * 1000)
        return {0, newTokens, waitTime}
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      capacity.toString(),
      now.toString(),
      refillRate.toString(),
      tokens.toString(),
    );

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      waitTime: result[2],
    };
  }
}
```

### 3.2 Sliding Window Counter

**How it works:**

- Uses previous window + current window
- Weighted calculation for smooth transitions
- More accurate than fixed window

```
Formula: rate = previous_count * (1 - elapsed/window_size) + current_count

Example: 50 req/min limit
  Previous minute: 42 requests
  Current minute: 18 requests (15 seconds elapsed)

  rate = 42 * ((60-15)/60) + 18
       = 42 * 0.75 + 18
       = 49.5 requests
```

**Redis Implementation:**

```typescript
// Conceptual: Sliding Window Counter
class SlidingWindowCounter {
  constructor(private redis: Redis) {}

  async checkLimit(
    key: string,
    limit: number,
    windowSizeSec: number,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const now = Math.floor(Date.now() / 1000);
    const currentWindow = Math.floor(now / windowSizeSec);
    const previousWindow = currentWindow - 1;

    const currentKey = `${key}:${currentWindow}`;
    const previousKey = `${key}:${previousWindow}`;

    const [previousCount, currentCount] = await Promise.all([
      this.redis.get(previousKey).then((v) => parseInt(v || '0')),
      this.redis.incr(currentKey),
    ]);

    // Set expiry on current window if new
    if (currentCount === 1) {
      await this.redis.expire(currentKey, windowSizeSec * 2);
    }

    // Calculate weighted rate
    const elapsed = now % windowSizeSec;
    const weight = (windowSizeSec - elapsed) / windowSizeSec;
    const rate = Math.floor(previousCount * weight) + currentCount;

    return {
      allowed: rate <= limit,
      remaining: Math.max(0, limit - rate),
      resetIn: windowSizeSec - elapsed,
    };
  }
}
```

### 3.3 Leaky Bucket

**How it works:**

- Requests enter a queue (bucket)
- Processed at a constant rate (leak)
- If queue is full, requests are rejected

```
┌─────────────────────────────────────┐
│          LEAKY BUCKET               │
│  Requests → ┌───┬───┬───┬───┐       │
│             │ 1 │ 2 │ 3 │ 4 │ Queue │
│             └───┴───┴───┴───┘       │
│                  │                   │
│                  ▼ Leak: 10 req/s   │
└─────────────────────────────────────┘
```

### Pattern Comparison

| Pattern            | Pros                  | Cons                     | Best For                  |
| ------------------ | --------------------- | ------------------------ | ------------------------- |
| **Token Bucket**   | Allows bursts, simple | Can exceed average rate  | APIs with burst tolerance |
| **Sliding Window** | Smooth, accurate      | More complex, 2x storage | Strict rate limits        |
| **Leaky Bucket**   | Constant output rate  | No burst handling        | Streaming, smooth traffic |
| **Fixed Window**   | Simple, low memory    | Spike at boundaries      | Basic rate limiting       |

### Pros & Cons (Redis-based)

| Pros                                | Cons                             |
| ----------------------------------- | -------------------------------- |
| ✅ Proactive (prevents 429s)        | ❌ Requires Redis infrastructure |
| ✅ Works across multiple workers    | ❌ Network latency on each check |
| ✅ Configurable per API/endpoint    | ❌ Additional complexity         |
| ✅ Can share limits across services | ❌ Redis can become bottleneck   |

### Implementation Complexity: **Medium-High**

- 50-100 lines of code
- Redis dependency
- Lua scripts for atomicity

---

## 4. Circuit Breaker Pattern

### How It Works

The circuit breaker prevents cascading failures by "breaking" the circuit when failures exceed a threshold.

```
┌─────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER                          │
│                                                             │
│   CLOSED ──────[failures > threshold]──────► OPEN          │
│     │                                          │            │
│     │                                          │            │
│     ▼                                    [timeout]          │
│   Request ──► API                          │                │
│                                             ▼                │
│   OPEN ────────[timeout expired]──────► HALF_OPEN          │
│     │                                          │            │
│     │                                    [test request]     │
│     ▼                                          │            │
│   Fallback                               ┌────┴────┐        │
│   (cached/error)                        success   fail      │
│                                           │         │       │
│                                           ▼         ▼       │
│                                        CLOSED    OPEN       │
└─────────────────────────────────────────────────────────────┘
```

### States

| State         | Behavior                                  |
| ------------- | ----------------------------------------- |
| **CLOSED**    | Normal operation, requests pass through   |
| **OPEN**      | Requests fail fast, return fallback/error |
| **HALF_OPEN** | Limited test requests to check recovery   |

### Using opossum Library

```typescript
// Conceptual: Circuit Breaker with opossum
import CircuitBreaker from 'opossum';

interface BlizzardCircuitBreakerConfig {
  timeout: number; // Request timeout (ms)
  errorThresholdPercentage: number; // % failures to trip
  resetTimeout: number; // Time before trying again (ms)
  volumeThreshold: number; // Min requests before evaluating
  rollingCountTimeout: number; // Stats window (ms)
  rollingCountBuckets: number; // Number of buckets
}

const BLIZZARD_BREAKER_CONFIG: BlizzardCircuitBreakerConfig = {
  timeout: 30000, // 30 second timeout
  errorThresholdPercentage: 50, // Trip at 50% failures
  resetTimeout: 60000, // Try again after 1 minute
  volumeThreshold: 10, // Need 10 requests before evaluating
  rollingCountTimeout: 10000, // 10 second window
  rollingCountBuckets: 10, // 1 bucket per second
};

@Injectable()
export class BlizzardApiWithCircuitBreaker {
  private breaker: CircuitBreaker;
  private readonly logger = new Logger(BlizzardApiWithCircuitBreaker.name);

  constructor(private readonly blizzardService: BlizzardApiService) {
    this.breaker = new CircuitBreaker(
      this.blizzardService.makeRequest.bind(this.blizzardService),
      BLIZZARD_BREAKER_CONFIG,
    );

    // Fallback when circuit is open
    this.breaker.fallback(() => {
      throw new ServiceUnavailableException(
        'Blizzard API temporarily unavailable',
      );
    });

    // Event handlers
    this.breaker.on('open', () => {
      this.logger.warn('🔴 Circuit OPEN - Blizzard API failing');
    });

    this.breaker.on('halfOpen', () => {
      this.logger.log('🟡 Circuit HALF-OPEN - Testing Blizzard API');
    });

    this.breaker.on('close', () => {
      this.logger.log('🟢 Circuit CLOSED - Blizzard API recovered');
    });

    this.breaker.on('fallback', () => {
      this.logger.debug('Fallback executed');
    });
  }

  async getCharacter(realm: string, name: string): Promise<CharacterResponse> {
    return this.breaker.fire(realm, name, 'character');
  }
}
```

### 429-Specific Circuit Breaker

```typescript
// Conceptual: 429-aware circuit breaker
class RateLimitAwareCircuitBreaker {
  private consecutive429s = 0;
  private readonly max429s = 3;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await this.breaker.fire(fn);
      this.consecutive429s = 0; // Reset on success
      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        this.consecutive429s++;

        // Open circuit if too many consecutive 429s
        if (this.consecutive429s >= this.max429s) {
          this.breaker.open();
          this.logger.warn('Circuit opened due to consecutive 429s');
        }
      }
      throw error;
    }
  }
}
```

### Pros & Cons

| Pros                               | Cons                                             |
| ---------------------------------- | ------------------------------------------------ |
| ✅ Fails fast, protects system     | ❌ Doesn't prevent 429s, just handles them       |
| ✅ Automatic recovery detection    | ❌ Can block legitimate requests during recovery |
| ✅ Metrics and monitoring built-in | ❌ Requires tuning thresholds                    |
| ✅ Fallback support                | ❌ Per-instance (needs Redis for distributed)    |
| ✅ Event-driven architecture       | ❌ Additional state management                   |

### Implementation Complexity: **Medium**

- 30-50 lines of code
- opossum dependency
- Event handling setup

---

## 5. Queue-Based Request Throttling

### How It Works

Instead of making requests directly, tasks are queued and processed at a controlled rate.

```
┌─────────────────────────────────────────────────────────────┐
│                  REQUEST QUEUE SYSTEM                       │
│                                                             │
│  Workers ──► ┌─────────────────────┐ ──► Rate Limiter      │
│              │   BullMQ Queue      │      (Redis)          │
│              │  ┌───┬───┬───┬───┐  │                        │
│              │  │ 1 │ 2 │ 3 │...│  │                        │
│              │  └───┴───┴───┴───┘  │                        │
│              └─────────────────────┘                        │
│                        │                                    │
│                        ▼                                    │
│              ┌─────────────────────┐                        │
│              │   Queue Processor   │                        │
│              │   (Rate Limited)    │                        │
│              │   10 req/second     │                        │
│              └─────────────────────┘                        │
│                        │                                    │
│                        ▼                                    │
│                    Blizzard API                             │
└─────────────────────────────────────────────────────────────┘
```

### BullMQ-Based Throttling

```typescript
// Conceptual: BullMQ rate-limited queue
import { Queue, Worker, QueueScheduler } from 'bullmq';

interface BlizzardRequestJob {
  type: 'character' | 'guild' | 'auction';
  params: Record<string, any>;
  priority: number;
}

@Injectable()
export class BlizzardRequestQueue {
  private queue: Queue<BlizzardRequestJob>;
  private worker: Worker;
  private readonly logger = new Logger(BlizzardRequestQueue.name);

  constructor(
    private readonly blizzardApi: BlizzardApiService,
    private readonly connection: Redis,
  ) {
    this.queue = new Queue<BlizzardRequestJob>('blizzard-requests', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    // Rate-limited worker: 10 jobs per second
    this.worker = new Worker<BlizzardRequestJob>(
      'blizzard-requests',
      this.processJob.bind(this),
      {
        connection: this.connection,
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // Per 1000ms (1 second)
        },
        concurrency: 5, // Process 5 jobs concurrently
      },
    );
  }

  private async processJob(job: Job<BlizzardRequestJob>): Promise<any> {
    const { type, params } = job.data;

    try {
      switch (type) {
        case 'character':
          return await this.blizzardApi.getCharacter(params.realm, params.name);
        case 'guild':
          return await this.blizzardApi.getGuild(params.realm, params.name);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      // Handle 429 specifically
      if (error.response?.status === 429) {
        // Re-queue with delay
        const delay = this.calculateBackoff(job.attemptsMade);
        await job.moveToDelayed(Date.now() + delay);
        throw error; // Will be retried
      }
      throw error;
    }
  }

  async enqueueCharacterRequest(
    realm: string,
    name: string,
    priority = 5,
  ): Promise<Job> {
    return this.queue.add(
      'character-request',
      { type: 'character', params: { realm, name }, priority },
      { priority },
    );
  }

  private calculateBackoff(attempts: number): number {
    return Math.min(1000 * Math.pow(2, attempts), 60000);
  }
}
```

### Redis-Based Global Rate Limiter for Queue

```typescript
// Conceptual: Global rate limiter using Redis
class GlobalRateLimiter {
  private readonly script = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    local clearBefore = now - window * 1000
    redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
    
    local count = redis.call('ZCARD', key)
    if count < limit then
      redis.call('ZADD', key, now, now .. '-' .. math.random())
      redis.call('EXPIRE', key, window)
      return {1, limit - count - 1}
    else
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local waitTime = window * 1000 - (now - tonumber(oldest[2]))
      return {0, 0, waitTime}
    end
  `;

  async acquireToken(
    key: string,
    limit: number,
    windowSec: number,
  ): Promise<{ allowed: boolean; waitTime: number }> {
    const result = await this.redis.eval(
      this.script,
      1,
      key,
      limit.toString(),
      windowSec.toString(),
      Date.now().toString(),
    );

    return {
      allowed: result[0] === 1,
      waitTime: result[2] || 0,
    };
  }
}
```

### Priority Queue with Rate Limiting

```typescript
// Conceptual: Priority-based queue with rate limiting
interface PriorityLevels {
  CRITICAL: 1; // User-initiated requests
  HIGH: 3; // Important scheduled tasks
  NORMAL: 5; // Regular updates
  LOW: 10; // Background sync
}

// Workers can enqueue with different priorities
await queue.add('job', data, { priority: PriorityLevels.CRITICAL });
```

### Pros & Cons

| Pros                                | Cons                                        |
| ----------------------------------- | ------------------------------------------- |
| ✅ Guarantees rate limit compliance | ❌ Adds latency (queue wait time)           |
| ✅ Works across all workers         | ❌ More infrastructure (BullMQ + Redis)     |
| ✅ Built-in retry and backoff       | ❌ Job management complexity                |
| ✅ Priority support                 | ❌ Monitoring and dead letter queues needed |
| ✅ Persistence and reliability      | ❌ Not immediate (async processing)         |
| ✅ BullMQ already in project        | ❌ Queue backlog can grow                   |

### Implementation Complexity: **High**

- 100-200 lines of code
- BullMQ (already in project)
- Redis for rate limiting
- Job monitoring setup

---

## Comparison Matrix

| Approach                   | Prevents 429 | Handles 429 | Multi-Worker | Complexity | Latency  |
| -------------------------- | ------------ | ----------- | ------------ | ---------- | -------- |
| **axios-retry**            | ❌           | ✅          | ❌           | Low        | Low      |
| **Exponential Backoff**    | ❌           | ✅          | ❌           | Low-Med    | Variable |
| **Token Bucket (Redis)**   | ✅           | ✅          | ✅           | Medium     | Low      |
| **Sliding Window (Redis)** | ✅           | ✅          | ✅           | Medium     | Low      |
| **Circuit Breaker**        | ❌           | ✅          | Per-instance | Medium     | None     |
| **Queue Throttling**       | ✅           | ✅          | ✅           | High       | Variable |

### Blizzard API Recommendations

| Scenario              | Recommended Approach               |
| --------------------- | ---------------------------------- |
| Single worker, simple | axios-retry + exponential backoff  |
| Multiple workers      | Token Bucket (Redis) + axios-retry |
| High throughput       | Queue-based throttling             |
| API instability       | Circuit Breaker + Queue            |
| Production-ready      | **All combined (layered)**         |

---

## Recommended Approach for CMNW

### Layered Defense Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    LAYERED DEFENSE                             │
│                                                                │
│  Layer 1: Proactive Rate Limiting (Redis Token Bucket)        │
│  ├── Prevents 429s before they happen                         │
│  └── Shared across all workers                                 │
│                                                                │
│  Layer 2: Request Queue (BullMQ)                               │
│  ├── Smooths request flow                                      │
│  └── Priority-based processing                                 │
│                                                                │
│  Layer 3: Circuit Breaker (opossum)                            │
│  ├── Fails fast during API issues                             │
│  └── Automatic recovery                                        │
│                                                                │
│  Layer 4: Retry with Backoff (axios-retry)                     │
│  ├── Last line of defense                                      │
│  └── Handles unexpected 429s                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Conceptual Architecture

```typescript
// Conceptual: Complete Blizzard API client with layered defense
@Injectable()
export class ResilientBlizzardApiService {
  private readonly axios: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RedisTokenBucket;
  private readonly logger = new Logger(ResilientBlizzardApiService.name);

  // Blizzard rate limits: 36,000/hour = 10/second average
  private readonly RATE_LIMIT_CONFIG = {
    capacity: 100, // Allow some burst
    refillRate: 10, // 10 tokens per second
  };

  constructor(
    private readonly queue: BlizzardRequestQueue,
    private readonly redis: Redis,
  ) {
    this.setupAxios();
    this.setupCircuitBreaker();
    this.setupRateLimiter();
  }

  private setupAxios(): void {
    this.axios = axios.create({
      baseURL: 'https://us.api.blizzard.com',
      timeout: 30000,
    });

    // Layer 4: axios-retry as safety net
    axiosRetry(this.axios, {
      retries: 3,
      retryCondition: (error) => error.response?.status === 429,
      retryDelay: (count, error) => {
        const retryAfter = error.response?.headers?.['retry-after'];
        if (retryAfter) return parseInt(retryAfter) * 1000;
        return Math.min(1000 * Math.pow(2, count), 30000);
      },
    });
  }

  private setupCircuitBreaker(): void {
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
    });

    this.circuitBreaker.fallback(() => {
      throw new ServiceUnavailableException('Blizzard API unavailable');
    });
  }

  async getCharacter(realm: string, name: string): Promise<Character> {
    // Layer 1: Check rate limit
    const rateCheck = await this.rateLimiter.consume(
      'blizzard-api',
      this.RATE_LIMIT_CONFIG.capacity,
      this.RATE_LIMIT_CONFIG.refillRate,
    );

    if (!rateCheck.allowed) {
      // Layer 2: Queue for later if rate limited
      this.logger.debug(`Rate limited, queuing request for ${realm}/${name}`);
      return this.queue.enqueueCharacterRequest(realm, name);
    }

    // Layer 3: Circuit breaker
    return this.circuitBreaker.fire(realm, name);
  }

  private async makeRequest(realm: string, name: string): Promise<Character> {
    // Layer 4: axios with retry
    const response = await this.axios.get(
      `/profile/wow/character/${realm}/${name}`,
    );
    return response.data;
  }
}
```

### Configuration for CMNW

```typescript
// libs/configuration/src/blizzard.config.ts
export const blizzardConfig = registerAs('blizzard', () => ({
  // Rate limiting
  rateLimit: {
    capacity: parseInt(process.env.BLIZZARD_RATE_CAPACITY || '100'),
    refillRate: parseInt(process.env.BLIZZARD_RATE_REFILL || '10'),
  },

  // Circuit breaker
  circuitBreaker: {
    timeout: parseInt(process.env.BLIZZARD_CB_TIMEOUT || '30000'),
    errorThreshold: parseInt(process.env.BLIZZARD_CB_ERROR_THRESHOLD || '50'),
    resetTimeout: parseInt(process.env.BLIZZARD_CB_RESET || '60000'),
  },

  // Retry
  retry: {
    maxRetries: parseInt(process.env.BLIZZARD_RETRY_MAX || '3'),
    baseDelay: parseInt(process.env.BLIZZARD_RETRY_BASE_DELAY || '1000'),
    maxDelay: parseInt(process.env.BLIZZARD_RETRY_MAX_DELAY || '30000'),
  },

  // Queue
  queue: {
    maxJobsPerSecond: parseInt(process.env.BLIZZARD_QUEUE_RATE || '10'),
    concurrency: parseInt(process.env.BLIZZARD_QUEUE_CONCURRENCY || '5'),
  },
}));
```

---

## Summary

| Approach                | When to Use                             |
| ----------------------- | --------------------------------------- |
| **axios-retry**         | Always - as safety net                  |
| **Exponential Backoff** | Always - with axios-retry               |
| **Token Bucket**        | Multiple workers, proactive prevention  |
| **Sliding Window**      | Strict rate limit enforcement           |
| **Circuit Breaker**     | API instability, fail-fast requirements |
| **Queue Throttling**    | High throughput, priority handling      |

**For CMNW:** Implement all layers in order:

1. Token Bucket (Redis) - Proactive rate limiting
2. BullMQ Queue - Request management
3. Circuit Breaker - Fail-fast protection
4. axios-retry - Reactive safety net

This layered approach ensures:

- ✅ 429s are prevented proactively
- ✅ Unexpected 429s are handled gracefully
- ✅ System remains resilient during API issues
- ✅ All workers coordinate through Redis
- ✅ Existing BullMQ infrastructure is leveraged
