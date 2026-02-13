/**
 * @deprecated This file contains RabbitMQ-specific interfaces that are no longer used.
 * The project has migrated to BullMQ with Redis.
 * Kept for reference only.
 */
export interface IRabbitMQExchange {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  options?: {
    durable?: boolean;
    autoDelete?: boolean;
    internal?: boolean;
    alternateExchange?: string;
  };
}

export interface IRabbitMQConfig {
  uri: string;
  exchanges: IRabbitMQExchange[];
  connectionInitOptions: {
    wait: boolean;
    timeout: number;
    reject: boolean;
  };
  prefetch?: number;
  prefetchCount?: number;
  defaultExchangeType?: string;
}
