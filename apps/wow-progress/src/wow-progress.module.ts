import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, REDIS_CONNECTION, redisConfig, s3Config } from '@app/configuration';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { S3Module } from '@app/s3';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WowProgressLfgService, WowProgressRanksService } from './services';

@Module({
  imports: [
    HttpModule,
    BattleNetModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    RedisModule.forRoot({
      type: 'single',
      url: `redis://:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`,
    }),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, CharactersProfileEntity]),
    BullModule.forRoot({
      connection: REDIS_CONNECTION,
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
