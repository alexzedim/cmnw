/**
 * RabbitMQ Queue Configuration
 *
 * Defines all queues, their bindings, and configuration for the CMNW system.
 * Supports priority queues, TTL, and dead letter exchange routing.
 */
import { IQueueConfig } from '@app/configuration/interfaces/queue.interface';

export const RABBITMQ_QUEUES: Record<string, IQueueConfig> = {
  // OSINT Queues
  CHARACTERS: {
    name: 'osint.characters',
    exchange: 'osint.exchange',
    routingKeys: [
      'osint.characters.ladder.*',
      'osint.characters.raid.*',
      'osint.characters.lfg.*',
      'osint.characters.guild.*',
      'osint.characters.index.*',
      'osint.characters.migration.*',
    ],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.characters',
      },
    },
  },

  CHARACTERS_REQUESTS: {
    name: 'osint.characters.requests',
    exchange: 'osint.exchange',
    routingKeys: ['osint.characters.request.*'],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.characters.requests',
      },
    },
  },

  CHARACTERS_RESPONSES: {
    name: 'osint.characters.responses',
    exchange: 'osint.exchange',
    routingKeys: ['osint.characters.response.*'],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.characters.responses',
      },
    },
  },

  GUILDS: {
    name: 'osint.guilds',
    exchange: 'osint.exchange',
    routingKeys: [
      'osint.guilds.roster.*',
      'osint.guilds.index.*',
      'osint.guilds.hof.*',
      'osint.guilds.wowprogress.*',
      'osint.guilds.request.*',
    ],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.guilds',
      },
    },
  },

  PROFILES: {
    name: 'osint.profiles',
    exchange: 'osint.exchange',
    routingKeys: ['osint.profiles.*'],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.profiles',
      },
    },
  },

  // DMA Queues
  AUCTIONS: {
    name: 'dma.auctions',
    exchange: 'dma.exchange',
    routingKeys: ['dma.auctions.*'],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.auctions',
      },
    },
  },

  ITEMS: {
    name: 'dma.items',
    exchange: 'dma.exchange',
    routingKeys: ['dma.items.*'],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.items',
      },
    },
  },

  // Core Queues
  REALMS: {
    name: 'core.realms',
    exchange: 'osint.exchange',
    routingKeys: ['core.realms.*'],
    options: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.realms',
      },
    },
  },

  // Dead Letter Queue
  DLQ: {
    name: 'dlx.dlq',
    exchange: 'dlx.exchange',
    routingKeys: ['dlx.*'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
      },
    },
  },
};

/**
 * Get queue configuration by name
 */
export function getQueueConfig(queueName: string): IQueueConfig | undefined {
  return RABBITMQ_QUEUES[queueName];
}

/**
 * Get all queue names
 */
export function getAllQueueNames(): string[] {
  return Object.keys(RABBITMQ_QUEUES);
}

/**
 * Get all queues for a specific exchange
 */
export function getQueuesByExchange(exchange: string): IQueueConfig[] {
  return Object.values(RABBITMQ_QUEUES).filter((q) => q.exchange === exchange);
}
