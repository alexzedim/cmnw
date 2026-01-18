// RabbitMQ Queue Configuration
// Replaces BullMQ DMA_Items queue

import { TIME_MS } from '@app/resources/constants';

export const itemsQueue = {
  name: 'dma.items.queue',
  exchange: 'dma.exchange',
  routingKey: 'dma.items.*',
  prefetchCount: parseInt(process.env.ITEMS_WORKER_CONCURRENCY || '3', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.dma.items',
    messageTtl: TIME_MS.TWENTY_FOUR_HOURS, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
