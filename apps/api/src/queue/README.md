# Queue Monitoring System

This module provides monitoring and management capabilities for BullMQ queues in the CMNW application.

## Features

- **Real-time Statistics**: Live stats for all queues including waiting/active counts
- **Progress Tracking**: Per-queue completion percentage and estimates
- **Performance Metrics**: Processing rate and average processing time (when available)
- **Estimated Completion**: Estimate remaining time based on current rate
- **Queue Management**: Purge queues via API (use with caution)
- **BullMQ Monitoring**: Dedicated monitoring endpoints for BullMQ

## Monitored Queues

- `osint.characters` - Character data processing
- `osint.guilds` - Guild data processing
- `osint.profiles` - Profile data processing
- `dma.auctions` - Auction data processing
- `dma.items` - Item data processing
- `core.realms` - Realm data processing
- `dlx.dlq` - Dead Letter Queue

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

## Notes

- BullMQ exposes delayed/paused states, so those counts reflect actual queue states.
- Processing rate and average processing time depend on BullMQ queue methods; if unavailable they default to `0`.
