import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { RabbitMQPublisherService } from '@app/rabbitmq';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersProfileEntity,
  KeysEntity,
  RealmsEntity,
} from '@app/pg';

import { FindOptionsWhere, In, MoreThanOrEqual, Repository } from 'typeorm';

import {
  CHARACTER_HASH_FIELDS,
  CharacterHashDto,
  CharacterHashFieldType,
  CharacterIdDto,
  CharacterMessageDto,
  CharacterResponseDto,
  CharactersLfgDto,
  charactersQueue,
  charactersRequestsQueue,
  getKeys,
  GLOBAL_OSINT_KEY,
  LFG_STATUS,
  OSINT_SOURCE,
  toGuid,
  findRealm,
} from '@app/resources';

@Injectable()
export class CharacterOsintService {
  private readonly logger = new Logger(CharacterOsintService.name, {
    timestamp: true,
  });
  private readonly clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsRepository: Repository<AnalyticsEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
    private readonly amqpConnection: AmqpConnection,
    private readonly rabbitMQPublisherService: RabbitMQPublisherService,
  ) {}

  private async requestCharacterFromQueue(params: {
    name: string;
    realm: string;
    guid: string;
    logTag: string;
  }): Promise<CharactersEntity | null> {
    let requestedCharacter: CharactersEntity | null = null;

    try {
      const [keyEntity] = await getKeys(this.keysRepository, this.clearance, true);

      const characterMessage = await CharacterMessageDto.fromCharacterRequest({
        name: params.name,
        realm: params.realm,
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
      });

      requestedCharacter = await this.amqpConnection.request<CharactersEntity>({
        exchange: charactersQueue.exchange,
        routingKey: 'osint.characters.request.high',
        payload: characterMessage,
        timeout: 5000,
        publishOptions: {
          priority: 10,
        },
        headers: {
          source: OSINT_SOURCE.CHARACTER_REQUEST,
          requestQueue: charactersRequestsQueue.name,
        },
      });
    } catch (errorOrException) {
      this.logger.warn({
        logTag: params.logTag,
        characterGuid: params.guid,
        message: `Character request timed out or failed for ${params.guid}`,
        error: errorOrException?.message,
      });
    }

    return requestedCharacter;
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

      let character = await this.charactersRepository.findOneBy({
        guid,
      });

      const [globalAnalytics, realmAnalytics] = await Promise.all([
        this.analyticsRepository.findOne({
          where: {
            category: 'characters',
            metricType: 'extremes',
            realmId: null,
          },
          order: { createdAt: 'DESC' },
        }),
        this.analyticsRepository.findOne({
          where: {
            category: 'characters',
            metricType: 'extremes',
            realmId: character?.realmId,
          },
          order: { createdAt: 'DESC' },
        }),
      ]);

      if (!character) {
        character = await this.requestCharacterFromQueue({
          name: nameSlug,
          realm: realmEntity.slug,
          guid,
          logTag,
        });
      }

      if (!character) {
        this.logger.warn({
          logTag,
          characterGuid: guid,
          message: `Character not found but queued for indexing: ${guid}`,
        });

        throw new NotFoundException(
          `Character: ${guid} not found, but will be added to OSINT-DB on existence`,
        );
      }

      const updatedAt = character.updatedAt?.getTime?.();
      const isStale =
        typeof updatedAt === 'number'
          ? Date.now() - updatedAt > 1000 * 60 * 60 * 48
          : false;

      if (isStale) {
        const [keyEntity] = await getKeys(this.keysRepository, this.clearance, true);

        const characterMessage = await CharacterMessageDto.fromCharacterRequest({
          name: nameSlug,
          realm: realmEntity.slug,
          clientId: keyEntity.client,
          clientSecret: keyEntity.secret,
          accessToken: keyEntity.token,
        });

        await this.rabbitMQPublisherService.publishMessage(
          charactersQueue.exchange,
          characterMessage,
        );

        this.logger.log({
          logTag,
          characterGuid: guid,
          message: `Character is stale; queued for refresh: ${guid}`,
        });
      }

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
      if (!input.hashQuery || input.hashQuery.length < 2) {
        throw new BadRequestException(
          `Hash value must be at least 2 characters (type + hash)`,
        );
      }

      const hashType1 = input.hashQuery.charAt(0).toLowerCase();
      const hashValue1 = input.hashQuery.slice(1);

      if (!/^[ab]$/.test(hashType1)) {
        throw new BadRequestException(
          `Hash value must start with 'a' or 'b', got '${hashType1}'`,
        );
      }

      let characters: CharactersEntity[];

      if (input.hashQuery2) {
        if (input.hashQuery2.length < 2) {
          throw new BadRequestException(
            `Hash value 2 must be at least 2 characters (type + hash)`,
          );
        }

        const hashType2 = input.hashQuery2.charAt(0).toLowerCase();
        const hashValue2 = input.hashQuery2.slice(1);

        if (!/^[ab]$/.test(hashType2)) {
          throw new BadRequestException(
            `Hash value 2 must start with 'a' or 'b', got '${hashType2}'`,
          );
        }

        const hashFieldType1 = CHARACTER_HASH_FIELDS.get(
          <CharacterHashFieldType>hashType1,
        );
        const hashFieldType2 = CHARACTER_HASH_FIELDS.get(
          <CharacterHashFieldType>hashType2,
        );

        if (!hashFieldType1 || !hashFieldType2) {
          throw new BadRequestException(
            `Could not determine hash fields for types '${hashType1}' and '${hashType2}'`,
          );
        }

        const hashLabel = `${input.hashQuery}/${input.hashQuery2}`;
        this.logger.log({
          logTag,
          hashType1,
          hashFieldType1,
          hashValue1,
          hashType2,
          hashFieldType2,
          hashValue2,
          message: `Fetching characters by combined hash: ${hashLabel}`,
        });

        characters = await this.charactersRepository
          .createQueryBuilder('c')
          .where(
            `c.${hashFieldType1} = :hashValue1 AND c.${hashFieldType2} = :hashValue2`,
            {
              hashValue1,
              hashValue2,
            },
          )
          .take(100)
          .getMany();

        this.logger.log({
          logTag,
          characterCount: characters.length,
          message: `Found ${characters.length} characters by combined hash: ${hashLabel}`,
        });
      } else {
        const hashFieldType = CHARACTER_HASH_FIELDS.get(
          <CharacterHashFieldType>hashType1,
        );

        if (!hashFieldType) {
          throw new BadRequestException(
            `Could not determine hash field for type '${hashType1}'`,
          );
        }

        const hashLabel = `${input.hashQuery}`;
        this.logger.log({
          logTag,
          hashType: hashType1,
          hashValue: hashValue1,
          message: `Fetching characters by hash: ${hashLabel}`,
        });

        const whereQuery: FindOptionsWhere<CharactersEntity> = {
          [hashFieldType]: hashValue1,
        };

        characters = await this.charactersRepository.find({
          where: whereQuery,
          take: 100,
        });

        this.logger.log({
          logTag,
          hashType: hashType1,
          hashValue: hashValue1,
          characterCount: characters.length,
          message: `Found ${characters.length} characters by hash: ${hashLabel}`,
        });
      }

      return characters;
    } catch (errorOrException) {
      if (errorOrException instanceof BadRequestException) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        hashQuery: input.hashQuery,
        hashQuery2: input.hashQuery2,
        errorOrException,
        message: `Error fetching characters by hash: ${input.hashQuery}${input.hashQuery2 ? '/' + input.hashQuery2 : ''}`,
      });

      throw new ServiceUnavailableException(
        `Error processing hash query: ${input.hashQuery}${input.hashQuery2 ? '/' + input.hashQuery2 : ''}`,
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
      if (input.mythicLogs) where.mythicLogs = MoreThanOrEqual(input.mythicLogs);
      if (input.heroicLogs) where.heroicLogs = MoreThanOrEqual(input.heroicLogs);
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

      throw new ServiceUnavailableException(
        'Error fetching characters looking for guild',
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
}
