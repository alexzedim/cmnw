import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WarcraftLogsService } from './warcraft-logs.service';

import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersRaidLogsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { RedisModule } from '@nestjs-modules/ioredis';
import { getRedisConnection, postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, CharactersRaidLogsEntity]),
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
  providers: [WarcraftLogsService],
})
export class WarcraftLogsModule {}
