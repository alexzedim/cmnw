import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig, s3Config } from '@app/configuration';
import { WowProgressLfgService, WowProgressRanksService } from './services';
import { RabbitMQModule } from '@app/rabbitmq';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { S3Module } from '@app/s3';
import { RedisModule } from '@nestjs-modules/ioredis';

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
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, CharactersProfileEntity]),
    RabbitMQModule,
  ],
  controllers: [],
  providers: [WowProgressRanksService, WowProgressLfgService],
})
export class WowProgressModule {}
