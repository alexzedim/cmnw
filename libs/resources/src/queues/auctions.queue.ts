/**
 * BullMQ Queue Configuration for Auctions
 *
 * Defines BullMQ queue configuration for auction-related jobs.
 * Replaces RabbitMQ auction queue.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for auction jobs
 * Used for processing auction data from Blizzard API
 */
export const auctionsQueue: IBullMQQueueOptions = {
  name: 'dma.auctions',
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
    queueName: 'dma.auctions',
    connection: getRedisConnection(),
    concurrency: 10,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
