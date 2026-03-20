/**
 * BullMQ Queue Configuration for Characters
 *
 * Defines BullMQ queue configurations for character-related jobs.
 */

import { REDIS_CONNECTION } from '@app/configuration/queue.config';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for character jobs
 * Used for processing character data from Blizzard API
 */
export const charactersQueue: IBullMQQueueOptions = {
  name: 'osint.characters',
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
    queueName: 'osint.characters',
    connection: REDIS_CONNECTION,
    concurrency: 5,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
