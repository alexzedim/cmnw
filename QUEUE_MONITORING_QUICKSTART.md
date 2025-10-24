# Queue Monitoring - Quick Start

## 🚀 Immediate Access

### 1. **Bull Board** (Operational)
```
http://localhost:3000/queues
```
- View all queues, jobs, and status
- Retry failed jobs manually
- See job details and logs

### 2. **Grafana Dashboard** (Analytics)
```
https://grafana.cmnw.ru/d/cmnw-queue-monitoring/cmnw-queue-monitoring
```
- Real-time metrics visualization
- Historical trends and graphs
- Processing rates and ETAs
- Auto-refreshes every 10 seconds

### 3. **Prometheus Metrics** (Raw Data)
```
http://localhost:3000/metrics
```
- Raw metrics endpoint
- Scraped by Prometheus every 15 seconds
- Used by Grafana for visualization

### 4. **REST API** (Programmatic)
```bash
# All queues overview
curl http://localhost:3000/api/queue-monitor/stats

# Specific queue detail
curl http://localhost:3000/api/queue-monitor/stats/OSINT_Characters

# Pause queue
curl -X POST http://localhost:3000/api/queue-monitor/pause/OSINT_Characters

# Resume queue
curl -X POST http://localhost:3000/api/queue-monitor/resume/OSINT_Characters
```

## 📊 Available Metrics

| Metric | Description |
|--------|-------------|
| `bullmq_queue_waiting_jobs` | Jobs in queue waiting to be processed |
| `bullmq_queue_active_jobs` | Jobs currently being processed |
| `bullmq_queue_completed_jobs` | Total completed jobs |
| `bullmq_queue_failed_jobs` | Total failed jobs |
| `bullmq_queue_processing_rate` | Jobs per minute |
| `bullmq_queue_avg_processing_time_ms` | Average time to process a job |

## 🎯 Monitoring Strategy

### For Active Operations
→ **Bull Board** for quick checks and manual fixes

### For Analysis & Trends  
→ **Grafana Dashboard** for historical data and patterns

### For Automation
→ **REST API** for custom scripts and integrations

### For Alerting
→ **Prometheus** with alerting rules (see main guide)

## 📍 Queue Reference

| Queue | Purpose | Workers |
|-------|---------|---------|
| `OSINT_Characters` | Character indexing | ~75/min |
| `OSINT_Guilds` | Guild rosters | Variable |
| `OSINT_Profiles` | WCL/RIO/WP updates | ~10/min |
| `DMA_Auctions` | Auction data | High |
| `Items` | Item indexing | Medium |
| `Pricing` | Price calculations | Medium |
| `Valuations` | Valuations | Low |
| `Realms` | Realm sync | Low |

## 🔧 Configuration

### Prometheus Scrape Config
Located at: `../core/prometheus/scrape-configs/cmnw.yml`

### Grafana Dashboard
- **UID**: `cmnw-queue-monitoring`
- **Folder**: CMNW Monitoring
- Created via: MCP Grafana server

### API Metrics Endpoint
Automatically enabled at `/metrics` when queue module loads.

## 📖 Full Documentation

See [QUEUE_MONITORING_GUIDE.md](./QUEUE_MONITORING_GUIDE.md) for:
- Detailed setup instructions
- Prometheus alerting rules
- Troubleshooting guide
- Customization options
- Advanced usage examples

## ⚡ Quick Health Check

```bash
# Check API is running
curl http://localhost:3000/api/queue-monitor/stats | jq '.totalWaiting'

# Check metrics are exposed
curl http://localhost:3000/metrics | grep bullmq_queue_waiting_jobs

# Open Grafana dashboard
open https://grafana.cmnw.ru/d/cmnw-queue-monitoring/cmnw-queue-monitoring
```

## 🆘 Common Issues

**Dashboard empty?**
→ Ensure Prometheus is scraping the `/metrics` endpoint

**Metrics not updating?**
→ Check that QueueMetricsService is running (auto-starts with API)

**Can't access Bull Board?**
→ Verify API is running and accessible at port 3000

For more help, see the troubleshooting section in the full guide.
