import { Logger } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { itemsQueue } from '../../queues/items.queue';

/**
 * Base interface for creating item job data
 */
export interface IItemMessageBase {
  itemId: number;
  region?: 'eu' | 'us' | 'kr' | 'tw';
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

export class ItemMessageDto {
  public readonly name: string;
  public readonly data: IItemMessageBase;
  public readonly opts?: JobsOptions;

  private static readonly itemLogger = new Logger(ItemMessageDto.name);

  /**
   * Constructor - creates a validated Item Message with BullMQ properties
   * @param name - Queue name (e.g., 'dma.items')
   * @param data - Item message data
   * @param opts - BullMQ job options (optional)
   */
  constructor(name: string, data: IItemMessageBase, opts?: JobsOptions) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  /**
   * Create from item data with BullMQ options
   * @param data - Item data
   * @param opts - Optional job options
   * @returns New ItemMessageDto instance
   */
  static create(data: IItemMessageBase, opts?: JobsOptions): ItemMessageDto {
    const mergedOpts = {
      ...itemsQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new ItemMessageDto(itemsQueue.name, data, mergedOpts);
    return dto;
  }
}
