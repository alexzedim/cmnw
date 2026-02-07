/**
 * BullMQ Queue Configuration for Valuations
 *
 * Defines BullMQ queue configuration for valuation-related jobs.
 * Replaces RabbitMQ valuation queue.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for valuation jobs
 * Used for processing auction valuation data
 */
export const valuationsQueue: IBullMQQueueOptions = {
  name: 'dma.valuations',
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: 500,
    priority: 5,
  },
  workerOptions: {
    queueName: 'dma.valuations',
    connection: getRedisConnection(),
    concurrency: 10,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
