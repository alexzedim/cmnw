import { IQueueMessageBase, QueueMessageDto } from '@app/resources/dto/queue';

/**
 * Base interface for profile job data
 * Contains all profile-specific data that travels in job.data field
 */
export interface IProfileMessageBase {
  // Essential identification
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

  // API credentials
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

/**
 * Profile Message DTO for BullMQ
 *
 * Simplified wrapper around QueueMessageDto that contains only:
 * - data: Profile data payload (IProfileMessageBase)
 * - priority: Job priority (0-10)
 * - source: Source service/component
 * - attempts: Retry attempts
 * - metadata: Additional job metadata
 *
 * All profile-specific properties are stored in data field.
 */
export class ProfileMessageDto extends QueueMessageDto<IProfileMessageBase> {
  private static isQueueMessageBase<T>(params: any): params is IQueueMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isProfileCreateParams(
    params: any,
  ): params is Omit<Partial<IProfileMessageBase>, 'guid'> &
    Pick<IProfileMessageBase, 'name' | 'realm'> {
    return (
      !!params && typeof params === 'object' && 'name' in params && 'realm' in params
    );
  }

  constructor(params: any) {
    const messageParams = params ?? {};
    const { data, priority, source, attempts, metadata, ...rest } = messageParams;
    const profileData = data ? { ...rest, ...data } : rest;

    super({
      data: profileData,
      priority: priority ?? 5,
      source: source ?? 'osint',
      attempts,
      metadata,
    });
  }

  /**
   * Create with auto-generated guid from name and realm
   */
  static create<T>(params: IQueueMessageBase<T>): QueueMessageDto<T>;
  static create(
    data: Omit<Partial<IProfileMessageBase>, 'guid'> &
      Pick<IProfileMessageBase, 'name' | 'realm'>,
  ): ProfileMessageDto;
  static create(
    params:
      | IQueueMessageBase<IProfileMessageBase>
      | (Omit<Partial<IProfileMessageBase>, 'guid'> &
          Pick<IProfileMessageBase, 'name' | 'realm'>),
  ): QueueMessageDto<IProfileMessageBase> | ProfileMessageDto {
    if (ProfileMessageDto.isQueueMessageBase(params)) {
      return QueueMessageDto.create(params);
    }

    if (!ProfileMessageDto.isProfileCreateParams(params)) {
      throw new Error(
        'ProfileMessageDto.create expected profile params with name and realm.',
      );
    }

    const guid = `${params.name}@${params.realm}`;
    const dto = new ProfileMessageDto({
      ...params,
      guid,
      createdBy: params.createdBy || params.updatedBy,
    });
    dto.validate(false, 'ProfileMessageDto.create');
    return dto;
  }

  /**
   * Validate that required fields are present
   * @param strict - If true, throws errors; if false, logs warnings
   * @param logTag - Optional log tag for warnings (defaults to 'ProfileMessageDto.validate')
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true, logTag?: string): void {
    const profileData = this.data as IProfileMessageBase | undefined;

    if (
      profileData?.name &&
      (typeof profileData.name !== 'string' || profileData.name.trim() === '')
    ) {
      const message = `Validation failed: name must be a non-empty string`;
      if (strict) {
        throw new Error(message);
      } else {
        this.logger.warn({
          logTag: logTag || 'ProfileMessageDto.validate',
          message,
          name: profileData?.name,
        });
      }
    }

    if (
      profileData?.realm &&
      (typeof profileData.realm !== 'string' || profileData.realm.trim() === '')
    ) {
      const message = `Validation failed: realm must be a non-empty string`;
      if (strict) {
        throw new Error(message);
      } else {
        this.logger.warn({
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
        this.logger.warn({
          logTag: logTag || 'ProfileMessageDto.validate',
          message,
          region: profileData?.region,
        });
      }
    }

    // Warn about missing optional credentials (non-blocking)
    if (!strict) {
      const credentials = ['clientId', 'clientSecret', 'accessToken'];
      const missingCredentials = credentials.filter(
        (field) => !profileData?.[field] || profileData?.[field] === undefined,
      );
      if (missingCredentials.length > 0) {
        this.logger.warn({
          logTag: logTag || 'ProfileMessageDto.validate',
          message: `Missing optional credentials: ${missingCredentials.join(', ')}`,
          name: profileData?.name,
          missingCredentials,
        });
      }
    }

    // Call parent validation
    super.validate(strict);
  }
}
