// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Realms queue

export const realmsQueue = {
  name: 'osint.realms.queue',
  exchange: 'osint.exchange',
  routingKey: 'osint.realms.*',
  prefetchCount: 1,
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.osint.realms',
    messageTtl: 86400000, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
