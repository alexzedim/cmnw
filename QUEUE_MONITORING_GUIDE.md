# CMNW Queue Monitoring - Complete Integration Guide

This guide covers all available options for monitoring your CMNW queue system.

## 📊 Available Monitoring Options

### 1. **Bull Board (Built-in Web UI)**
- **Access**: `http://localhost:3000/queues`
- **Features**: Visual dashboard, job details, retry failed jobs, manual job management
- **Setup**: Already integrated, no additional configuration needed

### 2. **CLI Tool (Terminal Dashboard)**
- **Location**: `tools/queue-monitor-cli.js`
- **Features**: Real-time terminal dashboard with progress bars, color-coded status, ETA calculations

#### Usage:

```bash
# Monitor all queues
node tools/queue-monitor-cli.js

# Monitor specific queue
node tools/queue-monitor-cli.js OSINT_Characters

# Set custom API URL
CMNW_API_URL=https://api.cmnw.ru node tools/queue-monitor-cli.js
```

**Example Output:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║                    CMNW Queue Monitoring Dashboard                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Summary:
  Total Waiting:      10,000
  Total Active:          75
  Total Completed:  100,000
  Total Failed:          12

Queue Details:

▸ OSINT_Characters      
  Progress: ████████████████░░░░░░░░░░░░░░ 55%
  Waiting:  10,000  Active:  75  Failed:   2  Completed:  100,000
  Rate: 75.5 jobs/min  ETA: 2h 15m  Avg Time: 1250ms
```

### 3. **REST API Endpoints**

#### Get All Queues Stats
```bash
curl http://localhost:3000/api/queue-monitor/stats
```

#### Get Detailed Queue Progress
```bash
curl http://localhost:3000/api/queue-monitor/stats/OSINT_Characters
```

#### Pause/Resume Queue
```bash
# Pause
curl -X POST http://localhost:3000/api/queue-monitor/pause/OSINT_Characters

# Resume
curl -X POST http://localhost:3000/api/queue-monitor/resume/OSINT_Characters
```

### 4. **Prometheus Metrics**

#### Exposed Metrics

The API exposes Prometheus-compatible metrics at `/metrics`:

- `bullmq_queue_waiting_jobs{queue="OSINT_Characters"}` - Waiting jobs count
- `bullmq_queue_active_jobs{queue="OSINT_Characters"}` - Active jobs count
- `bullmq_queue_completed_jobs{queue="OSINT_Characters"}` - Completed jobs count
- `bullmq_queue_failed_jobs{queue="OSINT_Characters"}` - Failed jobs count
- `bullmq_queue_delayed_jobs{queue="OSINT_Characters"}` - Delayed jobs count
- `bullmq_queue_processing_rate{queue="OSINT_Characters"}` - Jobs per minute
- `bullmq_queue_avg_processing_time_ms{queue="OSINT_Characters"}` - Average processing time
- `bullmq_jobs_total{queue="OSINT_Characters",status="completed"}` - Total jobs counter

#### Setup Prometheus Scraping

1. **Add to your `prometheus.yml`** (or create separate config):

```yaml
scrape_configs:
  - job_name: 'cmnw-api'
    static_configs:
      - targets: ['your-cmnw-api-host:3000']
    scrape_interval: 15s
    metrics_path: /metrics
```

2. **Update docker-compose analytics config**:

In `D:\Projects\alexzedim\core\docker-compose.analytics.yml`, add to the scrape_configs section:

```yaml
- job_name: 'cmnw-api'
  static_configs:
    - targets: ['128.0.0.255:3000']  # Update with your host
  scrape_interval: 15s
  metrics_path: /metrics
```

3. **Reload Prometheus**:

```bash
curl -X POST http://localhost:9090/-/reload
```

### 5. **Grafana Dashboard**

#### Import Dashboard

1. Open Grafana at `https://grafana.cmnw.ru` (or your Grafana URL)
2. Go to **Dashboards** → **Import**
3. Upload `grafana/dashboards/queue-monitoring.json`
4. Select your Prometheus datasource
5. Click **Import**

#### Dashboard Features

- **Total Waiting Jobs Gauge** - Overview of all waiting jobs
- **Waiting Jobs by Queue** - Time series graph per queue
- **Active Jobs by Queue** - Current active workers
- **Processing Rate** - Jobs per minute by queue
- **Average Processing Time** - Performance metrics
- **Failed Jobs** - Error tracking
- **Queue Status Summary Table** - Quick overview table

The dashboard auto-refreshes every 10 seconds.

## 🔧 Configuration

### Environment Variables

```bash
# API Base URL for CLI tool
export CMNW_API_URL=https://api.cmnw.ru

# Grafana Configuration (already in your .env)
GRAFANA_URL=https://grafana.cmnw.ru
GRAFANA_SERVICE_ACCOUNT_TOKEN=<your-token>
```

### Prometheus Configuration

The metrics service updates every 15 seconds, aligned with Prometheus scrape interval for optimal performance.

## 📈 Usage Scenarios

### Monitor Character Indexing Progress

**CLI:**
```bash
node tools/queue-monitor-cli.js OSINT_Characters
```

**API:**
```bash
curl http://localhost:3000/api/queue-monitor/stats/OSINT_Characters | jq
```

**Grafana:** Open dashboard and filter by "OSINT_Characters" queue

### Alert on High Failure Rate

**PromQL Query:**
```promql
rate(bullmq_jobs_total{status="failed"}[5m]) > 1
```

### Calculate ETA for Guild Processing

The CLI and API automatically calculate estimated completion time based on:
- Current processing rate (jobs/minute)
- Remaining jobs in queue
- Formula: `ETA = waiting_jobs / processing_rate`

### Monitor Overall System Health

**Prometheus Query:**
```promql
# Total jobs waiting across all queues
sum(bullmq_queue_waiting_jobs)

# Total active workers
sum(bullmq_queue_active_jobs)

# Average processing time across all queues
avg(bullmq_queue_avg_processing_time_ms)
```

## 🎯 Recommended Monitoring Strategy

1. **Real-time**: Use CLI tool during active operations
2. **Operational**: Bull Board for manual intervention
3. **Historical**: Grafana dashboards for trends and analysis
4. **Alerting**: Prometheus rules for automated notifications
5. **Integration**: REST API for custom tooling

## 🚨 Alerting Rules

Create `prometheus/rules/cmnw-queue-alerts.yml`:

```yaml
groups:
  - name: cmnw_queue_alerts
    interval: 30s
    rules:
      - alert: HighQueueBacklog
        expr: bullmq_queue_waiting_jobs > 50000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High queue backlog on {{ $labels.queue }}"
          description: "Queue {{ $labels.queue }} has {{ $value }} waiting jobs"

      - alert: HighFailureRate
        expr: rate(bullmq_jobs_total{status="failed"}[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High failure rate on {{ $labels.queue }}"
          description: "{{ $labels.queue }} failing {{ $value }} jobs/sec"

      - alert: NoActiveWorkers
        expr: bullmq_queue_waiting_jobs > 100 and bullmq_queue_active_jobs == 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "No active workers for {{ $labels.queue }}"
          description: "Queue {{ $labels.queue }} has jobs but no workers"

      - alert: SlowProcessing
        expr: bullmq_queue_avg_processing_time_ms > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow processing on {{ $labels.queue }}"
          description: "Average time {{ $value }}ms"
```

## 🔍 Troubleshooting

### Metrics not showing in Prometheus

1. Check if `/metrics` endpoint is accessible:
   ```bash
   curl http://localhost:3000/metrics
   ```

2. Verify Prometheus scrape config:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

3. Check Prometheus logs for scrape errors

### CLI tool connection errors

1. Verify API is running:
   ```bash
   curl http://localhost:3000/api/queue-monitor/stats
   ```

2. Set correct API URL:
   ```bash
   export CMNW_API_URL=http://your-api-host:3000
   ```

### Grafana dashboard empty

1. Ensure Prometheus datasource is configured in Grafana
2. Verify metrics are being scraped (check Prometheus)
3. Check time range in dashboard (default: last 1 hour)

## 📝 Queues Reference

| Queue Name | Purpose | Typical Volume |
|------------|---------|----------------|
| `DMA_Auctions` | Auction house data | High |
| `OSINT_Characters` | Character indexing | Very High |
| `OSINT_Guilds` | Guild rosters | High |
| `OSINT_Profiles` | WCL/RIO/WP updates | Medium |
| `Realms` | Realm synchronization | Low |
| `Items` | Item data indexing | Medium |
| `Pricing` | Price calculations | Medium |
| `Valuations` | Valuation processing | Low |

## 🎨 Customization

### Adjust CLI Refresh Rate

Edit `tools/queue-monitor-cli.js`:
```javascript
const REFRESH_INTERVAL = 3000; // Change to desired ms
```

### Add Custom Metrics

In `apps/api/src/queue/queue-metrics.service.ts`, add new metrics:

```typescript
makeGaugeProvider({
  name: 'bullmq_queue_custom_metric',
  help: 'My custom metric',
  labelNames: ['queue'],
}),
```

### Create Custom Grafana Panels

1. Use existing dashboard as template
2. Add new panel with PromQL query
3. Export and save to `grafana/dashboards/`

## 📚 Additional Resources

- [Bull Board Documentation](https://github.com/felixmosh/bull-board)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/)

## 🤝 Support

For issues or questions:
1. Check logs: `apps/api/src/queue/queue-monitor.service.ts`
2. Verify queue health: `http://localhost:3000/queues`
3. Review metrics: `http://localhost:3000/metrics`
