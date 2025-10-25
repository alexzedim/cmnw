# Quick Status Reference

## 🚀 Quick Start

**Grafana Dashboard**: https://grafana.cmnw.ru/d/cmnw-job-status-sources/cmnw-job-status-and-sources

## 📊 Status Code Cheat Sheet

| Code | Label | Meaning |
|------|-------|---------|
| 100 | `PENDING` | Not yet processed |
| 200 | `SUCCESS` | ✅ Completed successfully |
| 201 | `SUCCESS_SUMMARY` | ✅ Summary fetched |
| 202 | `SUCCESS_MEDIA` | ✅ Media fetched |
| 203 | `SUCCESS_PETS` | ✅ Pets fetched |
| 204 | `SUCCESS_MOUNTS` | ✅ Mounts fetched |
| 205 | `SUCCESS_PROFESSIONS` | ✅ Professions fetched |
| 305 | `NOT_EU_REGION` | ⚠️ Skipped (non-EU) |
| 404 | `NOT_FOUND` | ❌ Not found in API |
| 429 | `RATE_LIMITED` | ⏳ API rate limit |
| 450 | `ERROR_GUILD` | ❌ Guild fetch failed |
| 451 | `ERROR_ROSTER` | ❌ Roster fetch failed |
| 470 | `ERROR_PROFESSIONS` | ❌ Professions failed |
| 480 | `ERROR_PETS` | ❌ Pets failed |
| 490 | `ERROR_SUMMARY` | ❌ Summary failed |
| 498 | `ERROR_MEDIA` | ❌ Media failed |
| 500 | `INTERNAL_ERROR` | ❌ Unexpected error |

## 🔍 Essential PromQL Queries

### Success Rate
```promql
sum(increase(bullmq_jobs_by_status_code{status_label=~"SUCCESS.*"}[1h]))
/ sum(increase(bullmq_jobs_by_status_code[1h])) * 100
```

### Error Count (Last Hour)
```promql
sum(increase(bullmq_jobs_by_status_code{status_label=~"ERROR.*"}[1h]))
```

### Rate Limited Jobs
```promql
sum(increase(bullmq_jobs_by_status_code{status_code="429"}[1h]))
```

### Jobs by Source
```promql
# CreatedBy
sum by (source) (increase(bullmq_jobs_by_source{source_type="createdBy"}[1h]))

# UpdatedBy
sum by (source) (increase(bullmq_jobs_by_source{source_type="updatedBy"}[1h]))
```

## 📍 OSINT Sources

### CreatedBy Sources
- `OSINT-GUILD-REQUEST` - Manual guild lookup
- `OSINT-GUILD-ROSTER` - Guild roster scan
- `OSINT-CHARACTER-REQUEST` - Manual character lookup
- `OSINT-HALL-OF-FAME` - Top 100 guilds
- `OSINT-MYTHIC-PLUS` - M+ leaderboard
- `OSINT-PVP-LADDER` - PvP rankings
- `OSINT-WOW-PROGRESS-LFG` - LFG listings

### UpdatedBy Sources
- `OSINT-GUILD-GET` - Guild data refresh
- `OSINT-CHARACTER-GET` - Character data refresh
- `OSINT-GUILD-INDEX` - Automated indexing
- `OSINT-CHARACTER-INDEX` - Automated indexing
- `OSINT-WARCRAFT-LOGS` - WCL integration
- `OSINT-WOW-PROGRESS` - WP integration

## 🎯 Common Use Cases

### Find problematic guilds
```promql
sum by (queue) (increase(bullmq_jobs_by_status_code{queue="OSINT_Guilds", status_label=~"ERROR.*"}[1h]))
```

### Monitor API health
```promql
rate(bullmq_jobs_by_status_code{status_code="429"}[5m])
```

### Track roster scans
```promql
rate(bullmq_jobs_by_source{source="OSINT-GUILD-ROSTER"}[5m])
```

## 🛠️ Troubleshooting

### No metrics appearing?
```bash
# Check metrics endpoint
curl http://localhost:3000/metrics | grep bullmq_jobs_by_status_code

# Check if jobs are running
curl http://localhost:3000/api/queue-monitor/stats
```

### Workers not reporting status?
Workers must return numeric status codes:
```typescript
return guildEntity.statusCode; // 200, 429, etc.
```

### Sources not tracked?
Job data must include createdBy/updatedBy:
```typescript
{
  updatedBy: OSINT_SOURCE.GUILD_ROSTER
}
```

## 📖 Full Documentation

See `JOB_STATUS_MONITORING.md` for complete details.
