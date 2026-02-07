/**
 * BullMQ Queue Configuration for Items
 *
 * Defines BullMQ queue configuration for item-related jobs.
 * Replaces RabbitMQ item queue.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for item jobs
 * Used for processing item data from Blizzard API
 */
export const itemsQueue: IBullMQQueueOptions = {
  name: 'dma.items',
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
    queueName: 'dma.items',
    connection: getRedisConnection(),
    concurrency: 10,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
