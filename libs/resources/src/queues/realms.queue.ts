/**
 * BullMQ Queue Configuration for Realms
 *
 * Defines BullMQ queue configuration for realm-related jobs.
 * Replaces RabbitMQ realm queue.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for realm jobs
 * Used for processing realm data from Blizzard API
 */
export const realmsQueue: IBullMQQueueOptions = {
  name: 'core.realms',
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
    queueName: 'core.realms',
    connection: getRedisConnection(),
    concurrency: 5,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
