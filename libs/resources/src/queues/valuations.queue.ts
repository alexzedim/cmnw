/**
 * BullMQ Queue Configuration for Valuations
 *
 * Defines BullMQ queue configuration for valuation-related jobs.
 */
import { REDIS_CONNECTION } from '@app/configuration/queue.config';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for valuation jobs
 * Used for processing auction valuation data
 */
export const valuationsQueue: IBullMQQueueOptions = {
  name: 'dma.valuations',
  connection: REDIS_CONNECTION,
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
    connection: REDIS_CONNECTION,
    concurrency: 10,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
