import { Module } from '@nestjs/common';
import { getRedisConnection, postgresConfig, redisConfig } from '@app/configuration';
import { LadderService } from './ladder.service';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { charactersQueue, guildsQueue } from '@app/resources';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      connection: charactersQueue.connection,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      connection: guildsQueue.connection,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [LadderService],
})
export class LadderModule {}
