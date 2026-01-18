// RabbitMQ Queue Configuration
// Replaces BullMQ DMA_Items queue

export const itemsQueue = {
  name: 'dma.items.queue',
  exchange: 'dma.exchange',
  routingKey: 'dma.items.*',
  prefetchCount: parseInt(process.env.ITEMS_WORKER_CONCURRENCY || '3', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.dma.items',
    messageTtl: 86400000, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
