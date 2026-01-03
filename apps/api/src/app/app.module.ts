import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CharactersEntity, GuildsEntity, ItemsEntity } from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forFeature([CharactersEntity, GuildsEntity, ItemsEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppInfoModule {}
