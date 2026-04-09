import { JobsOptions } from 'bullmq';
import { auctionsQueue } from '../../queues/auctions.queue';
import { REALM_ENTITY_ANY } from '@app/resources/constants';

/**
 * Base interface for creating auction job data
 */
export interface IAuctionMessageBase {
  connectedRealmId: number;
  auctionsTimestamp?: number;
  commoditiesTimestamp?: number;
}

export class AuctionMessageDto {
  public readonly name: string;
  public readonly data: IAuctionMessageBase;
  public readonly opts?: JobsOptions;

  /**
   * Constructor - creates a validated Auction Message with BullMQ properties
   * @param name - Queue name (e.g., 'dma.auctions')
   * @param data - Auction message data
   * @param opts - BullMQ job options (optional)
   */
  constructor(name: string, data: IAuctionMessageBase, opts?: JobsOptions) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  /**
   * Create from auction data with BullMQ options
   * @param data - Auction data
   * @param opts - Optional job options
   * @returns New AuctionMessageDto instance
   */
  static create(data: IAuctionMessageBase, opts?: JobsOptions): AuctionMessageDto {
    const name =
      data.connectedRealmId === REALM_ENTITY_ANY.connectedRealmId
        ? `commodity-${data.connectedRealmId}`
        : `auctions-${data.connectedRealmId}`;

    const mergedOpts = {
      ...auctionsQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new AuctionMessageDto(name, data, mergedOpts);
    return dto;
  }
}
