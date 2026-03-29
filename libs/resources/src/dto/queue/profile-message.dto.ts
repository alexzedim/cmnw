import { Logger } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { profileQueue } from '../../queues/profile.queue';
import { toGuid } from '@app/resources/transformers';

/**
 * Base interface for creating profile job data
 */
export interface IProfileMessageBase {
  // Essential identification
  guid?: string;
  name: string;
  realm: string;
  region: 'eu';

  // Profile data
  achievementPoints?: number;
  averageItemLevel?: number;
  equippedItemLevel?: number;
  covenantId?: number;
  mountsNumber?: number;
  petsNumber?: number;

  // Media
  avatarImage?: string;
  insetImage?: string;
  mainImage?: string;

  // Character attributes
  class?: string;
  race?: string;
  faction?: string;
  level?: number;
  specialization?: string;
  gender?: string;

  // Processing flags
  lookingForGuild?: string;
  updateRIO?: boolean;
  updateWCL?: boolean;
  updateWP?: boolean;

  // API credentials
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
}

export class ProfileMessageDto {
  public readonly name: string;
  public readonly data: IProfileMessageBase;
  public readonly opts?: JobsOptions;

  private static readonly profileLogger = new Logger(ProfileMessageDto.name);

  /**
   * Constructor - creates a validated Profile Message with BullMQ properties
   * @param name - Queue name (e.g., 'osint.profiles')
   * @param data - Profile message data
   * @param opts - BullMQ job options (optional)
   */
  constructor(name: string, data: IProfileMessageBase, opts?: JobsOptions) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  /**
   * Create from profile data with BullMQ options
   * @param data - Profile data
   * @param opts - Optional job options
   * @returns New ProfileMessageDto instance
   */
  static create(data: IProfileMessageBase, opts?: JobsOptions): ProfileMessageDto {
    const guid = toGuid(data.name, data.realm);

    const mergedOpts = {
      jobId: guid,
      ...profileQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new ProfileMessageDto(profileQueue.name, data, mergedOpts);
    return dto;
  }

  /**
   * Create from WoW Progress LFG data
   *
   * Priority: 1 (Very Low - background LFG processing)
   */
  static fromWowProgressLfg(params: { name: string; realm: string; lookingForGuild: string }): ProfileMessageDto {
    const guid = toGuid(params.name, params.realm);
    const profileData: IProfileMessageBase = {
      guid,
      name: params.name,
      realm: params.realm,
      region: 'eu',
      lookingForGuild: params.lookingForGuild,
      updateRIO: true,
      updateWCL: true,
      updateWP: true,
    };

    const opts: JobsOptions = {
      jobId: guid,
      ...profileQueue.defaultJobOptions,
      priority: 1,
    };

    const dto = new ProfileMessageDto(profileQueue.name, profileData, opts);
    dto.validate(false, 'ProfileMessageDto.fromWowProgressLfg');
    return dto;
  }

  /**
   * Validate that required fields are present
   * @param strict - If true, throws errors; if false, logs warnings
   * @param logTag - Optional log tag for warnings (defaults to 'ProfileMessageDto.validate')
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true, logTag?: string): void {
    const profileData = this.data;

    if (profileData?.name && (typeof profileData.name !== 'string' || profileData.name.trim() === '')) {
      const message = `Validation failed: name must be a non-empty string`;
      if (strict) {
        throw new Error(message);
      } else {
        ProfileMessageDto.profileLogger.warn({
          logTag: logTag || 'ProfileMessageDto.validate',
          message,
          name: profileData?.name,
        });
      }
    }

    if (profileData?.realm && (typeof profileData.realm !== 'string' || profileData.realm.trim() === '')) {
      const message = `Validation failed: realm must be a non-empty string`;
      if (strict) {
        throw new Error(message);
      } else {
        ProfileMessageDto.profileLogger.warn({
          logTag: logTag || 'ProfileMessageDto.validate',
          message,
          realm: profileData?.realm,
        });
      }
    }

    if (profileData?.region !== 'eu') {
      const message = `Validation failed: region must be 'eu'`;
      if (strict) {
        throw new Error(message);
      } else {
        ProfileMessageDto.profileLogger.warn({
          logTag: logTag || 'ProfileMessageDto.validate',
          message,
          region: profileData?.region,
        });
      }
    }
  }
}
