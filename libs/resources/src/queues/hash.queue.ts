/**
 * BullMQ Queue Configuration for Hash Blocks
 *
 * Defines BullMQ queue configuration for hash-block reconciliation jobs.
 * Triggered downstream of character refreshes to keep hash-block membership
 * and history in sync with the persisted character hashA/hashB values.
 */

import { REDIS_CONNECTION } from '@app/configuration/queue.config';
import type { IBullMQQueueOptions } from '@app/resources/types/queue/queue.type';

export const hashQueue: IBullMQQueueOptions = {
  name: 'osint.hash',
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
    queueName: 'osint.hash',
    connection: REDIS_CONNECTION,
    concurrency: 5,
    maxStalledCount: 500,
    stalledInterval: 30000,
  },
};
