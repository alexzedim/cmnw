import {
  IRabbitMQMessageBase,
  RabbitMQMessageDto,
} from '@app/resources/dto/queue';

import { RealmJobQueue } from '@app/resources/types';
import { TIME_MS } from '@app/resources/constants';

/**
 * Realm Message DTO for RabbitMQ
 *
 * Wraps RealmJobQueue with RabbitMQ-specific metadata and routing.
 * Used for realm data synchronization from Blizzard API.
 */
export class RealmMessageDto extends RabbitMQMessageDto<RealmJobQueue> {
  readonly payload: RealmJobQueue;

  constructor(params: any) {
    const realmData = params.data || params.payload || params;

    super({
      messageId: params.id || realmData.id,
      data: realmData,
      priority: params.priority ?? 5,
      source: params.source ?? 'core',
      routingKey: params.routingKey ?? 'core.realms.normal',
      persistent: params.persistent ?? true,
      expiration: params.expiration,
      metadata: params.metadata,
    });

    this.payload = realmData;
  }

  /**
   * Create from realm data with RabbitMQ routing
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T>;
  static create(params: {
    data: RealmJobQueue;
    priority?: number;
    source?: string;
    routingKey?: string;
    expiration?: number;
  }): RealmMessageDto;

  static create(
    params:
      | IRabbitMQMessageBase<RealmJobQueue>
      | {
          data: RealmJobQueue;
          priority?: number;
          source?: string;
          routingKey?: string;
          expiration?: number;
        },
  ): RabbitMQMessageDto<RealmJobQueue> | RealmMessageDto {
    if (
      'id' in (params as any) ||
      'persistent' in (params as any) ||
      'metadata' in (params as any)
    ) {
      return RabbitMQMessageDto.create(
        params as IRabbitMQMessageBase<RealmJobQueue>,
      );
    }

    return new RealmMessageDto({
      id: params.data.id,
      data: params.data,
      priority: params.priority ?? 5,
      source: params.source ?? 'core',
      routingKey: params.routingKey ?? 'core.realms.normal',
      persistent: true,
      expiration: params.expiration ?? TIME_MS.TWELVE_HOURS,
    });
  }
}
