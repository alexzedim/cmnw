/**
 * BullMQ Queue Configuration
 *
 * Defines all queues, their connections, and configuration for the CMNW system.
 * Supports priority queues, retry strategies, and dead letter queue routing.
 */
import {
  IBullMQConnection,
  IBullMQJobOptions,
  IBullMQQueueOptions,
  IQueueConfig,
} from '@app/resources/types/queue/queue.type';

/**
 * Redis connection configuration for BullMQ
 * All values are sourced from environment variables with sensible defaults
 */
export const REDIS_CONNECTION: IBullMQConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '1', 10),
  connectTimeout: 5000,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  keepAlive: 30000,
};

/**
 * Default job options for all queues
 * Provides consistent retry behavior and cleanup policies
 */
const DEFAULT_JOB_OPTIONS: IBullMQJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 1000,
  removeOnFail: 500,
};

/**
 * BullMQ Queue Configurations
 *
 * Maps all application queues to their BullMQ configurations.
 * Each queue includes connection settings and default job options.
 */
export const BULLMQ_QUEUES: Record<string, IQueueConfig> = {
  // OSINT Queues
  CHARACTERS: {
    name: 'osint.characters',
    domain: 'osint',
    jobType: 'ICharacterMessageBase',
    options: {
      name: 'osint.characters',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  CHARACTERS_REQUESTS: {
    name: 'osint.characters.requests',
    domain: 'osint',
    jobType: 'ICharacterMessageBase',
    options: {
      name: 'osint.characters.requests',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 7,
      },
    },
  },

  CHARACTERS_RESPONSES: {
    name: 'osint.characters.responses',
    domain: 'osint',
    jobType: 'ICharacterMessageBase',
    options: {
      name: 'osint.characters.responses',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 7,
      },
    },
  },

  GUILDS: {
    name: 'osint.guilds',
    domain: 'osint',
    jobType: 'GuildJobQueue',
    options: {
      name: 'osint.guilds',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  PROFILES: {
    name: 'osint.profiles',
    domain: 'osint',
    jobType: 'ProfileJobQueue',
    options: {
      name: 'osint.profiles',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  // DMA Queues
  AUCTIONS: {
    name: 'dma.auctions',
    domain: 'dma',
    jobType: 'AuctionJobQueue',
    options: {
      name: 'dma.auctions',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  ITEMS: {
    name: 'dma.items',
    domain: 'dma',
    jobType: 'ItemJobQueue',
    options: {
      name: 'dma.items',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  VALUATIONS: {
    name: 'dma.valuations',
    domain: 'dma',
    jobType: 'AuctionJobQueue',
    options: {
      name: 'dma.valuations',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  // Core Queues
  REALMS: {
    name: 'core.realms',
    domain: 'core',
    jobType: 'RealmJobQueue',
    options: {
      name: 'core.realms',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      },
    },
  },

  // Dead Letter Queue
  DLQ: {
    name: 'dlx.dlq',
    domain: 'dlx',
    jobType: 'ICharacterMessageBase',
    options: {
      name: 'dlx.dlq',
      connection: REDIS_CONNECTION,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        priority: 0,
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    },
  },
};

/**
 * Get Redis connection configuration
 *
 * @returns Redis connection configuration object
 */
export function getRedisConnection(): IBullMQConnection {
  return REDIS_CONNECTION;
}

/**
 * Get queue configuration by name
 *
 * @param queueName - The name of the queue to retrieve
 * @returns Queue configuration or undefined if not found
 *
 * @example
 * ```typescript
 * const charactersQueue = getQueueConfig('CHARACTERS');
 * if (charactersQueue) {
 *   console.log(charactersQueue.name); // 'osint.characters'
 * }
 * ```
 */
export function getQueueConfig(queueName: string): IQueueConfig | undefined {
  return BULLMQ_QUEUES[queueName];
}

/**
 * Get all queue names
 *
 * @returns Array of all queue configuration keys
 *
 * @example
 * ```typescript
 * const allQueues = getAllQueueNames();
 * // ['CHARACTERS', 'CHARACTERS_REQUESTS', 'CHARACTERS_RESPONSES', ...]
 * ```
 */
export function getAllQueueNames(): string[] {
  return Object.keys(BULLMQ_QUEUES);
}

/**
 * Get all queues for a specific domain
 *
 * @param domain - The domain to filter queues by (e.g., 'osint', 'dma', 'core')
 * @returns Array of queue configurations for the specified domain
 *
 * @example
 * ```typescript
 * const osintQueues = getQueuesByDomain('osint');
 * // Returns all OSINT queues (CHARACTERS, GUILDS, PROFILES, etc.)
 * ```
 */
export function getQueuesByDomain(domain: string): IQueueConfig[] {
  return Object.values(BULLMQ_QUEUES).filter((queue) => queue.domain === domain);
}

/**
 * Get queue options by queue name
 *
 * @param queueName - The name of the queue to retrieve options for
 * @returns BullMQ queue options or undefined if not found
 *
 * @example
 * ```typescript
 * const options = getQueueOptions('CHARACTERS');
 * if (options) {
 *   const queue = new Queue(options.name, { connection: options.connection });
 * }
 * ```
 */
export function getQueueOptions(queueName: string): IBullMQQueueOptions | undefined {
  return BULLMQ_QUEUES[queueName]?.options;
}
