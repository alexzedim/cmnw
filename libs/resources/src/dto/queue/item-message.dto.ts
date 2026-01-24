import { IRabbitMQMessageBase, RabbitMQMessageDto } from '@app/resources/dto/queue';
import { ItemJobQueue } from '@app/resources/types';
import { TIME_MS } from '@app/resources/constants';

/**
 * Item Message DTO for RabbitMQ
 *
 * Wraps ItemJobQueue with RabbitMQ-specific metadata and routing.
 * Used for item data synchronization from Blizzard API.
 */
export class ItemMessageDto extends RabbitMQMessageDto<ItemJobQueue> {
  readonly payload: ItemJobQueue;

  constructor(params: any) {
    const itemData = params.data || params.payload || params;

    super({
      messageId: `item-${itemData.itemId}`,
      data: itemData,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
      routingKey: params.routingKey ?? 'dma.items.normal',
      persistent: params.persistent ?? true,
      expiration: params.expiration,
      metadata: params.metadata,
    });

    this.payload = itemData;
  }

  /**
   * Create from item data with RabbitMQ routing
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T>;
  static create(params: {
    data: ItemJobQueue;
    priority?: number;
    source?: string;
    routingKey?: string;
    expiration?: number;
  }): ItemMessageDto;
  static create(
    params:
      | IRabbitMQMessageBase<ItemJobQueue>
      | {
          data: ItemJobQueue;
          priority?: number;
          source?: string;
          routingKey?: string;
          expiration?: number;
        },
  ): RabbitMQMessageDto<ItemJobQueue> | ItemMessageDto {
    if (
      'id' in (params as any) ||
      'persistent' in (params as any) ||
      'metadata' in (params as any)
    ) {
      return RabbitMQMessageDto.create(params as IRabbitMQMessageBase<ItemJobQueue>);
    }

    return new ItemMessageDto({
      id: params.data.itemId,
      data: params.data,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
      routingKey: params.routingKey ?? 'dma.items.normal',
      persistent: true,
      expiration: params.expiration ?? TIME_MS.TWELVE_HOURS,
    });
  }
}
