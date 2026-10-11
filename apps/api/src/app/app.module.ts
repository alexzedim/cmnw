import { redisConfig } from '@app/configuration';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersRaidLogsEntity,
  GuildsEntity,
  ItemsEntity,
  MarketEntity,
  MarketSnapshotsEntity,
  RealmsEntity,
} from '@app/pg';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      CharactersRaidLogsEntity,
      GuildsEntity,
      ItemsEntity,
      MarketEntity,
      MarketSnapshotsEntity,
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
