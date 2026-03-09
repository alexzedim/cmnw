# 429 Error Handling Strategy - Design Document

**Status:** Approved  
**Target:** apps/dma/src/workers/, apps/osint/src/workers/

---

## Executive Summary

After analyzing the codebase, I identified 6 solution options for handling 429 errors. The approved approach is a **Hybrid (Layered Defense)** strategy implemented in two phases.

### Decisions Made

| Decision         | Choice                                  |
| ---------------- | --------------------------------------- |
| API Calls        | Keep parallel (Promise.allSettled)      |
| Rate Limit Scope | Per OAuth clientId                      |
| On 429           | Wait and retry with exponential backoff |
| Retry Library    | axios-retry                             |

---

## 1. Current State

### Existing Infrastructure

| Component           | Status                          |
| ------------------- | ------------------------------- |
| AdaptiveRateLimiter | Exists but NOT used in workers  |
| KeyErrorTracker     | Used for tracking 403/429       |
| BullMQ Queue Retry  | 3 attempts, exponential backoff |
| Worker Concurrency  | 5 concurrent jobs               |

### Current Problem

CharactersWorker makes 5 parallel API calls per character with no rate limiting.

### Gaps

1. No rate limiting before API calls
2. No per-request retry
3. Parallel requests without throttling
4. No coordination between workers
5. AdaptiveRateLimiter exists but unused

---

## 2. Blizzard API Limits

- Rate: 36,000 requests/hour = ~10 req/sec per client
- No Retry-After header on 429 responses
- No X-RateLimit headers in responses

---

## 3. Approved Solution: Hybrid Approach

### Layered Defense Architecture

- Layer 1: Redis Token Bucket (proactive, per clientId)
- Layer 2: AdaptiveRateLimiter (local, reactive)
- Layer 3: axios-retry (safety net)
- Layer 4: BullMQ Job Retry (last resort)

---

## 4. Implementation Plan

### Phase 1: Quick Win (Priority)

**Goal:** Immediate improvement with minimal changes

#### Tasks:

1. Install axios-retry: pnpm add axios-retry

2. Create BlizzardApiService (NEW)
   - File: libs/resources/src/services/blizzard-api.service.ts
   - Wraps BlizzAPI with axios-retry
   - Per-clientId rate limiting via AdaptiveRateLimiter

3. Integrate AdaptiveRateLimiter in services:
   - apps/osint/src/services/character.service.ts
   - apps/osint/src/services/guild-summary.service.ts
   - apps/dma/src/workers/auctions.worker.ts

### Phase 2: Global Coordination

**Goal:** Cross-worker rate limiting via Redis

#### Tasks:

1. Create RedisTokenBucket (NEW)
   - File: libs/resources/src/utils/redis-token-bucket.ts
   - Lua script for atomic token consumption

2. Create BlizzardRateLimiterService (NEW)
   - File: libs/resources/src/services/blizzard-rate-limiter.service.ts

---

## 5. Files to Create/Modify

### Phase 1 - New Files

| File                                                | Purpose                     |
| --------------------------------------------------- | --------------------------- |
| libs/resources/src/services/blizzard-api.service.ts | BlizzAPI wrapper with retry |
| libs/resources/src/utils/axios-retry.config.ts      | axios-retry configuration   |

### Phase 1 - Modified Files

| File                                             | Changes                |
| ------------------------------------------------ | ---------------------- |
| apps/osint/src/services/character.service.ts     | Use BlizzardApiService |
| apps/osint/src/services/guild-summary.service.ts | Use BlizzardApiService |
| apps/dma/src/workers/auctions.worker.ts          | Use BlizzardApiService |

### Phase 2 - New Files

| File                                                         | Purpose                         |
| ------------------------------------------------------------ | ------------------------------- |
| libs/configuration/src/blizzard.config.ts                    | Centralized Blizzard API config |
| libs/resources/src/utils/redis-token-bucket.ts               | Redis token bucket utility      |
| libs/resources/src/services/blizzard-rate-limiter.service.ts | Unified rate limiter            |

---

## 6. Configuration

### Environment Variables

- BLIZZARD_RATE_CAPACITY=100
- BLIZZARD_RATE_REFILL=10
- BLIZZARD_RETRY_MAX=3
- BLIZZARD_RETRY_BASE_DELAY=1000
- BLIZZARD_RETRY_MAX_DELAY=30000

### axios-retry Settings

- retries: 3
- retryCondition: status 429 or 503
- retryDelay: exponential (1s, 2s, 4s) + jitter

### Token Bucket Settings

- capacity: 100 tokens
- refillRate: 10 tokens/sec

---

## 7. Decision Matrix

| Option                 | Prevents 429 | Handles 429 | Multi-Worker |  Status  |
| ---------------------- | :----------: | :---------: | :----------: | :------: |
| A: AdaptiveRateLimiter |      No      |     Yes     |      No      | Phase 1  |
| B: Redis Token Bucket  |     Yes      |     Yes     |     Yes      | Phase 2  |
| D: axios-retry         |      No      |     Yes     |      No      | Phase 1  |
| F: Hybrid              |     Yes      |     Yes     |     Yes      | Approved |

---

## 8. Implementation Status

### Phase 1: COMPLETED

| Task                                                    | Status |
| ------------------------------------------------------- | ------ |
| Install axios-retry                                     | DONE   |
| Create axios-retry.config.ts                            | DONE   |
| Create BlizzardApiService                               | DONE   |
| Integrate axios-retry in BlizzardApiService             | DONE   |
| Add maxDelayMs cap to AdaptiveRateLimiter               | DONE   |
| Create centralized rate limiter configs                 | DONE   |
| Integrate in character.service.ts                       | DONE   |
| Integrate in guild-summary.service.ts                   | DONE   |
| Integrate in guild-roster.service.ts                    | DONE   |
| Integrate in auctions.worker.ts                         | DONE   |
| Integrate in items.worker.ts                            | DONE   |
| Refactor characters.worker.ts to use BlizzardApiService | DONE   |
| Refactor guilds.worker.ts to use BlizzardApiService     | DONE   |
| Refactor realms.worker.ts to use BlizzardApiService     | DONE   |
| Refactor realms.service.ts to use BlizzardApiService    | DONE   |
| Refactor market services to use BlizzardApiService      | DONE   |
| Refactor guilds.service.ts to use BlizzardApiService    | DONE   |
| Refactor ladder.service.ts to use BlizzardApiService    | DONE   |
| Build verification                                      | DONE   |

### Phase 2: COMPLETED

| Task                                                  | Status |
| ----------------------------------------------------- | ------ |
| Create blizzard.config.ts                             | DONE   |
| Create redis-token-bucket.ts                          | DONE   |
| Create BlizzardRateLimiterService                     | DONE   |
| Update BlizzardApiService for proactive rate limiting | DONE   |
| Add HYBRID mode support                               | DONE   |

---

## 9. Architecture After Refactoring

### 4-Layer Defense (All Layers Active)

```markdown
┌─────────────────────────────────────────────────────────────────────┐
│ REQUEST FLOW │
├─────────────────────────────────────────────────────────────────────┤
│ │
│ Worker/Service │
│ │ │
│ ▼ │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ BlizzardApiService ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ Layer 1: Redis Token Bucket (Proactive) - NEW │││
│ │ │ • Cross-worker rate limiting │││
│ │ │ • Per-clientId token bucket │││
│ │ │ • ~10 req/sec per client │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │ │ ││
│ │ ▼ ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ Layer 2: AdaptiveRateLimiter (Reactive) │││
│ │ │ • Per-clientId rate limiting │││
│ │ │ • Exponential backoff on 403/429/503 │││
│ │ │ • Max delay cap: 60s │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │ │ ││
│ │ ▼ ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ Layer 3: axios-retry (Safety Net) │││
│ │ │ • Automatic retry on 429/503 │││
│ │ │ • Exponential backoff + jitter │││
│ │ │ • Max 3 retries │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │ │ ││
│ │ ▼ ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ Layer 4: BlizzAPI (HTTP Client) │││
│ │ │ • OAuth token management │││
│ │ │ • API request execution │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────────────┘│
│ │ │
│ ▼ │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Layer 5: BullMQ Job Retry (Last Resort) ││
│ │ • Job-level retry on worker failure ││
│ │ • Exponential backoff ││
│ │ • Dead letter queue for failed jobs ││
│ └─────────────────────────────────────────────────────────────────┘│
│ │
└─────────────────────────────────────────────────────────────────────┘
```

### Services Using BlizzardApiService

| Service | Worker/Service File      | Status   |
| ------- | ------------------------ | -------- |
| OSINT   | characters.worker.ts     | ✓ Active |
| OSINT   | guilds.worker.ts         | ✓ Active |
| OSINT   | realms.worker.ts         | ✓ Active |
| OSINT   | character.service.ts     | ✓ Active |
| OSINT   | guild-summary.service.ts | ✓ Active |
| OSINT   | guild-roster.service.ts  | ✓ Active |
| OSINT   | realms.service.ts        | ✓ Active |
| DMA     | auctions.worker.ts       | ✓ Active |
| DMA     | items.worker.ts          | ✓ Active |
| Market  | market.service.ts        | ✓ Active |
| Guilds  | guilds.service.ts        | ✓ Active |
| Ladder  | ladder.service.ts        | ✓ Active |

---

Created: 2026-03-09
Updated: 2026-03-09
