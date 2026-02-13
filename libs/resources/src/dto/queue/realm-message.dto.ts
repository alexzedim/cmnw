import { Logger } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { realmsQueue } from '../../queues/realms.queue';

/**
 * Base interface for creating realm job data
 */
export interface IRealmMessageBase {
  id: number;
  name: string;
  slug: string;
  region: 'eu' | 'us' | 'kr' | 'tw';
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

export class RealmMessageDto {
  public readonly name: string;
  public readonly data: IRealmMessageBase;
  public readonly opts?: JobsOptions;

  private static readonly realmLogger = new Logger(RealmMessageDto.name);

  /**
   * Constructor - creates a validated Realm Message with BullMQ properties
   * @param name - Queue name (e.g., 'core.realms')
   * @param data - Realm message data
   * @param opts - BullMQ job options (optional)
   */
  constructor(name: string, data: IRealmMessageBase, opts?: JobsOptions) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  /**
   * Create from realm data with BullMQ options
   * @param data - Realm data
   * @param opts - Optional job options
   * @returns New RealmMessageDto instance
   */
  static create(data: IRealmMessageBase, opts?: JobsOptions): RealmMessageDto {
    const mergedOpts = {
      jobId: `${data.id}`,
      ...realmsQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new RealmMessageDto(`${data.slug}`, data, mergedOpts);
    return dto;
  }
}
