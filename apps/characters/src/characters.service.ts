import {
  charactersQueue,
  getKeys,
  GLOBAL_OSINT_KEY,
  OSINT_CHARACTER_LIMIT,
  CharacterMessageDto,
} from '@app/resources';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CharactersEntity, KeysEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { S3Service } from '@app/s3';
import { osintConfig } from '@app/configuration';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { RabbitMQPublisherService } from '@app/rabbitmq';

@Injectable()
export class CharactersService implements OnApplicationBootstrap {
  private offset = 0;
  private keyEntities: KeysEntity[];
  private readonly logger = new Logger(CharactersService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    private readonly publisher: RabbitMQPublisherService,
    private readonly s3Service: S3Service,
  ) {}

  async onApplicationBootstrap() {
    await this.indexFromFile(osintConfig.isIndexCharactersFromFile);
    await this.indexCharacters(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async indexCharacters(
    clearance: string = GLOBAL_OSINT_KEY,
  ): Promise<void> {
    const logTag = this.indexCharacters.name;
    try {
      let characterIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      let length = this.keyEntities.length;

      const characters = await this.charactersRepository.find({
        order: { hashA: 'ASC' },
        take: OSINT_CHARACTER_LIMIT,
        skip: this.offset,
      });

      const isRotate = true;
      const charactersCount = await this.charactersRepository.count();
      this.offset = this.offset + (isRotate ? OSINT_CHARACTER_LIMIT : 0);

      if (this.offset >= charactersCount) {
        this.logger.warn({
          logTag,
          offset: this.offset,
          charactersCount,
          message: `End of characters reached, resetting offset`,
        });
        this.offset = 0;
      }

      await lastValueFrom(
        from(characters).pipe(
          mergeMap(async (character) => {
            const { client, secret, token } =
              this.keyEntities[characterIteration % length];

            const dto = CharacterMessageDto.fromCharacterIndex({
              ...character,
              iteration: characterIteration,
              clientId: client,
              clientSecret: secret,
              accessToken: token,
            });

            await this.publisher.publishMessage(charactersQueue.exchange, dto);

            characterIteration = characterIteration + 1;
            const isKeyRequest = characterIteration % 1000 == 0;
            if (isKeyRequest) {
              this.keyEntities = await getKeys(this.keysRepository, clearance);
              length = this.keyEntities.length;
            }
          }, 10),
        ),
      );

      this.logger.log({
        logTag,
        offset: this.offset,
        characterCount: characters.length,
        message: `Processed ${characters.length} characters at offset ${this.offset}`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  private async indexFromFile(
    isIndexCharactersFromFile: boolean = osintConfig.isIndexCharactersFromFile,
  ) {
    const logTag = this.indexFromFile.name;
    try {
      this.logger.log({
        logTag,
        isIndexCharactersFromFile,
        message: `Index from file: ${isIndexCharactersFromFile}`,
      });
      if (!isIndexCharactersFromFile) return;

      // Load characters from S3 cmnw bucket
      let charactersJson: string;
      try {
        charactersJson = await this.s3Service.readFile('characters.json', 'cmnw');
        this.logger.log({
          logTag,
          bucket: 'cmnw',
          filename: 'characters.json',
          message: 'Characters loaded from S3',
        });
      } catch (error) {
        this.logger.error({
          logTag,
          bucket: 'cmnw',
          filename: 'characters.json',
          errorOrException: error,
          message: 'File not found in S3 bucket',
        });
        throw new Error('Characters file not found in S3: characters.json');
      }

      // Calculate file checksum and check if already imported
      const fileChecksum = createHash('md5').update(charactersJson).digest('hex');
      const redisKey = `CHARACTERS_FILE_IMPORTED:${fileChecksum}`;

      const isAlreadyImported = await this.redisService.exists(redisKey);
      if (isAlreadyImported) {
        this.logger.log({
          logTag,
          fileChecksum,
          message: 'Characters file already imported, skipping',
        });
        return;
      }

      const characters: Array<Pick<CharactersEntity, 'guid'>> =
        JSON.parse(charactersJson);

      this.keyEntities = await getKeys(this.keysRepository, GLOBAL_OSINT_KEY, false);

      let characterIteration = 0;
      const length = this.keyEntities.length;

      const charactersCount = characters.length;

      this.logger.log({
        logTag,
        charactersCount,
        message: `Characters file loaded with ${charactersCount} characters`,
      });

      for (const character of characters) {
        const [nameSlug, realmSlug] = character.guid.split('@');

        const { client, secret, token } =
          this.keyEntities[characterIteration % length];

        const dto = CharacterMessageDto.fromMigrationFile({
          guid: character.guid,
          clientId: client,
          clientSecret: secret,
          accessToken: token,
        });

        await this.publisher.publishMessage(charactersQueue.exchange, dto);

        characterIteration = characterIteration + 1;
      }

      this.logger.log({
        logTag,
        charactersCount,
        insertedCount: characterIteration,
        message: `Processed ${charactersCount} characters, inserted ${characterIteration}`,
      });

      // Mark file as imported with checksum
      await this.redisService.set(redisKey, Date.now(), 'EX', 60 * 60 * 24 * 30); // 30 days TTL
      this.logger.log({
        logTag,
        fileChecksum,
        message: 'Characters file marked as imported',
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }
}
