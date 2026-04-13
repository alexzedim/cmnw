import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { createHash } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

import { CharactersEntity, RealmsEntity, GuildsEntity } from '@app/pg';
import { S3Service } from '@app/s3';
import { osintConfig } from '@app/configuration';
import {
  charactersQueue,
  guildsQueue,
  OSINT_CHARACTER_LIMIT,
  CharacterMessageDto,
  GuildMessageDto,
  ICharacterMessageBase,
  IGuildMessageBase,
  IAddonScanEntry,
  toGuid,
} from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';

@Injectable()
export class CharactersService implements OnApplicationBootstrap {
  private offset = 0;
  private readonly logger = new Logger(CharactersService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly charactersQueue: Queue<ICharacterMessageBase>,
    private readonly s3Service: S3Service,
    private readonly realmsCache: RealmsCacheService,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly guildsQueue: Queue<IGuildMessageBase>,
  ) {}

  async onApplicationBootstrap() {
    await this.indexFromFile(osintConfig.isIndexCharactersFromFile);
    await this.indexFromOsintFile(osintConfig.isIndexCharactersFromOsintFile);
    await this.indexCharacters();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async indexCharacters(): Promise<void> {
    const logTag = this.indexCharacters.name;
    try {
      let characterIteration = 0;

      const characters = await this.charactersRepository.find({
        order: { hashA: 'ASC' },
        take: OSINT_CHARACTER_LIMIT,
        skip: this.offset,
      });

      const charactersCount = await this.charactersRepository.count();
      this.offset = this.offset + OSINT_CHARACTER_LIMIT;

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
            const dto = CharacterMessageDto.fromCharacterIndex({
              ...character,
              iteration: characterIteration,
            });

            await this.charactersQueue.add(dto.name, dto.data, dto.opts);

            characterIteration = characterIteration + 1;
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

  private async indexFromFile(isIndexCharactersFromFile: boolean = osintConfig.isIndexCharactersFromFile) {
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

      const characters: Array<Pick<CharactersEntity, 'guid'>> = JSON.parse(charactersJson);

      let characterIteration = 0;

      const charactersCount = characters.length;

      this.logger.log({
        logTag,
        charactersCount,
        message: `Characters file loaded with ${charactersCount} characters`,
      });

      for (const character of characters) {
        characterIteration = characterIteration + 1;

        const dto = CharacterMessageDto.fromMigrationFile({
          guid: character.guid,
          iteration: characterIteration,
        });

        await this.charactersQueue.add(dto.name, dto.data, dto.opts);
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

  // @todo move to endpoint logic security
  private async indexFromOsintFile(
    isIndexCharactersFromOsintFile: boolean = osintConfig.isIndexCharactersFromOsintFile,
  ): Promise<void> {
    const logTag = this.indexFromOsintFile.name;
    try {
      if (!isIndexCharactersFromOsintFile) return;

      let charactersJson: string;

      try {
        charactersJson = await this.s3Service.readFile('cmnw-osint.json', 'cmnw');
      } catch (error) {
        this.logger.error({ logTag, errorOrException: error, message: 'cmnw-osint.json not found in S3' });
        return;
      }

      const entries: IAddonScanEntry[] = JSON.parse(charactersJson);

      const realmMap = new Map<number, RealmsEntity | null>();
      for (const entry of entries) {
        if (entry.realmId && !realmMap.has(entry.realmId)) {
          realmMap.set(entry.realmId, await this.realmsCache.findById(entry.realmId));
        }
      }

      const guildRealmCache = new Map<string, RealmsEntity | null>();
      const guildMap = new Map<string, { name: string; realm: string }>();

      let queuedCount = 0;
      let skippedCount = 0;

      for (const entry of entries) {
        const realmEntity = entry.realmId ? realmMap.get(entry.realmId) : null;
        if (realmEntity) {
          entry.realm = realmEntity.slug;
          entry.guid = `${entry.name.toLowerCase()}@${realmEntity.slug}`;
        }

        if (entry.guild) {
          const lastDash = entry.guild.lastIndexOf('-');
          if (lastDash > 0) {
            const suffix = entry.guild.substring(lastDash + 1);
            let guildRealm = guildRealmCache.get(suffix);
            if (guildRealm === undefined) {
              guildRealm = await this.realmsCache.findRealm(suffix);
              guildRealmCache.set(suffix, guildRealm);
            }
            if (guildRealm) {
              entry.guild = entry.guild.substring(0, lastDash);
              entry.guildGuid = toGuid(entry.guild, guildRealm.slug);
              guildMap.set(entry.guildGuid, { name: entry.guild, realm: guildRealm.slug });
            }
          }
        }

        const exists = await this.charactersRepository.exists({ where: { guid: entry.guid } });
        if (exists) {
          skippedCount++;
          continue;
        }

        const dto = CharacterMessageDto.fromAddonScan({
          ...entry,
          iteration: queuedCount,
        });
        await this.charactersQueue.add(dto.name, dto.data, dto.opts);
        queuedCount++;
      }

      if (guildMap.size > 0) {
        const existingGuilds = await this.guildsRepository.find({
          where: Array.from(guildMap.keys()).map((guid) => ({ guid })),
          select: ['guid'],
        });
        const existingGuids = new Set(existingGuilds.map((g) => g.guid));

        let guildsQueued = 0;
        for (const [guid, { name, realm }] of guildMap) {
          if (!existingGuids.has(guid)) {
            const dto = GuildMessageDto.fromAddonScan({ name, realm });
            await this.guildsQueue.add(dto.name, dto.data, dto.opts);
            guildsQueued++;
          }
        }

        this.logger.log({
          logTag,
          totalGuilds: guildMap.size,
          guildsQueued,
          existingGuilds: existingGuids.size,
          message: `Discovered ${guildMap.size} unique guilds, queued ${guildsQueued} new`,
        });
      }

      this.logger.log({
        logTag,
        totalEntries: entries.length,
        queuedCount,
        skippedCount,
        message: `Processed ${entries.length} addon scan entries, queued ${queuedCount} new, skipped ${skippedCount} existing`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }
}
