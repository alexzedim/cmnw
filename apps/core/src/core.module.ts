import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysService, RealmsWorker, RealmsService } from './services';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { bullConfig, postgresConfig, redisConfig, s3Config } from '@app/configuration';
import { S3Module } from '@app/s3';
import { BullModule } from '@nestjs/bullmq';
import { realmsQueue } from '@app/resources';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: realmsQueue.name,
      defaultJobOptions: realmsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [KeysService, RealmsService, RealmsWorker],
})
export class CoreModule {}
