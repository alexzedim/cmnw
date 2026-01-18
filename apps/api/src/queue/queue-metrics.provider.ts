import { makeGaugeProvider, makeCounterProvider } from '@willsoto/nestjs-prometheus';

export const queueMetricsProviders = [
  makeGaugeProvider({
    name: 'rabbitmq_queue_messages_ready',
    help: 'Number of messages ready in queue',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'rabbitmq_queue_messages_unacked',
    help: 'Number of unacknowledged messages',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'rabbitmq_queue_consumers',
    help: 'Number of active consumers',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'rabbitmq_queue_processing_rate',
    help: 'Queue processing rate (messages per minute)',
    labelNames: ['queue', 'worker_id'],
  }),
  makeGaugeProvider({
    name: 'rabbitmq_queue_avg_processing_time_ms',
    help: 'Average message processing time in milliseconds',
    labelNames: ['queue', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'rabbitmq_message_publish_total',
    help: 'Total number of messages published',
    labelNames: ['exchange', 'routing_key'],
  }),
  makeCounterProvider({
    name: 'rabbitmq_message_consume_total',
    help: 'Total number of messages consumed',
    labelNames: ['queue', 'status', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'rabbitmq_message_ack_total',
    help: 'Total number of messages acknowledged',
    labelNames: ['queue', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'rabbitmq_message_nack_total',
    help: 'Total number of messages negatively acknowledged',
    labelNames: ['queue', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'rabbitmq_jobs_by_status_code',
    help: 'RabbitMQ jobs by completion status code',
    labelNames: ['queue', 'status_code', 'status_label', 'worker_id'],
  }),
  makeCounterProvider({
    name: 'rabbitmq_jobs_by_source',
    help: 'RabbitMQ jobs by created/updated source',
    labelNames: ['queue', 'source', 'source_type', 'worker_id'],
  }),
];
