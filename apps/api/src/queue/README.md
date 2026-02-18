# Queue Monitoring System

This module provides monitoring and management capabilities for BullMQ queues in the CMNW application.

## Features

- **Real-time Statistics**: Live stats for all queues including waiting/active counts
- **Progress Tracking**: Per-queue completion percentage and estimates
- **Performance Metrics**: Processing rate and average processing time (when available)
- **Estimated Completion**: Estimate remaining time based on current rate
- **Queue Management**: Purge queues via API (use with caution)
- **BullMQ Monitoring**: Dedicated monitoring endpoints for BullMQ
- **Bull Board UI**: Visual dashboard for monitoring and managing queues

## Monitored Queues

- `osint.characters` - Character data processing
- `osint.guilds` - Guild data processing
- `osint.profiles` - Profile data processing
- `dma.auctions` - Auction data processing
- `dma.items` - Item data processing
- `core.realms` - Realm data processing
- `dma.valuations` - Valuation data processing

## API Endpoints

### Queue Monitor Statistics

```http
GET /api/queue-monitor/stats
```

```http
GET /api/queue-monitor/stats/:queueName
```

### Metrics

Prometheus metrics are available at:

```http
GET /metrics
```

### Bull Board UI

The Bull Board UI provides a visual dashboard for monitoring and managing BullMQ queues. It is implemented using the official `@bull-board/nestjs` module.

**Implementation:**

- **Root Module Configuration**: Routes are automatically configured via `BullBoardModule.forRoot()` in the root module
- **Queue Registration**: Queues are registered via `BullBoardModule.forFeature()` in the QueueModule
- **No Custom Service**: The implementation uses the official NestJS module directly; no custom `BullBoardService` is required

```http
GET /queues
```

**Features:**

- Visual dashboard showing all queues
- Real-time job details and status
- Retry failed jobs with one click
- Remove or pause jobs
- View job data and stack traces
- Filter jobs by status (waiting, active, completed, failed, delayed)

**Access:**

```
http://localhost:3000/queues
```

**Note:** The Bull Board UI provides full management capabilities. Use caution when performing operations like retrying or removing jobs in production.

## Notes

- BullMQ exposes delayed/paused states, so those counts reflect actual queue states.
- Processing rate and average processing time depend on BullMQ queue methods; if unavailable they default to `0`.
