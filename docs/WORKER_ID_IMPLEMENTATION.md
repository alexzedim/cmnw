# Worker ID Implementation for Multi-Container Monitoring

## Overview

This document describes the implementation of `worker_id` labels in BullMQ Prometheus metrics to support accurate worker counting in multi-container deployments.

## Problem

Previously, all worker containers reported metrics with the same `instance` label, making it impossible to:
- Count the number of active worker containers
- Track individual worker performance
- Identify which container is processing specific jobs

## Solution

Added a `worker_id` label to all BullMQ metrics that uniquely identifies each worker container.

## Changes Made

### 1. Configuration Layer

**New Files:**
- `libs/configuration/src/worker.config.ts` - Worker configuration
- `libs/configuration/src/interfaces/worker.interface.ts` - Worker interface

**Modified Files:**
- `libs/configuration/src/index.ts` - Export worker config
- `libs/configuration/src/interfaces/index.ts` - Export worker interface

**Worker ID Detection Priority:**
1. `WORKER_ID` environment variable (manual override)
2. `HOSTNAME` environment variable (Docker container ID)
3. `os.hostname()` (system hostname)
4. `worker-${process.pid}` (fallback)

### 2. Metrics Service

**Modified File:**
- `apps/api/src/queue/queue-metrics.service.ts`

**Changes:**
- Added `worker_id` to all metric label definitions
- Import and use `workerConfig.workerId`
- All metric operations now include `worker_id` label

### 3. Grafana Dashboard

**Updated Query:**
```promql
# Before
count(count by (instance) (bullmq_queue_waiting_jobs))

# After
count(count by (worker_id) (bullmq_queue_waiting_jobs))
```

### 4. Documentation

**Updated Files:**
- `QUEUE_MONITORING_GUIDE.md` - Added worker_id documentation and examples

## Metrics Schema

All BullMQ metrics now include the `worker_id` label:

```promql
bullmq_queue_waiting_jobs{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_queue_active_jobs{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_queue_completed_jobs{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_queue_failed_jobs{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_queue_delayed_jobs{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_queue_processing_rate{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_queue_avg_processing_time_ms{queue="OSINT_Characters", worker_id="container-abc123"}
bullmq_jobs_total{queue="OSINT_Characters", status="completed", worker_id="container-abc123"}
```

## Usage Examples

### Count Active Workers

```promql
count(count by (worker_id) (bullmq_queue_waiting_jobs))
```

### Jobs Per Worker

```promql
sum by (worker_id) (bullmq_queue_active_jobs)
```

### Worker-Specific Metrics

```promql
# Jobs waiting per worker
sum by (worker_id, queue) (bullmq_queue_waiting_jobs)

# Processing rate per worker
sum by (worker_id, queue) (rate(bullmq_jobs_total[5m]))
```

## Deployment Notes

### Docker Compose

No changes needed - `HOSTNAME` is automatically set by Docker to the container ID.

### Manual Deployment

If not using Docker, you can set a custom worker ID:

```bash
export WORKER_ID=worker-production-1
```

### Kubernetes

In K8s, you might want to use the pod name:

```yaml
env:
- name: WORKER_ID
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
```

## Testing

After deployment, verify worker IDs are unique:

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics | grep worker_id

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=count(count%20by%20(worker_id)%20(bullmq_queue_waiting_jobs))'
```

## Backward Compatibility

⚠️ **Breaking Change**: This adds a new label to all metrics. If you have existing Prometheus queries or alerts that don't account for the `worker_id` label, you may need to update them.

**Migration Example:**
```promql
# Old query
sum(bullmq_queue_waiting_jobs)

# New query (same result, aggregates across all workers)
sum(bullmq_queue_waiting_jobs)

# Or explicitly group by worker
sum by (worker_id) (bullmq_queue_waiting_jobs)
```

## Future Enhancements

Potential improvements:
- Add worker metadata (start time, version, etc.)
- Worker health checks
- Per-worker failure tracking
- Worker load balancing insights
