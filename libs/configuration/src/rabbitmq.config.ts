import { IRabbitMQConfig } from '@app/configuration/interfaces';

export const rabbitmqConfig: IRabbitMQConfig = {
  uri:
    process.env.RABBITMQ_URI ||
    `amqp://${process.env.RABBITMQ_USER || 'admin'}:${process.env.RABBITMQ_PASSWORD || 'password'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}/${process.env.RABBITMQ_VHOST || 'cmnw'}`,
  exchanges: [
    {
      name: 'osint.exchange',
      type: 'topic',
      options: {
        durable: true,
        autoDelete: false,
      },
    },
    {
      name: 'dma.exchange',
      type: 'topic',
      options: {
        durable: true,
        autoDelete: false,
      },
    },
    {
      name: 'dlx.exchange',
      type: 'topic',
      options: {
        durable: true,
        autoDelete: false,
      },
    },
  ],
  connectionInitOptions: {
    wait: true,
    timeout: 30000,
    reject: true,
  },
  prefetch: process.env.RABBITMQ_PREFETCH
    ? parseInt(process.env.RABBITMQ_PREFETCH, 10)
    : 10,
  prefetchCount: 1,
  defaultExchangeType: 'topic',
};
