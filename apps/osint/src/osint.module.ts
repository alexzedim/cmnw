import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';
import { CharactersWorker, GuildsWorker, HashWorker, ProfileWorker } from './workers';
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
  HashBlockService,
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
import { REDIS_CONNECTION } from '@app/configuration';
import { charactersQueue, guildsQueue, hashQueue, profileQueue } from '@app/resources';
import { BattleNetModule } from '@app/battle-net';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { FeedService } from '@app/resources/services/feed.service';

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
      HashBlockLogsEntity,
      HashBlockMembersEntity,
      HashBlocksEntity,
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
      name: hashQueue.name,
      connection: hashQueue.connection,
      defaultJobOptions: hashQueue.defaultJobOptions,
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
    HashWorker,
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
    HashBlockService,
    RealmsCacheService,
    FeedService,
  ],
})
export class OsintModule {}
