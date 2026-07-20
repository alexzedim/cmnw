import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { redisConfig } from '@app/configuration';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersRaidLogsEntity,
  GuildsEntity,
  ItemsEntity,
  MarketEntity,
  RealmsEntity,
} from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      CharactersRaidLogsEntity,
      GuildsEntity,
      ItemsEntity,
      MarketEntity,
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppInfoModule {}
