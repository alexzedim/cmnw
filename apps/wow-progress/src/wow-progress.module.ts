import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig, s3Config } from '@app/configuration';
import { S3Service, WowProgressLfgService, WowProgressRanksService } from './services';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { S3Module } from 'nestjs-s3';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot({
      config: s3Config,
    }),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, CharactersProfileEntity]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: profileQueue.name,
      defaultJobOptions: profileQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [
    WowProgressRanksService,
    WowProgressLfgService,
    S3Service
  ],
})
export class WowProgressModule {}
