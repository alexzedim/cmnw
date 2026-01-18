import { IRabbitMQConfig } from '@app/configuration/interfaces';

const rabbitmqEnv = {
  user: process.env.RABBITMQ_USER || 'admin',
  password: process.env.RABBITMQ_PASSWORD || 'password',
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: process.env.RABBITMQ_PORT || '5672',
  vhost: process.env.RABBITMQ_VHOST || 'cmnw',
};

export const rabbitmqConfig: IRabbitMQConfig = {
  uri: `amqp://${rabbitmqEnv.user}:${rabbitmqEnv.password}@${rabbitmqEnv.host}:${rabbitmqEnv.port}/${rabbitmqEnv.vhost}`,
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
      name: 'core.exchange',
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
