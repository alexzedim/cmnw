import { makeGaugeProvider, makeCounterProvider } from '@willsoto/nestjs-prometheus';

export const queueMetricsProviders = [
  makeGaugeProvider({
    name: 'bullmq_queue_messages_waiting',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_messages_active',
    help: 'Number of active jobs',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_workers',
    help: 'Number of active workers',
    labelNames: ['queue'],
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
    name: 'bullmq_jobs_added_total',
    help: 'Total number of jobs added',
    labelNames: ['exchange', 'routing_key'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_completed_total',
    help: 'Total number of jobs completed',
    labelNames: ['queue', 'status', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_ack_total',
    help: 'Total number of jobs acknowledged',
    labelNames: ['queue', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_nack_total',
    help: 'Total number of jobs negatively acknowledged',
    labelNames: ['queue', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_by_status_code',
    help: 'BullMQ jobs by completion status code',
    labelNames: ['queue', 'status_code', 'status_label', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_by_source',
    help: 'BullMQ jobs by created/updated source',
    labelNames: ['queue', 'source', 'source_type', 'worker_id'],
  }),
];
