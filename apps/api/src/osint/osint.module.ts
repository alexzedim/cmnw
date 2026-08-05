import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, REDIS_CONNECTION, redisConfig, s3Config } from '@app/configuration';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  CharactersProfileEntity,
  GuildHallOfFameEntity,
  GuildsEntity,
  HashBlockLogsEntity,
  HashBlockMembersEntity,
  HashBlocksEntity,
  KeysEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';
import { charactersQueue, guildsQueue } from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { S3Module } from '@app/s3';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { OsintController } from './osint.controller';
import { BlockOsintService, CharacterOsintService, GuildOsintService, RealmOsintService } from './services';

@Module({
  imports: [
    BattleNetModule,
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      CharactersGuildsMembersEntity,
      CharactersMountsEntity,
      CharactersPetsEntity,
      CharactersProfessionsEntity,
      CharactersProfileEntity,
      GuildHallOfFameEntity,
      GuildsEntity,
      HashBlockLogsEntity,
      HashBlockMembersEntity,
      HashBlocksEntity,
      KeysEntity,
      MountsEntity,
      PetsEntity,
      ProfessionsEntity,
      RealmsEntity,
      CharactersGuildsLogsEntity,
    ]),
    BullModule.forRoot({
      connection: REDIS_CONNECTION,
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
  ],
  controllers: [OsintController],
  providers: [BlockOsintService, CharacterOsintService, GuildOsintService, RealmOsintService, RealmsCacheService],
})
export class OsintModule {}
