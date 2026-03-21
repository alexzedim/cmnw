import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';
import { CharactersWorker, GuildsWorker, ProfileWorker } from './workers';
import { WorkerStatsListener } from './listeners';
import {
  CharacterService,
  CharacterLifecycleService,
  CharacterCollectionService,
  CharacterEntityIndexingService,
  GuildService,
  GuildSummaryService,
  GuildRosterService,
  GuildMemberService,
  GuildLogService,
  GuildMasterService,
} from './services';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  CharactersProfileEntity,
  GuildsEntity,
  KeysEntity,
  CharactersGuildsLogsEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';
import { REDIS_CONNECTION } from '@app/configuration';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { BattleNetModule } from '@app/battle-net';

@Module({
  imports: [
    HttpModule,
    BattleNetModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      CharactersEntity,
      CharactersGuildsMembersEntity,
      CharactersGuildsLogsEntity,
      CharactersMountsEntity,
      CharactersPetsEntity,
      CharactersProfessionsEntity,
      CharactersProfileEntity,
      GuildsEntity,
      KeysEntity,
      MountsEntity,
      PetsEntity,
      ProfessionsEntity,
      RealmsEntity,
    ]),
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      connection: charactersQueue.connection,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      connection: guildsQueue.connection,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: profileQueue.name,
      connection: profileQueue.connection,
      defaultJobOptions: profileQueue.defaultJobOptions,
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
  controllers: [],
  providers: [
    CharactersWorker,
    GuildsWorker,
    ProfileWorker,
    WorkerStatsListener,
    GuildService,
    GuildSummaryService,
    GuildRosterService,
    GuildMemberService,
    GuildLogService,
    GuildMasterService,
    CharacterService,
    CharacterLifecycleService,
    CharacterCollectionService,
    CharacterEntityIndexingService,
  ],
})
export class OsintModule {}
