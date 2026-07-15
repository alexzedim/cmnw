import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppInfoModule {}
