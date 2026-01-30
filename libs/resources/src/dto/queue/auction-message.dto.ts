import { TIME_MS } from '@app/resources/constants';
import { IRabbitMQMessageBase, RabbitMQMessageDto } from '@app/resources/dto/queue';
import { RegionIdOrName } from '@alexzedim/blizzapi';

/**
 * Base interface for creating auction message entries
 */
export interface IAuctionMessageBase {
  connectedRealmId: number;
  auctionsTimestamp?: number;
  commoditiesTimestamp?: number;
  isAssetClassIndex?: boolean;
  region?: RegionIdOrName;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
}

/**
 * Auction Message DTO for RabbitMQ
 *
 * Wraps AuctionJobQueue with RabbitMQ-specific properties and routing.
 * Used for auction data synchronization from Blizzard API.
 */
export class AuctionMessageDto extends RabbitMQMessageDto<IAuctionMessageBase> {
  readonly connectedRealmId: number;
  readonly auctionsTimestamp?: number;
  readonly commoditiesTimestamp?: number;
  readonly isAssetClassIndex?: boolean;
  readonly region?: RegionIdOrName;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly accessToken?: string;

  private static isRabbitMQMessageBase<T>(
    params: any,
  ): params is IRabbitMQMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isAuctionCreateParams(
    params: any,
  ): params is Omit<Partial<AuctionMessageDto>, 'connectedRealmId'> &
    Pick<IAuctionMessageBase, 'connectedRealmId'> {
    return !!params && typeof params === 'object' && 'connectedRealmId' in params;
  }

  constructor(params: any) {
    const auctionData = params.data || params;

    super({
      messageId: params.id || `auction-${auctionData.connectedRealmId}`,
      data: auctionData,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
      attempts: params.attempts,
      routingKey: params.routingKey ?? 'dma.auctions.normal',
      persistent: params.persistent ?? true,
      expiration: params.expiration,
    });

    Object.assign(this, auctionData);
  }

  /**
   * Create from auction data with RabbitMQ routing
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T>;
  static create(
    params: Omit<Partial<AuctionMessageDto>, 'connectedRealmId'> &
      Pick<IAuctionMessageBase, 'connectedRealmId'>,
  ): AuctionMessageDto;
  static create(
    params:
      | IRabbitMQMessageBase<IAuctionMessageBase>
      | (Omit<Partial<AuctionMessageDto>, 'connectedRealmId'> &
          Pick<IAuctionMessageBase, 'connectedRealmId'>),
  ): RabbitMQMessageDto<IAuctionMessageBase> | AuctionMessageDto {
    if (AuctionMessageDto.isRabbitMQMessageBase(params)) {
      return RabbitMQMessageDto.create(params);
    }

    if (!AuctionMessageDto.isAuctionCreateParams(params)) {
      throw new Error(
        'AuctionMessageDto.create expected auction params with connectedRealmId.',
      );
    }

    return new AuctionMessageDto({
      id: `auction-${params.connectedRealmId}`,
      data: params,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
      routingKey: params.routingKey ?? 'dma.auctions.normal',
      persistent: true,
      expiration: params.expiration ?? TIME_MS.ONE_HOUR,
    });
  }
}
