import {
  IRabbitMQMessageBase,
  RabbitMQMessageDto,
} from '@app/resources/dto/queue';

import { AuctionJobQueue } from '@app/resources/types';
import { TIME_MS } from '@app/resources/constants';

/**
 * Auction Message DTO for RabbitMQ
 *
 * Wraps AuctionJobQueue with RabbitMQ-specific metadata and routing.
 * Used for auction data synchronization from Blizzard API.
 */
export class AuctionMessageDto extends RabbitMQMessageDto<AuctionJobQueue> {
  readonly payload: AuctionJobQueue;

  constructor(params: any) {
    const auctionData = params.data || params.payload || params;

    super({
      id: params.id || `auction-${auctionData.connectedRealmId}`,
      data: auctionData,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
      routingKey: params.routingKey ?? 'dma.auctions.normal',
      persistent: params.persistent ?? true,
      expiration: params.expiration,
      metadata: params.metadata,
    });

    this.payload = auctionData;
  }

  /**
   * Create from auction data with RabbitMQ routing
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T>;
  static create(params: {
    data: AuctionJobQueue;
    priority?: number;
    source?: string;
    routingKey?: string;
    expiration?: number;
  }): AuctionMessageDto;
  static create(
    params:
      | IRabbitMQMessageBase<AuctionJobQueue>
      | {
          data: AuctionJobQueue;
          priority?: number;
          source?: string;
          routingKey?: string;
          expiration?: number;
        },
  ): RabbitMQMessageDto<AuctionJobQueue> | AuctionMessageDto {
    if (
      'id' in (params as any) ||
      'persistent' in (params as any) ||
      'metadata' in (params as any)
    ) {
      return RabbitMQMessageDto.create(
        params as IRabbitMQMessageBase<AuctionJobQueue>,
      );
    }

    return new AuctionMessageDto({
      id: `auction-${params.data.connectedRealmId}`,
      data: params.data,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
      routingKey: params.routingKey ?? 'dma.auctions.normal',
      persistent: true,
      expiration: params.expiration ?? TIME_MS.TWELVE_HOURS,
    });
  }
}
