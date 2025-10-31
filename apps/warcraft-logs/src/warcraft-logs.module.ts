import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WarcraftLogsService } from './warcraft-logs.service';
import { bullConfig, postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersRaidLogsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      RealmsEntity,
      CharactersRaidLogsEntity,
    ]),
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
  providers: [WarcraftLogsService],
})
export class WarcraftLogsModule {}
