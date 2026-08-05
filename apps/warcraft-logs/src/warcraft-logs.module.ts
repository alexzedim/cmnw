import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, REDIS_CONNECTION, redisConfig } from '@app/configuration';
import { CharactersRaidLogsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WarcraftLogsService } from './warcraft-logs.service';
import { WarcraftLogsMigrationService } from './warcraft-logs-migration.service';

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
    TypeOrmModule.forFeature([RealmsEntity, CharactersRaidLogsEntity, KeysEntity]),
    BullModule.forRoot({
      connection: REDIS_CONNECTION,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      connection: guildsQueue.connection,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      connection: charactersQueue.connection,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: profileQueue.name,
      connection: profileQueue.connection,
      defaultJobOptions: profileQueue.defaultJobOptions,
    }),
    BattleNetModule,
  ],
  controllers: [],
  providers: [WarcraftLogsService, WarcraftLogsMigrationService, RealmsCacheService],
})
export class WarcraftLogsModule {}
