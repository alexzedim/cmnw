import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@app/rabbitmq';
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
    RabbitMQModule,
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
