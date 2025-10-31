import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { bullConfig, postgresConfig, redisConfig } from '@app/configuration';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
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
import { RedisModule } from '@nestjs-modules/ioredis';
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

@Module({
  imports: [
    HttpModule,
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
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: profileQueue.name,
      defaultJobOptions: profileQueue.defaultJobOptions,
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
