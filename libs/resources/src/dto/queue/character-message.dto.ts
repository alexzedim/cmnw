import { Logger } from '@nestjs/common';
import { OSINT_SOURCE } from '../../constants';
import { toGuid } from '../../transformers';
import { QueueMessageDto } from '@app/resources/dto/queue';
import { charactersQueue } from '@app/resources/queues/characters.queue';
import { JobsOptions } from 'bullmq';

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

  /**
   * Creates a new CharacterMessageDto instance with strict structure
   *
   * @param name - The queue name (derived from queue definition)
   * @param data - The message data
   * @param opts - Optional BullMQ job options
   */
  constructor(name: string, data: ICharacterMessageBase, opts?: JobsOptions) {
    // Merge default job options from queue definition with provided opts
    const mergedOpts = {
      ...charactersQueue.defaultJobOptions,
      ...opts,
    };

    super(name, data, mergedOpts);
  }

  /**
   * Creates a message with validation (backward compatibility)
   *
   * @param name - The queue name
   * @param data - The message data
   * @param opts - Optional BullMQ job options
   * @returns Validated CharacterMessageDto instance
   */
  static create<T>(
    name: string,
    data: T,
    opts?: JobsOptions,
  ): CharacterMessageDto<T> {
    const message = new CharacterMessageDto(name, data, opts);
    message.validate(false, 'CharacterMessageDto.create');
    return message;
  }

  /**
   * Create from Mythic+ Ladder data
   *
   * Priority: 7 (High - user-initiated competitive content)
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
    return CharacterMessageDto.create(
      'osint.characters',
      {
        id: params.id,
        name: params.name,
        realm: params.realm,
        faction: params.faction,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 7,
        source: OSINT_SOURCE.MYTHIC_PLUS,
      },
    );
  }

  /**
   * Create from PvP Ladder data
   *
   * Priority: 7 (High - user-initiated competitive content)
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
    return CharacterMessageDto.create(
      'osint.characters',
      {
        name: params.name,
        realm: params.realm,
        faction: params.faction,
        iteration: params.iteration,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 7,
        source: OSINT_SOURCE.PVP_LADDER,
      },
    );
  }

  /**
   * Create from Warcraft Logs raid data
   *
   * Priority: 8 (Very High - official API data)
   */
  static fromWarcraftLogs(params: {
    name: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    return CharacterMessageDto.create(
      'osint.characters',
      {
        name: params.name,
        realm: params.realm,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 8,
        source: OSINT_SOURCE.WARCRAFT_LOGS,
      },
    );
  }

  /**
   * Create from WoW Progress LFG data
   *
   * Priority: 6 (Medium - community-driven content)
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
    return CharacterMessageDto.create(
      'osint.characters',
      {
        name: params.name,
        realm: params.realm,
        realmId: params.realmId,
        realmName: params.realmName,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 6,
        source: OSINT_SOURCE.WOW_PROGRESS_LFG,
      },
    );
  }

  /**
   * Create from Guild Roster (Guild Master)
   *
   * Priority: 9 (Very High - guild leadership data)
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
    level?: number | null;
    lastModified: Date;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);

    return CharacterMessageDto.create(
      'osint.characters',
      {
        id: params.id,
        name: params.name,
        realm: params.realm,
        guild: params.guild,
        guildGuid: params.guildGuid,
        guildId: params.guildId,
        guildRank: params.guildRank,
        class: params.class,
        race: params.race,
        faction: params.faction,
        level: params.level,
        lastModified: params.lastModified,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 9,
        source: OSINT_SOURCE.GUILD_ROSTER,
        metadata: { guid },
      },
    );
  }

  /**
   * Create from Character Index (database)
   *
   * Priority: 5 (Medium - periodic database indexing)
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
    const { id, ...rest } = params;

    return CharacterMessageDto.create(
      'osint.characters',
      {
        guid: params.guid,
        name: params.name,
        realm: params.realm,
        ...rest,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
        iteration: params.iteration,
      },
      {
        priority: 5,
        source: OSINT_SOURCE.CHARACTER_INDEX,
        metadata: { characterId: params.id },
      },
    );
  }

  /**
   * Create from Guild Member (non-guild master)
   *
   * Priority: 3 (Low - regular guild membership updates)
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
    faction?: string | null;
    level?: number | null;
    lastModified: Date;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const guid = toGuid(params.name, params.realm);

    return CharacterMessageDto.create(
      'osint.characters',
      {
        id: params.id,
        name: params.name,
        realm: params.realm,
        realmId: params.realmId,
        realmName: params.realmName,
        guild: params.guild,
        guildGuid: params.guildGuid,
        guildId: params.guildId,
        guildRank: params.guildRank,
        class: params.class,
        faction: params.faction,
        level: params.level,
        lastModified: params.lastModified,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 3,
        source: OSINT_SOURCE.GUILD_ROSTER,
        metadata: { guid },
      },
    );
  }

  /**
   * Create from S3 migration file
   *
   * Priority: 2 (Very Low - bulk data import)
   */
  static fromMigrationFile(params: {
    guid: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    const [nameSlug, realmSlug] = params.guid.split('@');

    return CharacterMessageDto.create(
      'osint.characters',
      {
        guid: params.guid,
        name: nameSlug,
        realm: realmSlug,
        region: 'eu',
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 2,
        source: OSINT_SOURCE.OSINT_MIGRATION,
      },
    );
  }

  /**
   * Create from character request (API-driven)
   *
   * Priority: 10 (Very High - user-initiated API requests)
   */
  static fromCharacterRequest(params: {
    name: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
  }): CharacterMessageDto {
    return CharacterMessageDto.create(
      'osint.characters',
      {
        name: params.name,
        realm: params.realm,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        accessToken: params.accessToken,
      },
      {
        priority: 10,
        source: OSINT_SOURCE.CHARACTER_REQUEST,
      },
    );
  }

  /**
   * Validate message structure
   *
   * @param strict - If true, throws errors; if false, logs warnings
   * @param logTag - Optional log tag for warnings
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true, logTag?: string): void {
    const characterData = this.data as ICharacterMessageBase | undefined;

    // Validate guid format
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
  }
}
