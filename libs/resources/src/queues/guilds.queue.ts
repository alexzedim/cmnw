// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Guilds queue

import { TIME_MS } from '@app/resources/constants';

export const guildsQueue = {
  name: 'osint.guilds.queue',
  exchange: 'osint.exchange',
  routingKey: 'osint.guilds.*',
  prefetchCount: parseInt(process.env.GUILDS_WORKER_CONCURRENCY || '1', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.osint.guilds',
    messageTtl: TIME_MS.TWENTY_FOUR_HOURS, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
