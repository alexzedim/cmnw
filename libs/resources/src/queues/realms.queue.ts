// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Realms queue

import { TIME_MS } from '@app/resources/constants';

export const realmsQueue = {
  name: 'osint.realms.queue',
  exchange: 'osint.exchange',
  routingKey: 'osint.realms.*',
  prefetchCount: 1,
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.osint.realms',
    messageTtl: TIME_MS.TWENTY_FOUR_HOURS, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
