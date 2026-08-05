import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, REDIS_CONNECTION, redisConfig } from '@app/configuration';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
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
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';
import { charactersQueue, guildsQueue, hashQueue, profileQueue } from '@app/resources';
import { FeedService } from '@app/resources/services/feed.service';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WorkerStatsListener } from './listeners';
import {
  CharacterCollectionService,
  CharacterEntityIndexingService,
  CharacterLifecycleService,
  CharacterService,
  GuildLogService,
  GuildMasterService,
  GuildMemberService,
  GuildRosterService,
  GuildService,
  GuildSummaryService,
  HashBlockService,
} from './services';
import { CharactersWorker, GuildsWorker, HashWorker, ProfileWorker } from './workers';

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
