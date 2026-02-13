import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    HttpModule,
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
    // TestsOsint,
    // TestsDma,
    // TestsCore,
    // TestsBench,
    // TestsCommunity,
    // TestsWorker,
    // TestsCharactersQueueWorker,
  ],
})
export class TestsModule {}
