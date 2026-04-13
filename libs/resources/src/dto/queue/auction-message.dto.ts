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

  constructor(name: string, data: IAuctionMessageBase, opts?: JobsOptions) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  static create(data: IAuctionMessageBase, opts?: JobsOptions): AuctionMessageDto {
    const name =
      data.connectedRealmId === REALM_ENTITY_ANY.connectedRealmId
        ? `commodity-${data.connectedRealmId}-${data.commoditiesTimestamp}`
        : `auctions-${data.connectedRealmId}-${data.auctionsTimestamp}`;

    const mergedOpts = {
      ...auctionsQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new AuctionMessageDto(name, data, mergedOpts);
    return dto;
  }
}
