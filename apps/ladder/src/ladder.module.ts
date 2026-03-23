import { Module } from '@nestjs/common';
import { REDIS_CONNECTION, postgresConfig, redisConfig } from '@app/configuration';
import { LadderService } from './ladder.service';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealmsEntity } from '@app/pg';
import { charactersQueue, guildsQueue } from '@app/resources';
import { BullModule } from '@nestjs/bullmq';
import { BattleNetModule } from '@app/battle-net';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([RealmsEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.forRoot({
      connection: REDIS_CONNECTION,
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
    BattleNetModule,
  ],
  controllers: [],
  providers: [LadderService],
})
export class LadderModule {}
