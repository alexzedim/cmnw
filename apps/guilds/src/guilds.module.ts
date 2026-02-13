import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConnection, postgresConfig } from '@app/configuration';
import { GuildsService } from './guilds.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';
import { guildsQueue } from '@app/resources';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity, CharactersEntity]),
    BullModule.forRoot({
      connection: guildsQueue.connection,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      connection: guildsQueue.connection,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [GuildsService],
})
export class GuildsModule {}
