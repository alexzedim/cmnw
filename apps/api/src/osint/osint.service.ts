import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersProfileEntity,
  GuildsEntity,
  ItemsEntity,
  KeysEntity,
  CharactersGuildsLogsEntity,
  RealmsEntity, AnalyticsEntity,
} from '@app/pg';

import { FindOptionsWhere, ILike, In, MoreThanOrEqual, Repository, Or } from 'typeorm';

import {
  CHARACTER_HASH_FIELDS,
  CharacterHashDto,
  CharacterHashFieldType,
  CharacterIdDto,
  CharacterJobQueue,
  CharacterResponseDto,
  CharactersLfgDto,
  charactersQueue,
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildIdDto,
  GuildJobQueue,
  GuildJobQueueDto,
  guildsQueue,
  LFG_STATUS,
  OSINT_SOURCE,
  RealmDto,
  SearchQueryDto,
  toGuid,
  findRealm,
} from '@app/resources';

@Injectable()
export class OsintService {
  private readonly logger = new Logger(OsintService.name, { timestamp: true });
  private clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsRepository: Repository<AnalyticsEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly charactersGuildMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacter: Queue<CharacterJobQueue, number>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuild: Queue<GuildJobQueue, number>,
  ) {}

  async getGuild(input: GuildIdDto) {
    const logTag = 'getGuild';
    try {
      this.logger.log({
        logTag,
        guildGuid: input.guid,
        message: `Fetching guild: ${input.guid}`,
      });
      const decodedGuid = decodeURIComponent(input.guid);
      const [nameSlug, realmSlug] = decodedGuid.split('@');

      if (!realmSlug) {
        throw new BadRequestException(
          `Invalid guild GUID format: ${input.guid}. Expected format: name@realm`,
        );
      }

      const realmEntity = await findRealm(this.realmsRepository, realmSlug);

      if (!realmEntity) {
        throw new BadRequestException(
          `Realm: ${realmSlug} for guild ${input.guid} not found!`,
        );
      }

      const guid = toGuid(nameSlug, realmEntity.slug);

      const [guild, guildMemberships] = await Promise.all([
        this.guildsRepository.findOneBy({ guid }),
        this.charactersGuildMembersRepository.find({
          where: { guildGuid: guid },
          take: 1_000,
        }),
      ]);

      const dto = GuildJobQueueDto.fromGuildRequest({
        name: nameSlug,
        realm: realmEntity.slug,
      });

      await this.queueGuild.add(dto.guid, dto);

      if (!guild) {
        this.logger.warn({
          logTag,
          guildGuid: guid,
          message: `Guild not found but queued for indexing: ${guid}`,
        });

        throw new NotFoundException(
          `Guild: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      // Fetch full character data for guild members
      const characterGuids = guildMemberships.map((m) => m.characterGuid);
      const characters =
        characterGuids.length > 0
          ? await this.charactersRepository.find({
              where: { guid: In(characterGuids) },
            })
          : [];

      // Create a map of character data
      const characterMap = new Map(characters.map((c) => [c.guid, c]));

      // Merge guild membership with character data
      const members = guildMemberships.map((membership) => {
        const character = characterMap.get(membership.characterGuid);
        return {
          ...character,
          guildRank: membership.rank,
          guildGuid: membership.guildGuid,
        };
      });

      this.logger.log({
        logTag,
        guildGuid: guid,
        memberCount: members.length,
        message: `Successfully fetched guild: ${guid} with ${members.length} members`,
      });

      return {
        guild,
        members,
        memberCount: members.length,
      };
    } catch (errorOrException) {
      if (
        errorOrException instanceof BadRequestException ||
        errorOrException instanceof NotFoundException
      ) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        guildGuid: input.guid,
        errorOrException,
        message: `Error fetching guild: ${input.guid}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching guild data for ${input.guid}`,
      );
    }
  }

  async getCharacter(input: CharacterIdDto): Promise<CharacterResponseDto> {
    const logTag = 'getCharacter';
    try {
      this.logger.log({
        logTag,
        characterGuid: input.guid,
        message: `Fetching character: ${input.guid}`,
      });
      const [nameSlug, realmSlug] = input.guid.split('@');

      const realmEntity = await findRealm(this.realmsRepository, realmSlug);

      if (!realmEntity) {
        throw new BadRequestException(
          `Realm: ${realmSlug} for character ${input.guid} not found!`,
        );
      }

      const guid = toGuid(nameSlug, realmEntity.slug);

      const character = await this.charactersRepository.findOneBy({
        guid,
      });

      // Fetch global analytics
      const globalAnalytics = await this.analyticsRepository.findOne({
        where: {
          category: 'characters',
          metricType: 'extremes',
          realmId: null,
        },
        order: { createdAt: 'DESC' },
      });

      // Fetch realm-specific analytics
      const realmAnalytics = await this.analyticsRepository.findOne({
        where: {
          category: 'characters',
          metricType: 'extremes',
          realmId: character?.realmId,
        },
        order: { createdAt: 'DESC' },
      });

      const [keyEntity] = await getKeys(
        this.keysRepository,
        this.clearance,
        true,
      );

      await this.queueCharacter.add(
        guid,
        {
          guid: guid,
          name: nameSlug,
          realm: realmEntity.slug,
          region: 'eu',
          clientId: keyEntity.client,
          clientSecret: keyEntity.secret,
          accessToken: keyEntity.token,
          createdBy: OSINT_SOURCE.CHARACTER_REQUEST,
          updatedBy: OSINT_SOURCE.CHARACTER_REQUEST,
          createOnlyUnique: false,
          forceUpdate: 1000 * 60 * 60,
        },
        {
          jobId: guid,
          priority: 1,
        },
      );

      if (!character) {
        this.logger.warn({
          logTag,
          characterGuid: guid,
          message: `Character not found but queued for indexing: ${guid}`,
        });
        throw new NotFoundException(
          `Character: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      // Create response with percentiles
      const characterResponse = CharacterResponseDto.fromCharacter(
        character,
        globalAnalytics,
        realmAnalytics,
      );

      this.logger.log({
        logTag,
        characterGuid: guid,
        message: `Successfully fetched character: ${guid}`,
      });
      return characterResponse;
    } catch (errorOrException) {
      if (
        errorOrException instanceof BadRequestException ||
        errorOrException instanceof NotFoundException
      ) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        characterGuid: input.guid,
        errorOrException,
        message: `Error fetching character: ${input.guid}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching character data for ${input.guid}`,
      );
    }
  }

  async getCharactersByHash(input: CharacterHashDto) {
    const logTag = 'getCharactersByHash';
    try {
      const hashLabel = `${input.hashType}/${input.hashQuery}`;
      this.logger.log({
        logTag,
        hashType: input.hashType,
        hashQuery: input.hashQuery,
        message: `Fetching characters by hash: ${hashLabel}`,
      });

      // Validate hash type
      if (!/^[ab]{1,2}$/.test(input.hashType)) {
        throw new BadRequestException(
          `Hash type ${input.hashType} is not supported. Must be 'a', 'b', or 'ab'`,
        );
      }

      let characters: CharactersEntity[];

      if (input.hashType === 'ab') {
        // Combined search using query builder with OR operator
        characters = await this.charactersRepository
          .createQueryBuilder('c')
          .where('c.hashA = :hashQuery OR c.hashB = :hashQuery', {
            hashQuery: input.hashQuery,
          })
          .take(100)
          .getMany();
      } else {
        // Single hash type search
        const hashType = CHARACTER_HASH_FIELDS.get(
          <CharacterHashFieldType>input.hashType,
        );
        const whereQuery: FindOptionsWhere<CharactersEntity> = {
          [hashType]: input.hashQuery,
        };

        characters = await this.charactersRepository.find({
          where: whereQuery,
          take: 100,
        });
      }

      this.logger.log({
        logTag,
        hashType: input.hashType,
        hashQuery: input.hashQuery,
        characterCount: characters.length,
        message: `Found ${characters.length} characters by hash: ${hashLabel}`,
      });
      return characters;
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        hashType: input.hashType,
        hashQuery: input.hashQuery,
        errorOrException,
        message: `Error fetching characters by hash: ${input.hashType}/${input.hashQuery}`,
      });

      throw new ServiceUnavailableException(
        `Error processing hash query: ${input.hashType}/${input.hashQuery}`,
      );
    }
  }

  async getCharactersLfg(input: CharactersLfgDto) {
    const logTag = 'getCharactersLfg';
    try {
      this.logger.log({
        logTag,
        filters: input,
        message: 'Fetching characters looking for guild',
      });
      const where: FindOptionsWhere<CharactersProfileEntity> = {
        lfgStatus: LFG_STATUS.NEW,
      };

      if (input.raiderIoScore)
        where.raiderIoScore = MoreThanOrEqual(input.raiderIoScore);
      if (input.mythicLogs)
        where.mythicLogs = MoreThanOrEqual(input.mythicLogs);
      if (input.heroicLogs)
        where.heroicLogs = MoreThanOrEqual(input.heroicLogs);
      if (input.realmsId) {
        where.realmId = In(input.realmsId);
      }

      const characters = await this.charactersProfileRepository.findBy(where);

      this.logger.log({
        logTag,
        characterCount: characters.length,
        message: `Found ${characters.length} characters looking for guild`,
      });
      return characters;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error fetching LFG characters',
      });

      throw new HttpException(
        'Error fetching characters looking for guild',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCharacterLogs(input: CharacterIdDto) {
    const logTag = 'getCharacterLogs';
    try {
      this.logger.log({
        logTag,
        characterGuid: input.guid,
        message: `Fetching logs for character: ${input.guid}`,
      });

      const logs = await this.logsRepository.find({
        where: {
          characterGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log({
        logTag,
        characterGuid: input.guid,
        logCount: logs.length,
        message: `Found ${logs.length} logs for character: ${input.guid}`,
      });
      return logs;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        characterGuid: input.guid,
        errorOrException,
        message: `Error fetching character logs: ${input.guid}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching logs for character ${input.guid}`,
      );
    }
  }

  async getGuildLogs(input: GuildIdDto) {
    const logTag = 'getGuildLogs';
    try {
      this.logger.log({
        logTag,
        guildGuid: input.guid,
        message: `Fetching logs for guild: ${input.guid}`,
      });

      const logs = await this.logsRepository.find({
        where: {
          guildGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log({
        logTag,
        guildGuid: input.guid,
        logCount: logs.length,
        message: `Found ${logs.length} logs for guild: ${input.guid}`,
      });
      return logs;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        guildGuid: input.guid,
        errorOrException,
        message: `Error fetching guild logs: ${input.guid}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching logs for guild ${input.guid}`,
      );
    }
  }
  async getRealmPopulation(realmId: string): Promise<string[]> {
    const logTag = 'getRealmPopulation';
    try {
      this.logger.log({
        logTag,
        realmId,
        message: `Fetching realm population for: ${realmId}`,
      });

      // TODO: Implement actual realm population logic
      // This could involve aggregating character counts by realm
      const mockPopulation = [realmId, `${realmId}-population-data`];

      this.logger.warn({
        logTag,
        realmId,
        message: `Returning mock data for realm population: ${realmId}`,
      });
      return mockPopulation;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        realmId,
        errorOrException,
        message: `Error fetching realm population: ${realmId}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching realm population for ${realmId}`,
      );
    }
  }

  async getRealms(input: RealmDto) {
    const logTag = 'getRealms';
    try {
      this.logger.log({
        logTag,
        filters: input,
        message: 'Fetching realms with filters',
      });

      const realms = await this.realmsRepository.findBy(input);

      this.logger.log({
        logTag,
        realmCount: realms.length,
        message: `Found ${realms.length} realms matching criteria`,
      });
      return realms;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error fetching realms',
      });

      throw new ServiceUnavailableException('Error fetching realms data');
    }
  }

  async indexSearch(input: SearchQueryDto) {
    const logTag = 'indexSearch';
    try {
      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        message: `Performing universal search: ${input.searchQuery}`,
      });

      const searchPattern = `${input.searchQuery}%`;

      const [characters, guilds, items] = await Promise.all([
        this.charactersRepository.find({
          where: {
            guid: ILike(searchPattern),
          },
          take: 100,
        }),
        this.guildsRepository.find({
          where: {
            guid: ILike(searchPattern),
          },
          take: 100,
        }),
        this.itemsRepository
          .createQueryBuilder('items')
          .where('LOWER(items.name) LIKE LOWER(:searchPattern)', {
            searchPattern,
          })
          .orWhere(
            "LOWER(items.names::text) LIKE LOWER(:searchPattern)",
            { searchPattern },
          )
          .take(100)
          .getMany(),
      ]);

      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        characterCount: characters.length,
        guildCount: guilds.length,
        itemCount: items.length,
        message: `Search completed: ${characters.length} characters, ${guilds.length} guilds, ${items.length} items`,
      });

      return {
        characters,
        guilds,
        items,
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        searchQuery: input.searchQuery,
        errorOrException,
        message: `Error performing universal search: ${input.searchQuery}`,
      });

      throw new ServiceUnavailableException(
        `Error performing search for ${input.searchQuery}`,
      );
    }
  }
}
