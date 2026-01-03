import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig } from '@app/configuration';
import {
  AnalyticsEntity,
  CharactersEntity,
  GuildsEntity,
  MarketEntity,
  ContractEntity,
  RealmsEntity,
} from '@app/pg';

import { AnalyticsService } from './analytics.service';
import { CharacterMetricsService } from './services/character-metrics.service';
import { GuildMetricsService } from './services/guild-metrics.service';
import { MarketMetricsService } from './services/market-metrics.service';
import { ContractMetricsService } from './services/contract-metrics.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      GuildsEntity,
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
    CharacterMetricsService,
    GuildMetricsService,
    MarketMetricsService,
    ContractMetricsService,
  ],
})
export class AnalyticsModule {}
