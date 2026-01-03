import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  AnalyticsEntity,
  CharactersEntity,
  GuildsEntity,
  ItemsEntity,
  MarketEntity,
} from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      GuildsEntity,
      ItemsEntity,
      MarketEntity,
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppInfoModule {}
