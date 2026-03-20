/**
 * BullMQ Queue Configuration for Profiles
 *
 * Defines BullMQ queue configuration for profile-related jobs.
 */
import { REDIS_CONNECTION } from '@app/configuration/queue.config';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for profile jobs
 * Used for processing character profile data from Blizzard API
 */
export const profileQueue: IBullMQQueueOptions = {
  name: 'osint.profiles',
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
    queueName: 'osint.profiles',
    connection: REDIS_CONNECTION,
    concurrency: 5,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
