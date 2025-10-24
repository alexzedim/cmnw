import {
  makeGaugeProvider,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';

export const queueMetricsProviders = [
  makeGaugeProvider({
    name: 'bullmq_queue_waiting_jobs',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_active_jobs',
    help: 'Number of jobs currently being processed',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_completed_jobs',
    help: 'Number of completed jobs',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_failed_jobs',
    help: 'Number of failed jobs',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_delayed_jobs',
    help: 'Number of delayed jobs',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_processing_rate',
    help: 'Queue processing rate (jobs per minute)',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_avg_processing_time_ms',
    help: 'Average job processing time in milliseconds',
    labelNames: ['queue', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_total',
    help: 'Total number of jobs processed',
    labelNames: ['queue', 'status', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_by_status_code',
    help: 'Jobs completed with specific status codes',
    labelNames: ['queue', 'status_code', 'status_label', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_by_source',
    help: 'Jobs completed by createdBy/updatedBy source',
    labelNames: ['queue', 'source', 'source_type', 'worker_id'],
  }),
];
