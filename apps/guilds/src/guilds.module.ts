import { Module } from '@nestjs/common';
import { postgresConfig } from '@app/configuration';
import { GuildsService } from './guilds.service';
import { RabbitMQModule } from '@app/rabbitmq';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity, CharactersEntity]),
    RabbitMQModule,
  ],
  controllers: [],
  providers: [GuildsService],
})
export class GuildsModule {}
