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
  KeysEntity,
  CharactersGuildsLogsEntity,
  RealmsEntity,
} from '@app/pg';

import { FindOptionsWhere, In, MoreThanOrEqual, Repository } from 'typeorm';

import {
  CHARACTER_HASH_FIELDS,
  CharacterHashDto,
  CharacterHashFieldType,
  CharacterIdDto,
  CharacterJobQueue,
  CharactersLfgDto,
  charactersQueue,
  EVENT_LOG,
  findRealm,
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildIdDto,
  GuildJobQueue,
  guildsQueue,
  LFG_STATUS,
  OSINT_SOURCE,
  RealmDto,
  toGuid,
} from '@app/resources';

@Injectable()
export class OsintService {
  private readonly logger = new Logger(OsintService.name, { timestamp: true });
  private clearance: string = GLOBAL_OSINT_KEY;

  constructor(
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
    try {
      this.logger.log(`Fetching guild: ${input.guid}`, 'getGuild');
      const [nameSlug, realmSlug] = input.guid.split('@');

      const realmEntity = await findRealm(this.realmsRepository, realmSlug);

      if (!realmEntity) {
        throw new BadRequestException(
          `Realm: ${realmSlug} for guild ${input.guid} not found!`,
        );
      }

    const guid = toGuid(nameSlug, realmEntity.slug);

    const [guild, guildMembers] = await Promise.all([
      this.guildsRepository.findOneBy({ guid }),
      this.charactersGuildMembersRepository.find({
        where: { guildGuid: guid },
        take: 250,
      }),
    ]);

    await this.queueGuild.add(guid, {
      createOnlyUnique: false,
      forceUpdate: 60 * 60 * 24,
      region: 'eu',
      guid: guid,
      name: nameSlug,
      realm: realmEntity.slug,
      createdBy: OSINT_SOURCE.GUILD_REQUEST,
      updatedBy: OSINT_SOURCE.GUILD_REQUEST,
    });

      if (!guild) {
        this.logger.warn(`Guild not found but queued for indexing: ${guid}`, 'getGuild');
        throw new NotFoundException(
          `Guild: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      this.logger.log(`Successfully fetched guild: ${guid} with ${guildMembers.length} members`, 'getGuild');
      return {
        guild,
        members: guildMembers,
        memberCount: guildMembers.length
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(
        `Error fetching guild: ${input.guid}`,
        error instanceof Error ? error.stack : String(error),
        'getGuild'
      );
      
      throw new ServiceUnavailableException(`Error fetching guild data for ${input.guid}`);
    }
  }

  async getCharacter(input: CharacterIdDto) {
    try {
      this.logger.log(`Fetching character: ${input.guid}`, 'getCharacter');
      const [nameSlug, realmSlug] = input.guid.split('@');

      const realmEntity = await findRealm(this.realmsRepository, realmSlug);

      if (!realmEntity) {
        throw new BadRequestException(
          `Realm: ${realmSlug} for character ${input.guid} not found!`,
        );
      }

    const guid = toGuid(nameSlug, realmEntity.slug);
    // TODO join models
    const character = await this.charactersRepository.findOneBy({
      guid,
    });

    const [keyEntity] = await getKeys(this.keysRepository, this.clearance, true);

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
        this.logger.warn(`Character not found but queued for indexing: ${guid}`, 'getCharacter');
        throw new NotFoundException(
          `Character: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      this.logger.log(`Successfully fetched character: ${guid}`, 'getCharacter');
      return character;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(
        `Error fetching character: ${input.guid}`,
        error instanceof Error ? error.stack : String(error),
        'getCharacter'
      );
      
      throw new ServiceUnavailableException(`Error fetching character data for ${input.guid}`);
    }
  }

  async getCharactersByHash(input: CharacterHashDto) {
    try {
      this.logger.log(`Fetching characters by hash: ${input.hash}`, 'getCharactersByHash');
      const [type, hash] = input.hash.split('@');
      const isHashField = CHARACTER_HASH_FIELDS.has(<CharacterHashFieldType>type);
      if (!isHashField) {
        throw new BadRequestException(`Hash type ${type} is not supported`);
      }

      const hashType = CHARACTER_HASH_FIELDS.get(<CharacterHashFieldType>type);
      const whereQuery: FindOptionsWhere<CharactersEntity> = {
        [hashType]: hash,
      };
      
      const characters = await this.charactersRepository.find({
        where: whereQuery,
        take: 100,
      });

      this.logger.log(`Found ${characters.length} characters by hash: ${input.hash}`, 'getCharactersByHash');
      return characters;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(
        `Error fetching characters by hash: ${input.hash}`,
        error instanceof Error ? error.stack : String(error),
        'getCharactersByHash'
      );
      
      throw new ServiceUnavailableException(`Error processing hash query: ${input.hash}`);
    }
  }

  async getCharactersLfg(input: CharactersLfgDto) {
    try {
      this.logger.log('Fetching characters looking for guild', 'getCharactersLfg');
      const where: FindOptionsWhere<CharactersProfileEntity> = {
        lfgStatus: LFG_STATUS.NEW,
      };

      if (input.raiderIoScore)
        where.raiderIoScore = MoreThanOrEqual(input.raiderIoScore);
      if (input.mythicLogs) where.mythicLogs = MoreThanOrEqual(input.mythicLogs);
      if (input.heroicLogs) where.heroicLogs = MoreThanOrEqual(input.heroicLogs);
      if (input.realmsId) {
        where.realmId = In(input.realmsId);
      }

      const characters = await this.charactersProfileRepository.findBy(where);
      
      this.logger.log(`Found ${characters.length} characters looking for guild`, 'getCharactersLfg');
      return characters;
    } catch (error) {
      this.logger.error(
        'Error fetching LFG characters',
        error instanceof Error ? error.stack : String(error),
        'getCharactersLfg'
      );
      
      throw new HttpException(
        'Error fetching characters looking for guild',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCharacterLogs(input: CharacterIdDto) {
    try {
      this.logger.log(`Fetching logs for character: ${input.guid}`, 'getCharacterLogs');
      
      const logs = await this.logsRepository.find({
        where: {
          characterGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log(`Found ${logs.length} logs for character: ${input.guid}`, 'getCharacterLogs');
      return logs;
    } catch (error) {
      this.logger.error(
        `Error fetching character logs: ${input.guid}`,
        error instanceof Error ? error.stack : String(error),
        'getCharacterLogs'
      );
      
      throw new ServiceUnavailableException(`Error fetching logs for character ${input.guid}`);
    }
  }

  async getGuildLogs(input: GuildIdDto) {
    try {
      this.logger.log(`Fetching logs for guild: ${input.guid}`, 'getGuildLogs');
      
      const logs = await this.logsRepository.find({
        where: {
          guildGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log(`Found ${logs.length} logs for guild: ${input.guid}`, 'getGuildLogs');
      return logs;
    } catch (error) {
      this.logger.error(
        `Error fetching guild logs: ${input.guid}`,
        error instanceof Error ? error.stack : String(error),
        'getGuildLogs'
      );
      
      throw new ServiceUnavailableException(`Error fetching logs for guild ${input.guid}`);
    }
  }
  async getRealmPopulation(realmId: string): Promise<string[]> {
    try {
      this.logger.log(`Fetching realm population for: ${realmId}`, 'getRealmPopulation');
      
      // TODO: Implement actual realm population logic
      // This could involve aggregating character counts by realm
      const mockPopulation = [realmId, `${realmId}-population-data`];
      
      this.logger.warn(`Returning mock data for realm population: ${realmId}`, 'getRealmPopulation');
      return mockPopulation;
    } catch (error) {
      this.logger.error(
        `Error fetching realm population: ${realmId}`,
        error instanceof Error ? error.stack : String(error),
        'getRealmPopulation'
      );
      
      throw new ServiceUnavailableException(`Error fetching realm population for ${realmId}`);
    }
  }

  async getRealms(input: RealmDto) {
    try {
      this.logger.log('Fetching realms with filters', 'getRealms');
      
      const realms = await this.realmsRepository.findBy(input);
      
      this.logger.log(`Found ${realms.length} realms matching criteria`, 'getRealms');
      return realms;
    } catch (error) {
      this.logger.error(
        'Error fetching realms',
        error instanceof Error ? error.stack : String(error),
        'getRealms'
      );
      
      throw new ServiceUnavailableException('Error fetching realms data');
    }
  }
}
