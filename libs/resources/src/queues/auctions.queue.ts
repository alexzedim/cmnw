// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Auctions queue

import { TIME_MS } from '@app/resources/constants';

export const auctionsQueue = {
  name: 'dma.auctions.queue',
  exchange: 'dma.exchange',
  routingKey: 'dma.auctions.*',
  prefetchCount: parseInt(process.env.AUCTIONS_WORKER_CONCURRENCY || '1', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.dma.auctions',
    messageTtl: TIME_MS.TWENTY_FOUR_HOURS, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
