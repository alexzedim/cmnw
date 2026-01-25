import { Logger } from '@nestjs/common';
import { OSINT_SOURCE, TIME_MS } from '../../constants';
import { toGuid } from '../../transformers';
import { IRabbitMQMessageBase, RabbitMQMessageDto } from '@app/resources/dto/queue';

/**
 * Character Message DTO for RabbitMQ
 *
 * Comprehensive data transfer object for character messages with RabbitMQ routing.
 * Combines CharacterJobQueueDto logic with RabbitMQ-specific metadata.
 */

/**
 * Base interface for creating character message entries
 * Only requires essential fields; guid is auto-generated from name + realm
 */
export interface ICharacterMessageBase {
  id?: number;
  guid?: string;
  realmId?: number;
  realmName?: string;
  guild?: string;
  guildGuid?: string;
  guildId?: number;
  guildRank?: number;
  class?: string;
  lastModified?: Date;
  region: 'eu';
  /** Character name (will be converted to kebab-case for guid) */
  name: string;
  /** Realm slug (will be converted to kebab-case for guid) */
  realm: string;
  /** API key credentials */
  clientId: string;
  clientSecret: string;
  accessToken: string;
  /** Force update threshold in milliseconds */
  forceUpdate: number;
  /** Only create if character doesn't exist */
  createOnlyUnique: boolean;
  /** Source that last updated this job */
  updatedBy: OSINT_SOURCE;
  /** Source that created this job (optional, defaults to updatedBy) */
  createdBy?: OSINT_SOURCE;
}

export class CharacterMessageDto extends RabbitMQMessageDto<ICharacterMessageBase> {
  private static readonly characterLogger = new Logger(CharacterMessageDto.name);

  private static isRabbitMQMessageBase<T>(
    params: any,
  ): params is IRabbitMQMessageBase<T> {
    return !!params && typeof params === 'object' && 'data' in (params as any);
  }

  private static isCharacterCreateParams(
    params: any,
  ): params is Omit<Partial<CharacterMessageDto>, 'guid'> &
    Pick<ICharacterMessageBase, 'name' | 'realm'> {
    return (
      !!params && typeof params === 'object' && 'name' in params && 'realm' in params
    );
  }

  readonly id?: number;
  readonly guid: string;
  readonly name: string;
  readonly realm: string;
  readonly realmId?: number;
  readonly realmName?: string;
  readonly guild?: string;
  readonly guildGuid?: string;
  readonly guildId?: number;
  readonly guildRank?: number;
  readonly class?: string;
  readonly race?: string;
  readonly faction?: string;
  readonly level?: number;
  readonly specialization?: string;
  readonly gender?: string;
  readonly lookingForGuild?: string;
  readonly updateRIO?: boolean;
  readonly updateWCL?: boolean;
  readonly updateWP?: boolean;
  readonly forceUpdate: number;
  readonly createOnlyUnique: boolean;
  readonly iteration?: number;
  readonly createdBy?: OSINT_SOURCE;
  readonly updatedBy: OSINT_SOURCE;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly accessToken?: string;
  readonly region: 'eu';
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly lastModified?: Date;
  readonly achievementPoints?: number;
  readonly averageItemLevel?: number;
  readonly equippedItemLevel?: number;
  readonly covenantId?: number;
  readonly mountsNumber?: number;
  readonly petsNumber?: number;
  readonly avatarImage?: string;
  readonly insetImage?: string;
  readonly mainImage?: string;
  readonly statusCode?: number;
  readonly hashA?: string;
  readonly hashB?: string;

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

    Object.assign(this, characterData);

    // Validate and ensure id is a numeric value (not a string like guid)
    if (this.id) {
      const numericId = Number(this.id);
      if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
        (this as any).id = undefined;
      } else {
        (this as any).id = numericId;
      }
    }

    if (!this.region) {
      (this as any).region = 'eu';
    }
  }

  /**
   * Create with auto-generated guid from name and realm
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T>;
  static create(
    data: Omit<Partial<CharacterMessageDto>, 'guid'> &
      Pick<ICharacterMessageBase, 'name' | 'realm'>,
  ): CharacterMessageDto;
  static create(
    params:
      | IRabbitMQMessageBase<any>
      | (Omit<Partial<CharacterMessageDto>, 'guid'> &
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
      createOnlyUnique: false,
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
      createOnlyUnique: false,
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
    timestamp: number;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);
    const dto = new CharacterMessageDto({
      guid,
      name: params.name,
      realm: params.realm,
      updatedAt: new Date(params.timestamp),
      forceUpdate: TIME_MS.ONE_MINUTE, // 1 minute
      region: 'eu',
      createdBy: OSINT_SOURCE.WARCRAFT_LOGS,
      updatedBy: OSINT_SOURCE.WARCRAFT_LOGS,
      createOnlyUnique: false,
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
      createOnlyUnique: false,
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
    return CharacterMessageDto.create({
      name: params.name,
      realm: params.realm,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      accessToken: params.accessToken,
      createdBy: OSINT_SOURCE.CHARACTER_REQUEST,
      updatedBy: OSINT_SOURCE.CHARACTER_REQUEST,
      createOnlyUnique: false,
      forceUpdate: TIME_MS.ONE_HOUR,
      priority: 10,
      source: OSINT_SOURCE.CHARACTER_REQUEST,
      routingKey: 'osint.characters.request.high',
    });
  }

  /**
   * Validate that required fields are present
   */
  validate(
    strict: boolean = true,
    logTag: string = 'CharacterMessageDto.validate',
  ): void {
    const requiredFields = [
      'guid',
      'name',
      'realm',
      'forceUpdate',
      'createOnlyUnique',
      'updatedBy',
    ];

    for (const field of requiredFields) {
      if (this[field] === undefined || this[field] === null) {
        const message = `Validation failed: missing required field '${field}' for guid '${this.guid || 'unknown'}'`;
        if (strict) {
          throw new Error(message);
        } else {
          CharacterMessageDto.characterLogger.warn({
            logTag,
            message,
            guid: this.guid,
          });
        }
      }
    }

    if (this.guid && !this.guid.includes('@')) {
      const message = `Validation failed: guid '${this.guid}' must contain '@' separator`;
      if (strict) {
        throw new Error(message);
      } else {
        CharacterMessageDto.characterLogger.warn({
          logTag,
          message,
          guid: this.guid,
        });
      }
    }

    if (
      this.forceUpdate !== undefined &&
      (typeof this.forceUpdate !== 'number' || this.forceUpdate < 0)
    ) {
      const message = `Validation failed: forceUpdate must be a positive number, got '${this.forceUpdate}' for guid '${this.guid || 'unknown'}'`;
      if (strict) {
        throw new Error(message);
      } else {
        CharacterMessageDto.characterLogger.warn({
          logTag,
          message,
          guid: this.guid,
          forceUpdate: this.forceUpdate,
        });
      }
    }

    if (!strict) {
      const credentials = ['clientId', 'clientSecret', 'accessToken'];
      const missingCredentials = credentials.filter(
        (field) => !this[field] || this[field] === undefined,
      );
      if (missingCredentials.length > 0) {
        CharacterMessageDto.characterLogger.warn({
          logTag,
          message: `Missing optional credentials: ${missingCredentials.join(', ')}`,
          guid: this.guid,
          missingCredentials,
        });
      }
    }
  }

  /**
   * Create validated instance - throws if validation fails
   */
  static createValidated(
    data: Omit<Partial<CharacterMessageDto>, 'guid'> &
      Pick<ICharacterMessageBase, 'name' | 'realm'>,
  ): CharacterMessageDto {
    const dto = CharacterMessageDto.create(data);
    dto.validate();
    return dto;
  }
}
