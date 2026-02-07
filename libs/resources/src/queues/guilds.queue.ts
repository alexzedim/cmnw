/**
 * BullMQ Queue Configuration for Guilds
 *
 * Defines BullMQ queue configuration for guild-related jobs.
 * Replaces RabbitMQ guild queue.
 */
import { getRedisConnection } from '@app/configuration';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

/**
 * BullMQ queue configuration for guild jobs
 * Used for processing guild data from Blizzard API
 */
export const guildsQueue: IBullMQQueueOptions = {
  name: 'osint.guilds',
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
    queueName: 'osint.guilds',
    connection: getRedisConnection(),
    concurrency: 5,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
