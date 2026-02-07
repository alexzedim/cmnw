/**
 * BullMQ Queue Configuration for Profiles
 *
 * Defines BullMQ queue configuration for profile-related jobs.
 * Replaces RabbitMQ profile queue.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for profile jobs
 * Used for processing character profile data from Blizzard API
 */
export const profileQueue: IBullMQQueueOptions = {
  name: 'osint.profiles',
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
    queueName: 'osint.profiles',
    connection: getRedisConnection(),
    concurrency: 5,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
