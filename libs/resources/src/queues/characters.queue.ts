// RabbitMQ Queue Configuration
// Replaces BullMQ OSINT_Characters queue

export const charactersQueue = {
  name: 'osint.characters.queue',
  exchange: 'osint.exchange',
  routingKey: 'osint.characters.*',
  prefetchCount: parseInt(process.env.CHARACTERS_WORKER_CONCURRENCY || '1', 10),
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.osint.characters',
    messageTtl: 86400000, // 24 hours
    maxLength: 100000,
    maxPriority: 10,
  },
};

export const charactersRequestsQueue = {
  name: 'osint.characters.requests',
  exchange: 'osint.exchange',
  routingKey: 'osint.characters.request.*',
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.characters.requests',
    maxPriority: 10,
  },
};

export const charactersResponsesQueue = {
  name: 'osint.characters.responses',
  exchange: 'osint.exchange',
  routingKey: 'osint.characters.response.*',
  queueOptions: {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: 'dlx.characters.responses',
    maxPriority: 10,
  },
};
