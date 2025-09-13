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
    const logTag = 'getGuild';
    try {
      this.logger.log({ logTag, guildGuid: input.guid, message: `Fetching guild: ${input.guid}` });
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
        this.logger.warn({ logTag, guildGuid: guid, message: `Guild not found but queued for indexing: ${guid}` });
        throw new NotFoundException(
          `Guild: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      this.logger.log({ logTag, guildGuid: guid, memberCount: guildMembers.length, message: `Successfully fetched guild: ${guid} with ${guildMembers.length} members` });
      return {
        guild,
        members: guildMembers,
        memberCount: guildMembers.length
      };
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException || errorOrException instanceof NotFoundException) {
        throw errorOrException;
      }
      
      this.logger.error({ logTag, guildGuid: input.guid, errorOrException, message: `Error fetching guild: ${input.guid}` });
      
      throw new ServiceUnavailableException(`Error fetching guild data for ${input.guid}`);
    }
  }

  async getCharacter(input: CharacterIdDto) {
    const logTag = 'getCharacter';
    try {
      this.logger.log({ logTag, characterGuid: input.guid, message: `Fetching character: ${input.guid}` });
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
        this.logger.warn({ logTag, characterGuid: guid, message: `Character not found but queued for indexing: ${guid}` });
        throw new NotFoundException(
          `Character: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      this.logger.log({ logTag, characterGuid: guid, message: `Successfully fetched character: ${guid}` });
      return character;
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException || errorOrException instanceof NotFoundException) {
        throw errorOrException;
      }
      
      this.logger.error({ logTag, characterGuid: input.guid, errorOrException, message: `Error fetching character: ${input.guid}` });
      
      throw new ServiceUnavailableException(`Error fetching character data for ${input.guid}`);
    }
  }

  async getCharactersByHash(input: CharacterHashDto) {
    const logTag = 'getCharactersByHash';
    try {
      this.logger.log({ logTag, hash: input.hash, message: `Fetching characters by hash: ${input.hash}` });
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

      this.logger.log({ logTag, hash: input.hash, characterCount: characters.length, message: `Found ${characters.length} characters by hash: ${input.hash}` });
      return characters;
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException) {
        throw errorOrException;
      }
      
      this.logger.error({ logTag, hash: input.hash, errorOrException, message: `Error fetching characters by hash: ${input.hash}` });
      
      throw new ServiceUnavailableException(`Error processing hash query: ${input.hash}`);
    }
  }

  async getCharactersLfg(input: CharactersLfgDto) {
    const logTag = 'getCharactersLfg';
    try {
      this.logger.log({ logTag, filters: input, message: 'Fetching characters looking for guild' });
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
      
      this.logger.log({ logTag, characterCount: characters.length, message: `Found ${characters.length} characters looking for guild` });
      return characters;
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException, message: 'Error fetching LFG characters' });
      
      throw new HttpException(
        'Error fetching characters looking for guild',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCharacterLogs(input: CharacterIdDto) {
    const logTag = 'getCharacterLogs';
    try {
      this.logger.log({ logTag, characterGuid: input.guid, message: `Fetching logs for character: ${input.guid}` });
      
      const logs = await this.logsRepository.find({
        where: {
          characterGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log({ logTag, characterGuid: input.guid, logCount: logs.length, message: `Found ${logs.length} logs for character: ${input.guid}` });
      return logs;
    } catch (errorOrException) {
      this.logger.error({ logTag, characterGuid: input.guid, errorOrException, message: `Error fetching character logs: ${input.guid}` });
      
      throw new ServiceUnavailableException(`Error fetching logs for character ${input.guid}`);
    }
  }

  async getGuildLogs(input: GuildIdDto) {
    const logTag = 'getGuildLogs';
    try {
      this.logger.log({ logTag, guildGuid: input.guid, message: `Fetching logs for guild: ${input.guid}` });
      
      const logs = await this.logsRepository.find({
        where: {
          guildGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log({ logTag, guildGuid: input.guid, logCount: logs.length, message: `Found ${logs.length} logs for guild: ${input.guid}` });
      return logs;
    } catch (errorOrException) {
      this.logger.error({ logTag, guildGuid: input.guid, errorOrException, message: `Error fetching guild logs: ${input.guid}` });
      
      throw new ServiceUnavailableException(`Error fetching logs for guild ${input.guid}`);
    }
  }
  async getRealmPopulation(realmId: string): Promise<string[]> {
    const logTag = 'getRealmPopulation';
    try {
      this.logger.log({ logTag, realmId, message: `Fetching realm population for: ${realmId}` });
      
      // TODO: Implement actual realm population logic
      // This could involve aggregating character counts by realm
      const mockPopulation = [realmId, `${realmId}-population-data`];
      
      this.logger.warn({ logTag, realmId, message: `Returning mock data for realm population: ${realmId}` });
      return mockPopulation;
    } catch (errorOrException) {
      this.logger.error({ logTag, realmId, errorOrException, message: `Error fetching realm population: ${realmId}` });
      
      throw new ServiceUnavailableException(`Error fetching realm population for ${realmId}`);
    }
  }

  async getRealms(input: RealmDto) {
    const logTag = 'getRealms';
    try {
      this.logger.log({ logTag, filters: input, message: 'Fetching realms with filters' });
      
      const realms = await this.realmsRepository.findBy(input);
      
      this.logger.log({ logTag, realmCount: realms.length, message: `Found ${realms.length} realms matching criteria` });
      return realms;
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException, message: 'Error fetching realms' });
      
      throw new ServiceUnavailableException('Error fetching realms data');
    }
  }
}
