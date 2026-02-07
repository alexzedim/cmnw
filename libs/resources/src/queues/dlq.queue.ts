/**
 * BullMQ Dead Letter Queue Configuration
 *
 * Defines BullMQ queue configuration for dead letter queue (DLQ).
 * Replaces RabbitMQ dead letter exchange routing.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for dead letter queue
 * Used for processing failed jobs from other queues
 */
export const dlqQueue: IBullMQQueueOptions = {
  name: 'dlx.dlq',
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
    priority: 0,
  },
};
