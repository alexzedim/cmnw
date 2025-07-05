import { Module } from '@nestjs/common';
import { bullConfig, postgresConfig, redisConfig } from '@app/configuration';
import { GuildsService } from './guilds.service';
import { BullModule } from '@nestjs/bullmq';
import { guildsQueue } from '@app/resources/queues/guilds.queue';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity, CharactersEntity]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [GuildsService],
})
export class GuildsModule {}
