import { Logger } from '@nestjs/common';
import { OSINT_SOURCE, TIME_MS } from '../../constants';
import { toGuid } from '../../transformers';
import { IQueueMessageBase, QueueMessageDto } from '@app/resources/dto/queue';
import { CharacterJobQueue } from '@app/resources/types/queue/queue.type';

/**
 * Base interface for character job data payload
 * Contains all character-specific data that travels in job.data field
 */
export interface ICharacterMessageBase {
  // Essential identification
  id?: number;
  guid?: string;
  name: string;
  realm: string;
  region: 'eu';

  // Realm info
  realmId?: number;
  realmName?: string;

  // Guild info
  guild?: string;
  guildGuid?: string;
  guildId?: number;
  guildRank?: number;

  // Character attributes
  class?: string;
  race?: string;
  faction?: string;
  level?: number;
  specialization?: string;
  gender?: string;
  lookingForGuild?: string;

  // Update flags
  updateRIO?: boolean;
  updateWCL?: boolean;
  updateWP?: boolean;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  lastModified?: Date;

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

  // Status
  statusCode?: number;
  hashA?: string;
  hashB?: string;

  // Processing metadata
  forceUpdate: number;
  createOnlyUnique: boolean;
  iteration?: number;
  updatedBy: OSINT_SOURCE;
  createdBy?: OSINT_SOURCE;

  // API credentials
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

/**
 * Character Message DTO for BullMQ
 *
 * Simplified wrapper around QueueMessageDto that contains only:
 * - data: Character data payload (ICharacterMessageBase)
 * - priority: Job priority (0-10)
 * - source: Source service/component
 * - attempts: Retry attempts
 * - metadata: Additional job metadata
 *
 * All character-specific properties are stored in data field.
 */
export class CharacterMessageDto extends QueueMessageDto<ICharacterMessageBase> {
  private static readonly characterLogger = new Logger(CharacterMessageDto.name);

  private static isQueueMessageBase<T>(
    params: any,
  ): params is IQueueMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isCharacterCreateParams(
    params: any,
  ): params is Omit<Partial<ICharacterMessageBase>, 'guid'> &
    Pick<ICharacterMessageBase, 'name' | 'realm'> {
    return (
      !!params && typeof params === 'object' && 'name' in params && 'realm' in params
    );
  }

  constructor(params: any) {
    const messageParams = params ?? {};
    const { data, priority, source, attempts, metadata, ...rest } = messageParams;
    const characterData = data ? { ...rest, ...data } : rest;

    super({
      data: characterData,
      priority: priority ?? 5,
      source: source ?? OSINT_SOURCE.CHARACTER_INDEX,
      attempts,
      metadata,
    });
  }

  /**
   * Create with auto-generated guid from name and realm
   */
  static create<T>(params: IQueueMessageBase<T>): QueueMessageDto<T>;
  static create(
    data: Omit<Partial<ICharacterMessageBase>, 'guid'> &
      Pick<ICharacterMessageBase, 'name' | 'realm'>,
  ): CharacterMessageDto;
  static create(
    params:
      | IQueueMessageBase<any>
      | (Omit<Partial<ICharacterMessageBase>, 'guid'> &
          Pick<ICharacterMessageBase, 'name' | 'realm'>),
  ): QueueMessageDto<any> | CharacterMessageDto {
    if (CharacterMessageDto.isQueueMessageBase(params)) {
      return QueueMessageDto.create(params);
    }

    if (!CharacterMessageDto.isCharacterCreateParams(params)) {
      throw new Error(
        'CharacterMessageDto.create expected character params with name and realm.',
      );
    }

    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      ...params,
      guid,
      createdBy: params.createdBy || params.updatedBy,
    });
    dto.validate(false, 'CharacterMessageDto.create');
    return dto;
  }

  /**
   * Create from Mythic+ Ladder data
   */
  static fromMythicPlusLadder(params: {
    id: number;
    name: string;
    realm: string;
    faction: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      name: params.name,
      realm: params.realm,
      faction: params.faction,
      forceUpdate: TIME_MS.FOUR_HOURS,
      region: 'eu',
      createdBy: OSINT_SOURCE.MYTHIC_PLUS,
      updatedBy: OSINT_SOURCE.MYTHIC_PLUS,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 7,
      source: OSINT_SOURCE.MYTHIC_PLUS,
    });
    dto.validate(false, 'CharacterMessageDto.fromMythicPlusLadder');
    return dto;
  }

  /**
   * Create from PvP Ladder data
   */
  static fromPvPLadder(params: {
    name: string;
    realm: string;
    faction: string;
    iteration?: number;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      name: params.name,
      realm: params.realm,
      faction: params.faction,
      iteration: params.iteration,
      forceUpdate: TIME_MS.FOUR_HOURS,
      region: 'eu',
      createdBy: OSINT_SOURCE.PVP_LADDER,
      updatedBy: OSINT_SOURCE.PVP_LADDER,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 7,
      source: OSINT_SOURCE.PVP_LADDER,
    });
    dto.validate(false, 'CharacterMessageDto.fromPvPLadder');
    return dto;
  }

  /**
   * Create from Warcraft Logs raid data
   */
  static fromWarcraftLogs(params: {
    name: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      name: params.name,
      realm: params.realm,
      forceUpdate: TIME_MS.ONE_MINUTE,
      region: 'eu',
      createdBy: OSINT_SOURCE.WARCRAFT_LOGS,
      updatedBy: OSINT_SOURCE.WARCRAFT_LOGS,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 8,
      source: OSINT_SOURCE.WARCRAFT_LOGS,
    });
    dto.validate(false, 'CharacterMessageDto.fromWarcraftLogs');
    return dto;
  }

  /**
   * Create from WoW Progress LFG data
   */
  static fromWowProgressLfg(params: {
    name: string;
    realm: string;
    realmId: number;
    realmName: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      name: params.name,
      realm: params.realm,
      realmId: params.realmId,
      realmName: params.realmName,
      forceUpdate: TIME_MS.THIRTY_MINUTES,
      region: 'eu',
      createdBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
      updatedBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
      createOnlyUnique: false,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 6,
      source: OSINT_SOURCE.WOW_PROGRESS_LFG,
    });
    dto.validate(false, 'CharacterMessageDto.fromWowProgressLfg');
    return dto;
  }

  /**
   * Create from Guild Roster (Guild Master)
   */
  static fromGuildMaster(params: {
    id: number;
    name: string;
    realm: string;
    guild: string;
    guildGuid: string;
    guildId: number;
    class: string | null;
    race?: string | null;
    faction?: string | null;
    level: number | null;
    lastModified: Date;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const resolvedFaction = params.faction ?? undefined;
    const dto = new CharacterMessageDto({
      guid,
      id: params.id,
      name: params.name,
      realm: params.realm,
      guild: params.guild,
      guildGuid: params.guildGuid,
      guildId: params.guildId,
      guildRank: 0,
      class: params.class || undefined,
      race: params.race || undefined,
      faction: resolvedFaction,
      level: params.level || undefined,
      lastModified: params.lastModified,
      forceUpdate: TIME_MS.IMMEDIATE,
      region: 'eu',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      createOnlyUnique: false,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 9,
      source: OSINT_SOURCE.GUILD_ROSTER,
    });
    dto.validate(false, 'CharacterMessageDto.fromGuildMaster');
    return dto;
  }

  /**
   * Create from Character Index (database)
   */
  static fromCharacterIndex(params: {
    guid: string;
    name: string;
    realm: string;
    iteration: number;
    clientId: string;
    clientSecret: string;
    accessToken: string;
    [key: string]: any;
  }): CharacterMessageDto {
    const { id: characterId, ...rest } = params;
    const dto = new CharacterMessageDto({
      ...rest,
      characterId,
      region: 'eu',
      forceUpdate: TIME_MS.TWELVE_HOURS,
      createdBy: OSINT_SOURCE.CHARACTER_INDEX,
      updatedBy: OSINT_SOURCE.CHARACTER_INDEX,
      createOnlyUnique: false,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      iteration: params.iteration,
      priority: 5,
      source: OSINT_SOURCE.CHARACTER_INDEX,
    });
    dto.validate(false, 'CharacterMessageDto.fromCharacterIndex');
    return dto;
  }

  /**
   * Create from Guild Member (non-guild master)
   */
  static fromGuildMember(params: {
    id?: number;
    name: string;
    realm: string;
    realmId: number;
    realmName: string;
    guild: string;
    guildGuid: string;
    guildId: number;
    guildRank: number;
    class: string | null;
    faction: string;
    level: number | null;
    lastModified: Date;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      id: params.id,
      name: params.name,
      realm: params.realm,
      realmId: params.realmId,
      realmName: params.realmName,
      guild: params.guild,
      guildGuid: params.guildGuid,
      guildId: params.guildId,
      guildRank: params.guildRank,
      class: params.class || undefined,
      faction: params.faction,
      level: params.level || undefined,
      lastModified: params.lastModified,
      forceUpdate: TIME_MS.ONE_WEEK,
      region: 'eu',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 3,
      source: OSINT_SOURCE.GUILD_ROSTER,
    });
    dto.validate(false, 'CharacterMessageDto.fromGuildMember');
    return dto;
  }

  /**
   * Create from S3 migration file
   */
  static fromMigrationFile(params: {
    guid: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const [nameSlug, realmSlug] = params.guid.split('@');
    const dto = new CharacterMessageDto({
      guid: params.guid,
      name: nameSlug,
      realm: realmSlug,
      region: 'eu',
      forceUpdate: TIME_MS.TWELVE_HOURS,
      createdBy: OSINT_SOURCE.OSINT_MIGRATION,
      updatedBy: OSINT_SOURCE.OSINT_MIGRATION,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      priority: 2,
      source: OSINT_SOURCE.OSINT_MIGRATION,
    });
    dto.validate(false, 'CharacterMessageDto.fromMigrationFile');
    return dto;
  }

  /**
   * Create from character request (API-driven)
   */
  static fromCharacterRequest(params: {
    name: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      name: params.name,
      realm: params.realm,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      createdBy: OSINT_SOURCE.CHARACTER_REQUEST,
      updatedBy: OSINT_SOURCE.CHARACTER_REQUEST,
      createOnlyUnique: false,
      forceUpdate: TIME_MS.ONE_HOUR,
      region: 'eu',
      priority: 10,
      source: OSINT_SOURCE.CHARACTER_REQUEST,
    });
    dto.validate(false, 'CharacterMessageDto.fromCharacterRequest');
    return dto;
  }

  /**
   * Validate message structure
   * @param strict - If true, throws errors; if false, logs warnings
   * @param logTag - Optional log tag for warnings
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true, logTag?: string): void {
    const characterData = this.data as ICharacterMessageBase | undefined;

    if (characterData?.guid && !characterData.guid.includes('@')) {
      const message = `Validation failed: guid '${characterData.guid}' must contain '@' separator`;
      if (strict) {
        throw new Error(message);
      } else {
        CharacterMessageDto.characterLogger.warn({
          logTag: logTag || 'CharacterMessageDto.validate',
          message,
          guid: characterData.guid,
        });
      }
    }

    if (
      characterData?.forceUpdate !== undefined &&
      (typeof characterData.forceUpdate !== 'number' ||
        characterData.forceUpdate < 0)
    ) {
      const message = `Validation failed: forceUpdate must be a positive number, got '${characterData.forceUpdate}' for guid '${characterData?.guid || 'unknown'}'`;
      if (strict) {
        throw new Error(message);
      } else {
        CharacterMessageDto.characterLogger.warn({
          logTag: logTag || 'CharacterMessageDto.validate',
          message,
          guid: characterData?.guid,
          forceUpdate: characterData?.forceUpdate,
        });
      }
    }

    // Call parent validation
    super.validate(strict);
  }
}
