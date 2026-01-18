// RabbitMQ Queue Configuration
// Replaces BullMQ DMA_Valuations queue

export const valuationsQueue = {
  name: 'dma.valuations.queue',
  exchange: 'dma.exchange',
  routingKey: 'dma.valuations.*',
  prefetchCount: 1, // Default concurrency
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.dma.valuations',
    messageTtl: 86400000, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
