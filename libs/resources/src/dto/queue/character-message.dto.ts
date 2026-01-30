import { Logger } from '@nestjs/common';
import { OSINT_SOURCE, TIME_MS } from '../../constants';
import { toGuid } from '../../transformers';
import { IRabbitMQMessageBase, RabbitMQMessageDto } from '@app/resources/dto/queue';

/**
 * Base interface for character message data payload
 * Contains all character-specific data that travels in the message.data field
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
 * Character Message DTO for RabbitMQ
 *
 * Simplified wrapper around RabbitMQMessageDto that contains only:
 * - messageId: Unique message identifier
 * - data: Character data payload (ICharacterMessageBase)
 * - metadata: RabbitMQ message metadata
 *
 * All character-specific properties are stored in the data field.
 */
export class CharacterMessageDto extends RabbitMQMessageDto<ICharacterMessageBase> {
  private static readonly characterLogger = new Logger(CharacterMessageDto.name);

  private static isRabbitMQMessageBase<T>(
    params: any,
  ): params is IRabbitMQMessageBase<T> {
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
    const characterData = params.data || params;

    super({
      messageId: characterData.guid || params.id,
      data: characterData,
      priority: params.priority ?? 5,
      source: params.source ?? OSINT_SOURCE.CHARACTER_INDEX,
      routingKey: params.routingKey ?? 'osint.characters.index.normal',
      persistent: params.persistent ?? true,
      expiration: params.expiration,
      metadata: params.metadata,
    });
  }

  /**
   * Create with auto-generated guid from name and realm
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T>;
  static create(
    data: Omit<Partial<ICharacterMessageBase>, 'guid'> &
      Pick<ICharacterMessageBase, 'name' | 'realm'>,
  ): CharacterMessageDto;
  static create(
    params:
      | IRabbitMQMessageBase<any>
      | (Omit<Partial<ICharacterMessageBase>, 'guid'> &
          Pick<ICharacterMessageBase, 'name' | 'realm'>),
  ): RabbitMQMessageDto<any> | CharacterMessageDto {
    if (CharacterMessageDto.isRabbitMQMessageBase(params)) {
      return RabbitMQMessageDto.create(params);
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
      messageId: guid,
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
      forceUpdate: TIME_MS.FOUR_HOURS, // 4 hours
      region: 'eu',
      createdBy: OSINT_SOURCE.MYTHIC_PLUS,
      updatedBy: OSINT_SOURCE.MYTHIC_PLUS,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      // RabbitMQ metadata
      messageId: guid,
      priority: 7,
      source: OSINT_SOURCE.MYTHIC_PLUS,
      routingKey: 'osint.characters.ladder.high',
      persistent: true,
      expiration: TIME_MS.ONE_HOUR,
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
      forceUpdate: TIME_MS.FOUR_HOURS, // 4 hours
      region: 'eu',
      createdBy: OSINT_SOURCE.PVP_LADDER,
      updatedBy: OSINT_SOURCE.PVP_LADDER,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      // RabbitMQ metadata
      messageId: guid,
      priority: 7,
      source: OSINT_SOURCE.PVP_LADDER,
      routingKey: 'osint.characters.ladder.high',
      persistent: true,
      expiration: TIME_MS.ONE_HOUR,
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
      forceUpdate: TIME_MS.ONE_MINUTE, // 1 minute
      region: 'eu',
      createdBy: OSINT_SOURCE.WARCRAFT_LOGS,
      updatedBy: OSINT_SOURCE.WARCRAFT_LOGS,
      createOnlyUnique: true,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      // RabbitMQ metadata
      messageId: guid,
      priority: 8,
      source: OSINT_SOURCE.WARCRAFT_LOGS,
      routingKey: 'osint.characters.raid.urgent',
      persistent: true,
      expiration: TIME_MS.TEN_MINUTES,
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
      forceUpdate: TIME_MS.THIRTY_MINUTES, // 30 minutes
      region: 'eu',
      createdBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
      updatedBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
      createOnlyUnique: false,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      // RabbitMQ metadata
      messageId: guid,
      priority: 6,
      source: OSINT_SOURCE.WOW_PROGRESS_LFG,
      routingKey: 'osint.characters.lfg.normal',
      persistent: true,
      expiration: TIME_MS.TWO_HOURS,
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
      // @todo validate
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
      // RabbitMQ metadata
      messageId: guid,
      priority: 9,
      source: OSINT_SOURCE.GUILD_ROSTER,
      routingKey: 'osint.characters.guild.urgent',
      persistent: true,
      expiration: TIME_MS.FIVE_MINUTES,
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
      forceUpdate: TIME_MS.TWELVE_HOURS, // 12 hours
      createdBy: OSINT_SOURCE.CHARACTER_INDEX,
      updatedBy: OSINT_SOURCE.CHARACTER_INDEX,
      createOnlyUnique: false,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      iteration: params.iteration,
      // RabbitMQ metadata
      messageId: params.guid,
      priority: 5,
      source: OSINT_SOURCE.CHARACTER_INDEX,
      routingKey: 'osint.characters.index.normal',
      persistent: true,
      expiration: TIME_MS.TWELVE_HOURS,
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
      // RabbitMQ metadata
      messageId: guid,
      priority: 3,
      source: OSINT_SOURCE.GUILD_ROSTER,
      routingKey: 'osint.characters.guild.low',
      persistent: true,
      expiration: TIME_MS.TWENTY_FOUR_HOURS,
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
      // RabbitMQ metadata
      messageId: params.guid,
      priority: 2,
      source: OSINT_SOURCE.OSINT_MIGRATION,
      routingKey: 'osint.characters.migration.low',
      persistent: true,
      expiration: TIME_MS.TWENTY_FOUR_HOURS,
    });
    dto.validate(false, 'CharacterMessageDto.fromMigrationFile');
    return dto;
  }

  /**
   * Create from character request (API-driven)
   */
  static async fromCharacterRequest(params: {
    name: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): Promise<CharacterMessageDto> {
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
      // RabbitMQ metadata
      messageId: guid,
      priority: 10,
      source: OSINT_SOURCE.CHARACTER_REQUEST,
      routingKey: 'osint.characters.request.high',
      persistent: true,
      expiration: TIME_MS.FIVE_MINUTES,
    });
    dto.validate(false, 'CharacterMessageDto.fromCharacterRequest');
    return dto;
  }

  /**
   * Validate message structure
   * @param strict - If true, throws errors; if false, logs warnings
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true, logTag?: string): void {
    const requiredFields = ['messageId', 'data'];

    for (const field of requiredFields) {
      if (this[field] === undefined || this[field] === null) {
        const message = `Validation failed: missing required field '${field}' for guid '${this.data?.guid || 'unknown'}'`;
        if (strict) {
          throw new Error(message);
        } else {
          CharacterMessageDto.characterLogger.warn({
            logTag: logTag || 'CharacterMessageDto.validate',
            message,
            messageId: this.messageId,
          });
        }
      }
    }

    // Validate data payload
    if (this.data && typeof this.data === 'object') {
      const data = this.data as any;

      // Validate guid format
      if (data.guid && !data.guid.includes('@')) {
        const message = `Validation failed: guid '${data.guid}' must contain '@' separator`;
        if (strict) {
          throw new Error(message);
        } else {
          CharacterMessageDto.characterLogger.warn({
            logTag: logTag || 'CharacterMessageDto.validate',
            message,
            guid: data.guid,
          });
        }
      }

      // Validate forceUpdate
      if (
        data.forceUpdate !== undefined &&
        (typeof data.forceUpdate !== 'number' || data.forceUpdate < 0)
      ) {
        const message = `Validation failed: forceUpdate must be a positive number, got '${data.forceUpdate}' for guid '${data.guid || 'unknown'}'`;
        if (strict) {
          throw new Error(message);
        } else {
          CharacterMessageDto.characterLogger.warn({
            logTag: logTag || 'CharacterMessageDto.validate',
            message,
            guid: data.guid,
            forceUpdate: data.forceUpdate,
          });
        }
      }
    }

    // Call parent validation
    super.validate(strict);
  }
}
