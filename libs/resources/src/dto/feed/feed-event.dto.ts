import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';

import {
  type FeedEventCategory,
  type FeedStatus,
  isFeedEventCategory,
  isFeedStatus,
} from '../../constants/feed.constants';

export interface IFeedEventBase {
  readonly id: string;
  readonly timestamp: string;
  readonly category: FeedEventCategory;
  readonly status: FeedStatus;
  readonly message: string;
  readonly source?: string;
  readonly meta?: Record<string, unknown>;
}

export type FeedEventInput = Omit<IFeedEventBase, 'id' | 'timestamp'> & {
  readonly id?: string;
  readonly timestamp?: string;
};

export class FeedEventDto implements IFeedEventBase {
  private static readonly logger = new Logger(FeedEventDto.name);

  readonly id: string;
  readonly timestamp: string;
  readonly category: FeedEventCategory;
  readonly status: FeedStatus;
  readonly message: string;
  readonly source?: string;
  readonly meta?: Record<string, unknown>;

  private constructor(event: IFeedEventBase) {
    this.id = event.id;
    this.timestamp = event.timestamp;
    this.category = event.category;
    this.status = event.status;
    this.message = event.message;
    this.source = event.source;
    this.meta = event.meta;
  }

  static create(input: FeedEventInput, strict = false): IFeedEventBase {
    const id = input.id || randomUUID();
    const timestamp = input.timestamp || new Date().toISOString();

    if (!isFeedEventCategory(input.category)) {
      const message = `invalid feed event category: ${String(input.category)}`;
      if (strict) throw new Error(message);
      FeedEventDto.logger.warn({ logTag: 'FeedEventDto.create', message, input });
    }

    if (!isFeedStatus(input.status)) {
      const message = `invalid feed status: ${String(input.status)}`;
      if (strict) throw new Error(message);
      FeedEventDto.logger.warn({ logTag: 'FeedEventDto.create', message, input });
    }

    if (!input.message || typeof input.message !== 'string') {
      const message = 'feed event message is required';
      if (strict) throw new Error(message);
      FeedEventDto.logger.warn({ logTag: 'FeedEventDto.create', message, input });
    }

    const event: IFeedEventBase = {
      id,
      timestamp,
      category: input.category,
      status: input.status,
      message: input.message.toLowerCase(),
      source: input.source,
      meta: input.meta,
    };

    return new FeedEventDto(event);
  }

  toJSON(): IFeedEventBase {
    return {
      id: this.id,
      timestamp: this.timestamp,
      category: this.category,
      status: this.status,
      message: this.message,
      source: this.source,
      meta: this.meta,
    };
  }
}
