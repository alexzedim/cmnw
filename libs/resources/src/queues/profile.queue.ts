// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Profiles queue

export const profileQueue = {
  name: 'osint.profiles.queue',
  exchange: 'osint.exchange',
  routingKey: 'osint.profiles.*',
  prefetchCount: parseInt(process.env.PROFILE_WORKER_CONCURRENCY || '1', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.osint.profiles',
    messageTtl: 86400000, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};
