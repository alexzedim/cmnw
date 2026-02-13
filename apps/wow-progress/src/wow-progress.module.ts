import { Module } from '@nestjs/common';
import {
  getRedisConnection,
  postgresConfig,
  redisConfig,
  s3Config,
} from '@app/configuration';
import { WowProgressLfgService, WowProgressRanksService } from './services';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { S3Module } from '@app/s3';
import { RedisModule } from '@nestjs-modules/ioredis';
import { guildsQueue, charactersQueue, profileQueue } from '@app/resources';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    RedisModule.forRoot({
      type: 'single',
      url: `redis://:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`,
    }),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      RealmsEntity,
      CharactersProfileEntity,
    ]),
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      connection: guildsQueue.connection,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      connection: charactersQueue.connection,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: profileQueue.name,
      connection: profileQueue.connection,
      defaultJobOptions: profileQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [WowProgressRanksService, WowProgressLfgService],
})
export class WowProgressModule {}
