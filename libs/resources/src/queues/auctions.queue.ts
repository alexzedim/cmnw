/**
 * BullMQ Queue Configuration for Auctions
 *
 * Defines BullMQ queue configuration for auction-related jobs.
 */
import { REDIS_CONNECTION } from '@app/configuration/queue.config';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for auction jobs
 * Used for processing auction data from Blizzard API
 */
export const auctionsQueue: IBullMQQueueOptions = {
  name: 'dma.auctions',
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
    queueName: 'dma.auctions',
    connection: REDIS_CONNECTION,
    concurrency: 10,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
