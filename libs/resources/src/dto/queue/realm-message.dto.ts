import { IQueueMessageBase, QueueMessageDto } from '@app/resources/dto/queue';
import { RealmJobQueue } from '@app/resources/types/queue/queue.type';

/**
 * Realm Message DTO for BullMQ
 *
 * Wraps RealmJobQueue with BullMQ-specific properties.
 * Used for realm data synchronization from Blizzard API.
 */
export class RealmMessageDto extends QueueMessageDto<RealmJobQueue> {
  private static isQueueMessageBase<T>(params: any): params is IQueueMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isRealmCreateParams(
    params: any,
  ): params is Omit<Partial<RealmMessageDto>, 'id'> & Pick<RealmJobQueue, 'id'> {
    return !!params && typeof params === 'object' && 'id' in params;
  }

  constructor(params: any) {
    const messageParams = params ?? {};
    const { data, priority, source, attempts, metadata, ...rest } = messageParams;
    const realmData = data ? { ...rest, ...data } : rest;

    super({
      data: realmData,
      priority: priority ?? 5,
      source: source ?? 'core',
      attempts,
      metadata,
    });
  }

  /**
   * Create from realm data with BullMQ options
   */
  static create<T>(params: IQueueMessageBase<T>): QueueMessageDto<T>;
  static create(
    data: Omit<Partial<RealmMessageDto>, 'id'> & Pick<RealmJobQueue, 'id'>,
  ): RealmMessageDto;
  static create(
    params:
      | IQueueMessageBase<RealmJobQueue>
      | (Omit<Partial<RealmMessageDto>, 'id'> & Pick<RealmJobQueue, 'id'>),
  ): QueueMessageDto<RealmJobQueue> | RealmMessageDto {
    if (RealmMessageDto.isQueueMessageBase(params)) {
      return QueueMessageDto.create(params);
    }

    if (!RealmMessageDto.isRealmCreateParams(params)) {
      throw new Error('RealmMessageDto.create expected realm params with id.');
    }

    return new RealmMessageDto({
      data: params,
      priority: params.priority ?? 5,
      source: params.source ?? 'core',
    });
  }
}
