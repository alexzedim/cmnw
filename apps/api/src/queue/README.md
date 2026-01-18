# Queue Monitoring System

This module provides monitoring and management capabilities for RabbitMQ queues in the CMNW application.

## Features

- **Real-time Statistics**: Live stats for all queues including waiting/active counts
- **Progress Tracking**: Per-queue completion percentage and estimates
- **Performance Metrics**: Processing rate and average processing time (when available)
- **Estimated Completion**: Estimate remaining time based on current rate
- **Queue Management**: Purge queues via API (use with caution)
- **RabbitMQ Health & Alerts**: Dedicated health and alert endpoints for RabbitMQ

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

### RabbitMQ Health

```http
GET /api/queue/health/rabbitmq
GET /api/queue/health/rabbitmq/metrics
GET /api/queue/health/rabbitmq/queue/:queueName
GET /api/queue/health/rabbitmq/dlq/status
GET /api/queue/health/rabbitmq/dlq/messages/:limit
POST /api/queue/health/rabbitmq/queue/:queueName/purge
GET /api/queue/health/rabbitmq/connection
GET /api/queue/health/rabbitmq/report
```

### RabbitMQ Alerts

```http
GET /api/queue/alerts/rabbitmq
GET /api/queue/alerts/rabbitmq/summary
GET /api/queue/alerts/rabbitmq/all
GET /api/queue/alerts/rabbitmq/critical
GET /api/queue/alerts/rabbitmq/warning
GET /api/queue/alerts/rabbitmq/severity/:severity
DELETE /api/queue/alerts/rabbitmq
DELETE /api/queue/alerts/rabbitmq/resolved
GET /api/queue/alerts/rabbitmq/stats
GET /api/queue/alerts/rabbitmq/history
GET /api/queue/alerts/rabbitmq/detail/:alertId
```

### Metrics

Prometheus metrics are available at:

```http
GET /metrics
```

## Notes

- RabbitMQ does not expose BullMQ-style delayed/paused states, so those counts remain `0`.
- Processing rate and average processing time depend on RabbitMQ monitor outputs; if unavailable they default to `0`.
