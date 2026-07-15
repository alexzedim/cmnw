import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig } from '@app/configuration';
import {
  AnalyticsEntity,
  CharactersEntity,
  GuildHallOfFameEntity,
  GuildsEntity,
  MarketEntity,
  ContractEntity,
  RealmsEntity,
} from '@app/pg';

import { AnalyticsService } from './analytics.service';
import { CharacterMetricsService } from './services';
import { GuildMetricsService } from './services';
import { MarketMetricsService } from './services';
import { ContractMetricsService } from './services';
import { HallOfFameMetricsService } from './services';
import { AnalyticsMigrationService } from './services/analytics-migration.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      GuildsEntity,
      GuildHallOfFameEntity,
      MarketEntity,
      ContractEntity,
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
  ],
  controllers: [],
  providers: [
    AnalyticsService,
    AnalyticsMigrationService,
    CharacterMetricsService,
    GuildMetricsService,
    MarketMetricsService,
    ContractMetricsService,
    HallOfFameMetricsService,
  ],
})
export class AnalyticsModule {}
