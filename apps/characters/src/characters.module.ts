import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CharactersService } from './characters.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, KeysEntity } from '@app/pg';
import {
  postgresConfig,
  redisConfig,
  s3Config,
  getRedisConnection,
} from '@app/configuration';
import { S3Module } from '@app/s3';
import { RedisModule } from '@nestjs-modules/ioredis';
import { charactersQueue } from '@app/resources/queues';

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
    BullModule.forRoot({ connection: getRedisConnection() }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      connection: charactersQueue.connection,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [CharactersService],
})
export class CharactersModule {}
