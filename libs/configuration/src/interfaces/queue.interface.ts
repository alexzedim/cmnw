export interface IQueueConfig {
  name: string;
  exchange: string;
  routingKeys: string[];
  options: {
    durable: boolean;
    arguments: {
      'x-max-priority'?: number;
      'x-message-ttl'?: number;
      'x-dead-letter-exchange'?: string;
      'x-dead-letter-routing-key'?: string;
    };
  };
}
