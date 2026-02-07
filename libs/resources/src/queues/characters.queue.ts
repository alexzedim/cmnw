/**
 * BullMQ Queue Configuration for Characters
 *
 * Defines BullMQ queue configurations for character-related jobs.
 * Replaces RabbitMQ character queues.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for character jobs
 * Used for processing character data from Blizzard API
 */
export const charactersQueue: IBullMQQueueOptions = {
  name: 'osint.characters',
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
};

/**
 * BullMQ queue configuration for character request jobs
 * Used for RPC-style character requests
 */
export const charactersRequestsQueue: IBullMQQueueOptions = {
  name: 'osint.characters.requests',
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 500,
    removeOnFail: 250,
    priority: 7,
  },
};

/**
 * BullMQ queue configuration for character response jobs
 * Used for RPC-style character responses
 */
export const charactersResponsesQueue: IBullMQQueueOptions = {
  name: 'osint.characters.responses',
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 500,
    removeOnFail: 250,
    priority: 7,
  },
};
