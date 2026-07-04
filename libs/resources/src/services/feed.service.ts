import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { LoggerService } from '@app/logger';
import { wsConfig } from '@app/configuration';

import { FeedEventCategory, FeedStatus } from '../constants/feed.constants';
import { FeedEventDto, FeedEventInput, IFeedEventBase } from '../dto/feed/feed-event.dto';

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

  async emitWorker(
    status: FeedStatus,
    count: number,
    identifier: string,
    durationMs: number,
    source: string,
    category: FeedEventCategory,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const payload = FeedEventDto.fromWorker(status, count, identifier, durationMs, source, category, meta);
      await this.redis.publish(wsConfig.channel, JSON.stringify(payload));
    } catch (error) {
      this.logger.error({ logTag: 'FEED_PUBLISH', errorOrException: error });
    }
  }

  parse(raw: string): IFeedEventBase | null {
    try {
      return JSON.parse(raw) as IFeedEventBase;
    } catch (error) {
      this.logger.warn({ logTag: 'FEED_PARSE', message: 'failed to parse feed payload', error: String(error) });
      return null;
    }
  }
}
