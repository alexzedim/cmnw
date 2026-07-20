import { Module } from '@nestjs/common';
import { REDIS_CONNECTION, postgresConfig, redisConfig, s3Config } from '@app/configuration';
import { OsintController } from './osint.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import {
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
  CharactersGuildsLogsEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';
import { BlockOsintService, CharacterOsintService, GuildOsintService, RealmOsintService } from './services';
import { charactersQueue, guildsQueue } from '@app/resources';
import { BullModule } from '@nestjs/bullmq';
import { BattleNetModule } from '@app/battle-net';
import { S3Module } from '@app/s3';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';

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
