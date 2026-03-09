import { Module } from '@nestjs/common';
import { postgresConfig, s3Config } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysService, RealmsWorker, RealmsService } from './services';
import { S3Module } from '@app/s3';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { BlizzardApiService } from '@app/resources';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
  ],
  controllers: [],
  providers: [BlizzardApiService, KeysService, RealmsService, RealmsWorker],
})
export class CoreModule {}
