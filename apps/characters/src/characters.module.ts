import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CharactersService } from './characters.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, KeysEntity, RealmsEntity, GuildsEntity } from '@app/pg';
import { postgresConfig, redisConfig, s3Config, REDIS_CONNECTION } from '@app/configuration';
import { S3Module } from '@app/s3';
import { RedisModule } from '@nestjs-modules/ioredis';
import { charactersQueue, guildsQueue } from '@app/resources/queues';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';

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
    TypeOrmModule.forFeature([KeysEntity, CharactersEntity, RealmsEntity, GuildsEntity]),
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
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
  providers: [CharactersService, RealmsCacheService],
})
export class CharactersModule {}
