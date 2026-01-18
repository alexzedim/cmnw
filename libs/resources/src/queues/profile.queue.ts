// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Profiles queue

import { TIME_MS } from '@app/resources/constants';

export const profileQueue = {
  name: 'osint.profiles.queue',
  exchange: 'osint.exchange',
  routingKey: 'osint.profiles.*',
  prefetchCount: parseInt(process.env.PROFILE_WORKER_CONCURRENCY || '1', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.osint.profiles',
    messageTtl: TIME_MS.TWENTY_FOUR_HOURS, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
