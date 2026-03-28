import { Module } from '@nestjs/common';
import { postgresConfig, s3Config, redisConfig, REDIS_CONNECTION } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { BattleNetModule } from '@app/battle-net';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { KeysService, RealmsWorker, RealmsService } from './services';
import { S3Module } from '@app/s3';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { realmsQueue } from '@app/resources';

@Module({
  imports: [
    HttpModule,
    BattleNetModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
    BullModule.registerQueue({
      name: realmsQueue.name,
      connection: realmsQueue.connection,
      defaultJobOptions: realmsQueue.defaultJobOptions,
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
  ],
  controllers: [],
  providers: [KeysService, RealmsService, RealmsWorker],
})
export class CoreModule {}
