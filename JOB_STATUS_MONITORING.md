# Job Status & Source Monitoring

This guide explains how to monitor jobs with human-readable status codes and track their creation/update sources (`createdBy`, `updatedBy`) in CMNW.

## 🎯 Overview

The system now tracks:
- **Status Codes**: Numeric codes (100, 200, 429, etc.) mapped to human-readable labels (PENDING, SUCCESS, RATE_LIMITED)
- **CreatedBy Source**: Origin that created the job (e.g., OSINT-GUILD-ROSTER, OSINT-CHARACTER-REQUEST)
- **UpdatedBy Source**: Service that last updated the entity (e.g., OSINT-GUILD-GET, OSINT-MYTHIC-PLUS)

## 📊 Status Code Mappings

### Success Codes (200-299)
- `100` → **PENDING**: Job initialized but not yet processed
- `200` → **SUCCESS**: Job completed successfully
- `201` → **SUCCESS_SUMMARY**: Summary data fetched successfully
- `202` → **SUCCESS_MEDIA**: Media data fetched successfully
- `203` → **SUCCESS_PETS**: Pet data fetched successfully
- `204` → **SUCCESS_MOUNTS**: Mount data fetched successfully
- `205` → **SUCCESS_PROFESSIONS**: Profession data fetched successfully

### Special Codes (300-399)
- `305` → **NOT_EU_REGION**: Skipped - only EU region is supported

### Error Codes (400-599)
- `404` → **NOT_FOUND**: Entity not found in Blizzard API
- `429` → **RATE_LIMITED**: Too many requests - API rate limit hit
- `450` → **ERROR_GUILD**: Failed to fetch guild data
- `451` → **ERROR_ROSTER**: Failed to fetch guild roster
- `470` → **ERROR_PROFESSIONS**: Failed to fetch profession data
- `470` → **ERROR_MOUNTS**: Failed to fetch mount data
- `480` → **ERROR_PETS**: Failed to fetch pet data
- `490` → **ERROR_SUMMARY**: Failed to fetch summary data
- `498` → **ERROR_MEDIA**: Failed to fetch media data
- `499` → **ERROR_STATUS**: Failed to determine status
- `500` → **INTERNAL_ERROR**: Unexpected server error

## 📈 Prometheus Metrics

### New Metrics

#### `bullmq_jobs_by_status_code`
Counter tracking jobs by their completion status code.

**Labels:**
- `queue`: Queue name (e.g., `OSINT_Guilds`, `OSINT_Characters`)
- `status_code`: Numeric status code (e.g., `200`, `429`)
- `status_label`: Human-readable label (e.g., `SUCCESS`, `RATE_LIMITED`)
- `worker_id`: Worker container ID

**Example Query:**
```promql
# Rate of successful jobs per minute
rate(bullmq_jobs_by_status_code{status_label=~"SUCCESS.*"}[5m])

# Count of rate-limited jobs in last hour
sum(increase(bullmq_jobs_by_status_code{status_code="429"}[1h]))

# Error rate by queue
rate(bullmq_jobs_by_status_code{status_label=~"ERROR.*"}[5m]) by (queue)
```

#### `bullmq_jobs_by_source`
Counter tracking jobs by their creation/update source.

**Labels:**
- `queue`: Queue name
- `source`: Source identifier (e.g., `OSINT-GUILD-ROSTER`)
- `source_type`: Either `createdBy` or `updatedBy`
- `worker_id`: Worker container ID

**Example Query:**
```promql
# Jobs created by guild roster scanner
rate(bullmq_jobs_by_source{source="OSINT-GUILD-ROSTER", source_type="createdBy"}[5m])

# Distribution of update sources
sum by (source) (increase(bullmq_jobs_by_source{source_type="updatedBy"}[1h]))
```

## 🎨 Grafana Dashboard

**Dashboard URL**: https://grafana.cmnw.ru/d/cmnw-job-status-sources/cmnw-job-status-and-sources

### Panels

1. **Jobs by Status Code (Human-Readable)** - Time series showing job completion rates by status
2. **Jobs by Status Code Distribution** - Pie chart of status distribution over 6 hours
3. **Jobs by CreatedBy Source** - Stacked area chart of job creation sources
4. **Jobs by UpdatedBy Source** - Stacked area chart of job update sources
5. **Success Jobs (Last Hour)** - Stat panel with success count
6. **Error Jobs (Last Hour)** - Stat panel with error count (color-coded)
7. **Rate Limited Jobs (429)** - Stat panel tracking rate limit hits
8. **Pending Jobs** - Stat panel showing jobs not yet processed
9. **Status Code Breakdown by Queue** - Table with detailed breakdown
10. **Source Distribution** - Table showing createdBy vs updatedBy distribution
11. **Error Details by Queue** - Bar chart visualizing errors by type

### Auto-Refresh
The dashboard auto-refreshes every **30 seconds** to provide near real-time insights.

## 🔍 Common Queries

### Find Jobs with Specific Status
```promql
# All successful jobs
sum by (queue) (increase(bullmq_jobs_by_status_code{status_label="SUCCESS"}[1h]))

# All rate-limited jobs
sum by (queue) (increase(bullmq_jobs_by_status_code{status_label="RATE_LIMITED"}[1h]))

# All error jobs
sum by (queue, status_label) (increase(bullmq_jobs_by_status_code{status_label=~"ERROR.*"}[1h]))
```

### Track Job Sources
```promql
# Jobs created by specific source
sum by (queue) (increase(bullmq_jobs_by_source{source="OSINT-GUILD-ROSTER", source_type="createdBy"}[1h]))

# All updatedBy sources
sum by (source) (increase(bullmq_jobs_by_source{source_type="updatedBy"}[6h]))
```

### Success vs Error Ratio
```promql
# Success rate
sum(increase(bullmq_jobs_by_status_code{status_label=~"SUCCESS.*"}[1h]))
/
sum(increase(bullmq_jobs_by_status_code[1h]))
* 100

# Error rate percentage
sum(increase(bullmq_jobs_by_status_code{status_label=~"ERROR.*|RATE_LIMITED"}[1h]))
/
sum(increase(bullmq_jobs_by_status_code[1h]))
* 100
```

## 🔧 Implementation Details

### Worker Return Values
Workers return status codes that are automatically tracked:

```typescript
// In guilds.worker.ts
public async process(job: Job<GuildJobQueue, number>): Promise<number> {
  // ... processing logic ...
  return guildEntity.statusCode; // 200, 429, 450, etc.
}
```

### Job Data Structure
Job data includes `createdBy` and `updatedBy` fields:

```typescript
interface IQGuild {
  guid: string;
  name: string;
  realm: string;
  createdBy?: OSINT_SOURCE;  // e.g., 'OSINT-GUILD-ROSTER'
  updatedBy: OSINT_SOURCE;   // e.g., 'OSINT-GUILD-GET'
}
```

### Automatic Metric Collection
The `QueueMetricsService` listens to job completion events and automatically:
1. Extracts the status code from job return value
2. Maps status code to human-readable label
3. Extracts `createdBy` and `updatedBy` from job data
4. Increments appropriate Prometheus counters

## 🚨 Alerting Examples

### High Error Rate Alert
```yaml
- alert: HighJobErrorRate
  expr: |
    rate(bullmq_jobs_by_status_code{status_label=~"ERROR.*"}[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High job error rate on {{ $labels.queue }}"
    description: "{{ $labels.queue }} has {{ $value }} errors/sec with status {{ $labels.status_label }}"
```

### Rate Limit Alert
```yaml
- alert: APIRateLimitHit
  expr: |
    increase(bullmq_jobs_by_status_code{status_code="429"}[5m]) > 50
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "API rate limit hit on {{ $labels.queue }}"
    description: "{{ $value }} jobs rate limited in last 5 minutes"
```

### Unusual Source Activity
```yaml
- alert: UnusualJobSource
  expr: |
    rate(bullmq_jobs_by_source[5m]) by (source, queue) > 100
  for: 10m
  labels:
    severity: info
  annotations:
    summary: "High activity from {{ $labels.source }}"
    description: "Source {{ $labels.source }} creating {{ $value }} jobs/sec on {{ $labels.queue }}"
```

## 📚 Status Code Reference by Queue

### OSINT_Guilds
- `100` - Guild queued but not processed
- `200` - Guild data updated successfully
- `305` - Guild skipped (non-EU region)
- `429` - Rate limited by Blizzard API
- `450` - Failed to fetch guild summary
- `451` - Failed to fetch guild roster
- `500` - Unexpected error during processing

### OSINT_Characters
- `100` - Character queued but not processed
- `200` - Character data updated successfully
- `201` - Character summary fetched
- `202` - Character media fetched
- `203` - Character pets fetched
- `204` - Character mounts fetched
- `205` - Character professions fetched
- `429` - Rate limited
- `490` - Failed to fetch summary
- `498` - Failed to fetch media
- `500` - Unexpected error

## 🛠️ Troubleshooting

### Metrics Not Appearing

1. **Check if jobs are completing:**
   ```bash
   curl http://localhost:3000/api/queue-monitor/stats
   ```

2. **Verify Prometheus is scraping:**
   ```bash
   curl http://localhost:3000/metrics | grep bullmq_jobs_by_status_code
   ```

3. **Check Prometheus targets:**
   ```bash
   curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "cmnw-api")'
   ```

### Status Codes Not Being Tracked

Ensure workers are returning numeric status codes:
```typescript
return guildEntity.statusCode; // Must be a number
```

### Sources Not Appearing

Verify job data includes `createdBy` or `updatedBy`:
```typescript
{
  guid: 'guild@realm',
  name: 'Guild Name',
  createdBy: OSINT_SOURCE.GUILD_ROSTER,  // Required
  updatedBy: OSINT_SOURCE.GUILD_GET       // Required
}
```

## 📞 Support

For issues or questions:
1. Check dashboard: https://grafana.cmnw.ru/d/cmnw-job-status-sources
2. Review metrics: http://localhost:3000/metrics
3. Inspect logs: `apps/api/src/queue/queue-metrics.service.ts`
