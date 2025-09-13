import { Module } from '@nestjs/common';
import { bullConfig, postgresConfig, s3Config } from '@app/configuration';
import { WowProgressLfgService, WowProgressRanksService } from './services';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { S3Module } from '@app/s3';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, CharactersProfileEntity]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
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
  ],
})
export class WowProgressModule {}
