import { Logger } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { auctionsQueue } from '../../queues/auctions.queue';

/**
 * Base interface for creating auction job data
 */
export interface IAuctionMessageBase {
  connectedRealmId: number;
  auctionsTimestamp?: number;
  commoditiesTimestamp?: number;
  isAssetClassIndex?: boolean;
  region?: 'eu' | 'us' | 'kr' | 'tw';
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
}

export class AuctionMessageDto {
  public readonly name: string;
  public readonly data: IAuctionMessageBase;
  public readonly opts?: JobsOptions;

  private static readonly auctionLogger = new Logger(AuctionMessageDto.name);

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
    const mergedOpts = {
      ...auctionsQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new AuctionMessageDto(auctionsQueue.name, data, mergedOpts);
    return dto;
  }
}
