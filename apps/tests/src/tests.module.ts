import { Module } from '@nestjs/common';
import { TestsOsint } from './tests.osint';
import { TestsCore } from './tests.core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersGuildsMembersEntity,
  ItemsEntity,
  KeysEntity,
  MarketEntity,
  RealmsEntity,
} from '@app/pg';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQModule } from '@app/rabbitmq';

@Module({
  imports: [
    HttpModule,
    RabbitMQModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      CharactersEntity,
      KeysEntity,
      RealmsEntity,
      MarketEntity,
      ItemsEntity,
      CharactersGuildsLogsEntity,
      CharactersGuildsMembersEntity,
    ]),
  ],
  controllers: [],
  providers: [
    TestsOsint,
    // TestsDma,
    TestsCore,
    // TestsBench,
    // TestsCommunity,
    // TestsWorker,
    // TestsCharactersQueueService,
    // TestsCharactersQueueWorker,
  ],
})
export class TestsModule {}
