import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig } from '@app/configuration';
import {
  AnalyticsMetricEntity,
  CharactersEntity,
  GuildsEntity,
  MarketEntity,
  ContractEntity,
  RealmsEntity,
} from '@app/pg';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      AnalyticsMetricEntity,
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
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
