# Worker Concurrency Optimization Guide

## Overview
This document explains the optimal worker concurrency configuration based on Blizzard API key analysis and request patterns.

## API Key Analysis

### Current Key Distribution
- **Total Blizzard API Keys**: 6
- **OSINT Tagged Keys**: 5 keys
- **DMA Tagged Keys**: 1 key

### Rate Limits
- **Official Limit**: 100 requests/second per key
- **Safe Capacity**: 70-80 requests/second (accounting for burst timing and network latency)
- **OSINT Total Capacity**: 5 keys × 70 RPS = **350 RPS**
- **DMA Total Capacity**: 1 key × 70 RPS = **70 RPS**

## Worker Request Patterns

### OSINT Workers

#### Characters Worker
- **Requests per job**: 5 requests (if character is valid)
  - `getStatus()`: 1 request
  - `getSummary()`: 1 request
  - `getPets()`: 1 request
  - `getMounts()`: 1 request
  - `getMedia()`: 1 request
- **Average**: ~3-4 requests per character (accounting for 404s and invalid characters)

#### Guilds Worker
- **Requests per job**: 2 requests
  - `getSummary()`: 1 request
  - `getRoster()`: 1 request

#### Profile Worker
- **Requests per job**: Similar to Characters (5 requests)
- **Processing time**: Longer (includes additional data processing)

### DMA Workers

#### Items Worker
- **Requests per job**: 2 requests
  - `getItem()`: 1 request
  - `getItemMedia()`: 1 request
- **Processing characteristics**: Lightweight, fast

#### Auctions Worker
- **Requests per job**: 1 request
  - `getAuctions()`: 1 request per connected-realm or commodity
- **Processing characteristics**: IO-heavy, large data sets

## Optimal Configuration Calculations

### OSINT Workers (5 keys, 350 RPS capacity)

#### Characters
```
350 RPS ÷ 4 req/char = 87.5 chars/sec theoretical max
× 0.7 safety margin = 61 chars/sec safe capacity
÷ 5 replicas = 12 chars/sec per replica
Optimal concurrency: 2-3 per replica
```

#### Guilds
```
350 RPS ÷ 2 req/guild = 175 guilds/sec theoretical max
× 0.7 safety margin = 122 guilds/sec safe capacity
Optimal concurrency: 2 (jobs are database-heavy)
```

#### Profile
```
Similar to characters but longer processing time
Optimal concurrency: 1 (long-running, complex jobs)
```

### DMA Workers (1 key, 70 RPS capacity)

#### Auctions
```
70 RPS ÷ 1 req/realm = 70 realms/sec theoretical max
Optimal concurrency: 2 (IO-heavy, can process while waiting)
```

#### Items
```
70 RPS ÷ 2 req/item = 35 items/sec theoretical max
× 0.7 safety margin = 24 items/sec safe capacity
Optimal concurrency: 3-5 (lightweight jobs)
```

## Recommended Configuration

### Development Environment
```bash
# Based on: 5 OSINT keys (350 RPS), 1 DMA key (70 RPS)
CHARACTERS_WORKER_CONCURRENCY=2
GUILDS_WORKER_CONCURRENCY=2
PROFILE_WORKER_CONCURRENCY=1
AUCTIONS_WORKER_CONCURRENCY=2
ITEMS_WORKER_CONCURRENCY=5

OSINT_REPLICAS=5
DMA_REPLICAS=2
```

**Expected Throughput**:
- Characters: ~60 jobs/sec (10 chars/sec per replica × 5 replicas × 2 concurrency)
- Guilds: ~10 guilds/sec
- Items: ~10 items/sec (5 concurrency × 2 replicas)

### Production Environment
```bash
# Higher concurrency and replicas for better throughput and redundancy
CHARACTERS_WORKER_CONCURRENCY=3
GUILDS_WORKER_CONCURRENCY=2
PROFILE_WORKER_CONCURRENCY=1
AUCTIONS_WORKER_CONCURRENCY=3
ITEMS_WORKER_CONCURRENCY=7

OSINT_REPLICAS=8
DMA_REPLICAS=3
```

**Expected Throughput**:
- Characters: ~120 jobs/sec (5 chars/sec per replica × 8 replicas × 3 concurrency)
- Guilds: ~16 guilds/sec
- Items: ~21 items/sec (7 concurrency × 3 replicas)

## Key Recommendations

### Immediate Actions
1. ✅ Current OSINT keys (5) are well-distributed
2. ⚠️  **Add 2-3 more DMA keys** for optimal throughput
   - Current: 1 DMA key (70 RPS)
   - Target: 3-4 DMA keys (210-280 RPS)
   - This would support higher concurrency and better throughput

### Rate Limiter Configuration
Consider implementing rate limiter in queue options:
```typescript
{
  limiter: {
    max: 75,        // requests
    duration: 1000  // per second
  }
}
```

### Monitoring Metrics
Track these metrics in Grafana:
- `bullmq_queue_processing_rate` - Jobs per minute
- `bullmq_queue_active_jobs` - Active job count
- `bullmq_queue_waiting_jobs` - Queue depth
- API rate limit errors (429 responses)

## Managing Concurrency

### Via Environment Variables
Update values in `.env` or `stack.env`:
```bash
CHARACTERS_WORKER_CONCURRENCY=3
```

### Via API (Runtime)
```bash
curl -X POST http://localhost:8000/workers/concurrency \
  -H "Content-Type: application/json" \
  -d '{"worker":"characters","concurrency":3,"replicas":8}'
```

**Note**: Workers must be restarted for changes to take effect.

### Via Grafana
Set up alerts and webhooks to automatically adjust concurrency based on queue depth:
1. Create alert: `bullmq_queue_waiting_jobs > 1000`
2. Webhook: POST to `/workers/concurrency`
3. Payload: Increase concurrency by 1
4. Manual restart workers via Docker Compose

## Troubleshooting

### High Queue Depth
**Symptoms**: `bullmq_queue_waiting_jobs` > 1000
**Solutions**:
- Increase worker concurrency
- Add more replicas
- Check for API rate limit errors (429)

### Rate Limit Errors
**Symptoms**: Frequent 429 responses
**Solutions**:
- Decrease worker concurrency
- Add more API keys
- Implement/adjust rate limiter

### Low Throughput
**Symptoms**: Processing rate < expected
**Solutions**:
- Check database connection pool
- Review worker logs for errors
- Verify API key validity
- Check network latency

## Performance Targets

### Development
- Character updates: 50-70/sec
- Guild updates: 8-12/sec
- Item updates: 8-12/sec

### Production
- Character updates: 100-150/sec
- Guild updates: 15-20/sec
- Item updates: 20-30/sec

## Version History

- **v6.9.0** (2025-01-24)
  - Initial implementation of dynamic worker concurrency
  - Calculated optimal values based on 6 API keys (5 OSINT, 1 DMA)
  - Implemented API endpoints for runtime management
