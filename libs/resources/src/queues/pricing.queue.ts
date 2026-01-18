// RabbitMQ Queue Configuration
// Replaces BullMQ DMA_Pricing queue

export const pricingQueue = {
  name: 'dma.pricing.queue',
  exchange: 'dma.exchange',
  routingKey: 'dma.pricing.*',
  prefetchCount: 3,
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.dma.pricing',
    messageTtl: 86400000, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
