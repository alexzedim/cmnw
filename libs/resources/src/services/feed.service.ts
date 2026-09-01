import { wsConfig } from '@app/configuration';
import { LoggerService } from '@app/logger';
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';

import { FeedEventDto, type FeedEventInput } from '../dto/feed/feed-event.dto';

@Injectable()
export class FeedService {
  private readonly logger = new LoggerService(FeedService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async emit(event: FeedEventInput): Promise<void> {
    try {
      const payload = FeedEventDto.create(event);
      await this.redis.publish(wsConfig.channel, JSON.stringify(payload));
    } catch (error) {
      this.logger.error({ logTag: 'FEED_PUBLISH', errorOrException: error });
    }
  }
}
