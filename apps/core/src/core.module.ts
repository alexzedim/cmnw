import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysService, RealmsWorker, RealmsService } from './services';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { realmsQueue } from '@app/resources';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
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
