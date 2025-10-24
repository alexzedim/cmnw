# Queue Monitoring System

This module provides comprehensive monitoring and management capabilities for all BullMQ queues in the CMNW application.

## Features

- **Real-time Statistics**: Get live stats for all queues including waiting, active, completed, and failed job counts
- **Progress Tracking**: Monitor individual job progress with percentage completion
- **Performance Metrics**: Track processing rates (jobs/minute) and average processing times
- **Estimated Completion**: Calculate estimated time remaining for queue processing
- **Queue Management**: Pause and resume queues via API
- **Bull Board Integration**: Visual dashboard at `/queues`

## Monitored Queues

- `DMA_Auctions` - Auction house data processing
- `OSINT_Characters` - Character indexing and updates
- `OSINT_Guilds` - Guild roster and information updates
- `OSINT_Profiles` - Profile updates (WarcraftLogs, RaiderIO, WowProgress)
- `Realms` - Realm data synchronization
- `Items` - Item data indexing
- `Pricing` - Pricing calculations
- `Valuations` - Valuation processing

## API Endpoints

### Get All Queue Statistics

```http
GET /api/queue-monitor/stats
```

Returns comprehensive statistics for all queues:

```json
{
  "timestamp": "2025-01-24T09:35:29.000Z",
  "queues": [
    {
      "queueName": "OSINT_Characters",
      "counts": {
        "waiting": 10000,
        "active": 75,
        "completed": 5000,
        "failed": 12,
        "delayed": 0,
        "paused": 0
      },
      "activeJobs": [
        {
          "jobId": "character-123",
          "name": "Alexzedim@silvermoon",
          "progress": 50,
          "timestamp": 1706088929000
        }
      ],
      "estimatedCompletion": "2h 15m",
      "processingRate": 75.5,
      "averageProcessingTime": 1250
    }
  ],
  "totalWaiting": 25000,
  "totalActive": 150,
  "totalCompleted": 100000,
  "totalFailed": 50
}
```

### Get Detailed Progress for Specific Queue

```http
GET /api/queue-monitor/stats/:queueName
```

Example: `GET /api/queue-monitor/stats/OSINT_Characters`

Returns detailed progress information:

```json
{
  "queueName": "OSINT_Characters",
  "current": 5000,
  "total": 15000,
  "completionPercentage": 33,
  "estimatedTimeRemaining": "2h 15m",
  "activeWorkers": 75,
  "jobs": [
    {
      "id": "character-123",
      "name": "Alexzedim@silvermoon",
      "progress": 50,
      "state": "active",
      "timestamp": 1706088929000,
      "attemptsMade": 1,
      "processedOn": 1706088920000,
      "finishedOn": null
    }
  ]
}
```

### Pause Queue

```http
POST /api/queue-monitor/pause/:queueName
```

Pauses processing for the specified queue.

### Resume Queue

```http
POST /api/queue-monitor/resume/:queueName
```

Resumes processing for the specified queue.

## Bull Board Dashboard

Access the visual queue monitoring dashboard at:

```
http://localhost:3000/queues
```

The Bull Board provides:
- Real-time queue visualization
- Job details and logs
- Retry failed jobs
- Manual job management
- Queue metrics and charts

## Usage Examples

### Monitor Character Indexing Progress

**Via API:**
```bash
# Get overview of all queues
curl http://localhost:3000/api/queue-monitor/stats

# Get detailed progress for character indexing
curl http://localhost:3000/api/queue-monitor/stats/OSINT_Characters
```

**Via Bull Board:**
```
http://localhost:3000/queues
```

**Via Grafana:**
```
https://grafana.cmnw.ru/d/cmnw-queue-monitoring/cmnw-queue-monitoring
```

### Pause Queue During Maintenance

```bash
# Pause the guilds queue
curl -X POST http://localhost:3000/api/queue-monitor/pause/OSINT_Guilds

# Resume after maintenance
curl -X POST http://localhost:3000/api/queue-monitor/resume/OSINT_Guilds
```

## Implementation Details

### Processing Rate Calculation

Processing rate is calculated based on jobs completed in the last 5 minutes:
- Jobs completed in last 5 minutes / 5 = jobs per minute

### Estimated Completion Time

Estimated time is calculated as:
- `waiting jobs / processing rate = minutes remaining`

### Active Job Progress

The system tracks up to 10 active jobs per queue and reports their current progress percentage (0-100).

## Performance Considerations

- Statistics are fetched in real-time from Redis
- Completed job history is limited to last 100 jobs for performance
- Active job tracking is limited to 10 jobs for display
- All queue operations are non-blocking and async

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Historical metrics storage
- [ ] Alert system for failed jobs threshold
- [ ] Performance analytics dashboard
- [ ] Queue priority adjustment API
- [ ] Bulk job management operations
