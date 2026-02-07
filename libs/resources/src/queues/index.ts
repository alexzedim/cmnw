/**
 * BullMQ Queue Configurations
 *
 * Exports all BullMQ queue configurations for the CMNW project.
 * Provides a unified export point for queue configurations.
 */

// Character queues
export {
  charactersQueue,
  charactersRequestsQueue,
  charactersResponsesQueue,
} from './characters.queue';

// Guild queues
export { guildsQueue } from './guilds.queue';

// Profile queues
export { profileQueue } from './profiles.queue';

// Auction queues
export { auctionsQueue } from './auctions.queue';

// Item queues
export { itemsQueue } from './items.queue';

// Valuation queues
export { valuationsQueue } from './valuations.queue';

// Realm queues
export { realmsQueue } from './realms.queue';

// Dead Letter Queue
export { dlqQueue } from './dlq.queue';
