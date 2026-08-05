import { BattleNetModule } from '@app/battle-net';
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
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsCore } from './tests.core';
import { TestsDma } from './tests.dma';
import { TestsOsint } from './tests.osint';

@Module({
  imports: [
    HttpModule,
    BattleNetModule,
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
  providers: [TestsOsint, TestsDma, TestsCore],
})
export class TestsModule {}
