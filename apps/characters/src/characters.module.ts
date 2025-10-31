import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, KeysEntity } from '@app/pg';
import {
  bullConfig,
  postgresConfig,
  redisConfig,
  s3Config,
} from '@app/configuration';
import { S3Module } from '@app/s3';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, CharactersEntity]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [CharactersService],
})
export class CharactersModule {}
