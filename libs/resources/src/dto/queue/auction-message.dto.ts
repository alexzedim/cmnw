import { IQueueMessageBase, QueueMessageDto } from '@app/resources/dto/queue';

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

/**
 * Auction Message DTO for BullMQ
 *
 * Wraps ItemJobQueue with BullMQ-specific properties.
 * Used for auction data synchronization from Blizzard API.
 */
export class AuctionMessageDto extends QueueMessageDto<IAuctionMessageBase> {
  private static isQueueMessageBase<T>(params: any): params is IQueueMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isAuctionCreateParams(
    params: any,
  ): params is Omit<Partial<AuctionMessageDto>, 'connectedRealmId'> &
    Pick<IAuctionMessageBase, 'connectedRealmId'> {
    return !!params && typeof params === 'object' && 'connectedRealmId' in params;
  }

  constructor(params: any) {
    const messageParams = params ?? {};
    const { data, priority, source, attempts, metadata, ...rest } = messageParams;
    const auctionData = data ? { ...rest, ...data } : rest;

    super({
      data: auctionData,
      priority: priority ?? 5,
      source: source ?? 'dma',
      attempts,
      metadata,
    });
  }

  /**
   * Create from auction data with BullMQ options
   */
  static create<T>(params: IQueueMessageBase<T>): QueueMessageDto<T>;
  static create(
    params: Omit<Partial<AuctionMessageDto>, 'connectedRealmId'> &
      Pick<IAuctionMessageBase, 'connectedRealmId'>,
  ): AuctionMessageDto;
  static create(
    params:
      | IQueueMessageBase<IAuctionMessageBase>
      | (Omit<Partial<AuctionMessageDto>, 'connectedRealmId'> &
          Pick<IAuctionMessageBase, 'connectedRealmId'>),
  ): QueueMessageDto<IAuctionMessageBase> | AuctionMessageDto {
    if (AuctionMessageDto.isQueueMessageBase(params)) {
      return QueueMessageDto.create(params);
    }

    if (!AuctionMessageDto.isAuctionCreateParams(params)) {
      throw new Error(
        'AuctionMessageDto.create expected auction params with connectedRealmId.',
      );
    }

    return new AuctionMessageDto({
      data: params,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
    });
  }
}
