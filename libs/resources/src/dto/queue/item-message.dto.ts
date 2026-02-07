import { IQueueMessageBase, QueueMessageDto } from '@app/resources/dto/queue';
import { ItemJobQueue } from '@app/resources/types/queue/queue.type';

/**
 * Item Message DTO for BullMQ
 *
 * Wraps ItemJobQueue with BullMQ-specific properties.
 * Used for item data synchronization from Blizzard API.
 */
export class ItemMessageDto extends QueueMessageDto<ItemJobQueue> {
  private static isQueueMessageBase<T>(params: any): params is IQueueMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isItemCreateParams(
    params: any,
  ): params is Omit<Partial<ItemMessageDto>, 'itemId'> &
    Pick<ItemJobQueue, 'itemId'> {
    return !!params && typeof params === 'object' && 'itemId' in params;
  }

  constructor(params: any) {
    const messageParams = params ?? {};
    const { data, priority, source, attempts, metadata, ...rest } = messageParams;
    const itemData = data ? { ...rest, ...data } : rest;

    super({
      data: itemData,
      priority: priority ?? 5,
      source: source ?? 'dma',
      attempts,
      metadata,
    });
  }

  /**
   * Create from item data with BullMQ options
   */
  static create<T>(params: IQueueMessageBase<T>): QueueMessageDto<T>;
  static create(
    data: Omit<Partial<ItemJobQueue>, 'itemId'> & Pick<ItemJobQueue, 'itemId'>,
  ): ItemMessageDto;
  static create(
    params:
      | IQueueMessageBase<ItemJobQueue>
      | (Omit<Partial<ItemJobQueue>, 'itemId'> & Pick<ItemJobQueue, 'itemId'>),
  ): QueueMessageDto<ItemJobQueue> | ItemMessageDto {
    if (ItemMessageDto.isQueueMessageBase(params)) {
      return QueueMessageDto.create(params);
    }

    if (!ItemMessageDto.isItemCreateParams(params)) {
      throw new Error('ItemMessageDto.create expected item params with itemId.');
    }

    return new ItemMessageDto({
      data: params,
      priority: params.priority ?? 5,
      source: params.source ?? 'dma',
    });
  }
}
