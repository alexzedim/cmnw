import type { BattleNetOptions } from '@alexzedim/blizzapi';
import { CharactersEntity, GuildsEntity } from '@app/pg';
import {
  IQAuction,
  IQCharacter,
  IQCharacterOptions,
  IQCharacterProfile,
  IQGuild,
  IQGuildOptions,
  IQItem,
  IQRealm,
} from '@app/resources/types';

// ============================================================================
// BullMQ Configuration Types
// ============================================================================

/**
 * Redis connection configuration for BullMQ
 * All values should be sourced from environment variables
 */
export interface IBullMQConnection {
  /** Redis host address (default: localhost) */
  host: string;
  /** Redis port (default: 6379) */
  port: number;
  /** Redis password for authentication (optional) */
  password?: string;
  /** Redis database number (default: 0) */
  db: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Maximum number of retries for connection (default: 3) */
  maxRetriesPerRequest?: number;
  /** Enable/disable lazy connect (default: false) */
  lazyConnect?: boolean;
  /** Keep alive interval in milliseconds (default: 30000) */
  keepAlive?: number;
}

/**
 * BullMQ queue-specific options
 */
export interface IBullMQQueueOptions {
  /** Queue name */
  name: string;
  /** Connection configuration */
  connection: IBullMQConnection;
  /** Default job options for all jobs in this queue */
  defaultJobOptions?: IBullMQJobOptions;
  /** Number of workers processing this queue (default: 1) */
  concurrency?: number;
  /** Worker options for processing jobs from this queue */
  workerOptions?: IBullMQWorkerOptions;
}

/**
 * BullMQ job options
 */
export interface IBullMQJobOptions {
  /** Number of retry attempts (default: 0) */
  attempts?: number;
  /** Backoff strategy for retries */
  backoff?: {
    /** Type: 'exponential' | 'fixed' | 'custom' */
    type: 'exponential' | 'fixed' | 'custom';
    /** Delay between retries in milliseconds */
    delay: number;
  };
  /** Job priority (0-10, higher = more important) */
  priority?: number;
  /** Delay job execution by specified milliseconds */
  delay?: number;
  /** Remove job when completed (default: false) */
  removeOnComplete?: boolean | number;
  /** Remove job when failed (default: false) */
  removeOnFail?: boolean | number;
  /** Job ID (optional, auto-generated if not provided) */
  jobId?: string;
  /** Additional job metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Queue configuration interface
 * Used to define queue settings across the application
 */
export interface IQueueConfig {
  /** Queue name */
  name: string;
  /** Queue type/domain (e.g., 'osint', 'dma', 'core') */
  domain: string;
  /** Queue-specific options */
  options: IBullMQQueueOptions;
  /** Job data type for this queue */
  jobType:
    | 'CharacterJobQueue'
    | 'ProfileJobQueue'
    | 'RealmJobQueue'
    | 'GuildJobQueue'
    | 'AuctionJobQueue'
    | 'ItemJobQueue';
}

/**
 * BullMQ worker configuration
 */
export interface IBullMQWorkerOptions {
  /** Queue name to process */
  queueName: string;
  /** Connection configuration */
  connection: IBullMQConnection;
  /** Number of concurrent jobs to process (default: 1) */
  concurrency?: number;
  /** Maximum number of stalled jobs allowed (default: 500) */
  maxStalledCount?: number;
  /** Stalled interval check in milliseconds (default: 30000) */
  stalledInterval?: number;
}

/**
 * BullMQ flow configuration for job dependencies
 */
export interface IBullMQFlowOptions {
  /** Flow name */
  name: string;
  /** Queue name */
  queueName: string;
  /** Flow data */
  data: {
    name: string;
    data: unknown;
    queueName: string;
    opts?: IBullMQJobOptions;
    children?: IBullMQFlowOptions[];
  }[];
  /** Flow options */
  options?: {
    /** Queue options */
    queueOptions?: IBullMQQueueOptions;
    /** Default job options */
    defaultJobOptions?: IBullMQJobOptions;
  };
}

/**
 * BullMQ scheduler configuration for delayed jobs
 */
export interface IBullMQSchedulerOptions {
  /** Connection configuration */
  connection: IBullMQConnection;
  /** Maximum number of delayed jobs to process (default: 100) */
  maxDelayed?: number;
}

// ============================================================================
// Job Queue Types (Existing - Preserved for compatibility)
// ============================================================================

// @todo research don't move
export type CharacterJobQueue = Readonly<IQCharacter> &
  Omit<CharactersEntity, 'uuid' | 'realmName' | 'realmId'> &
  Readonly<IQCharacterOptions> &
  BattleNetOptions;

export type ProfileJobQueue = Pick<CharactersEntity, 'name' | 'realm'> &
  Readonly<IQCharacterProfile>;

export type RealmJobQueue = Readonly<IQRealm> & BattleNetOptions;

export type GuildJobQueue = Readonly<IQGuild> &
  Partial<GuildsEntity> &
  Readonly<IQGuildOptions> &
  BattleNetOptions;

export type AuctionJobQueue = Partial<IQAuction> & BattleNetOptions;

export type ItemJobQueue = Readonly<IQItem> & BattleNetOptions;

// ============================================================================
// BullMQ Job Data Types (Union type for type safety)
// ============================================================================

/**
 * Union type of all BullMQ job data types
 * Used for generic job processing handlers
 */
export type BullMQJobData =
  | CharacterJobQueue
  | ProfileJobQueue
  | RealmJobQueue
  | GuildJobQueue
  | AuctionJobQueue
  | ItemJobQueue;
