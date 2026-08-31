import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, REDIS_CONNECTION, redisConfig } from '@app/configuration';
import { CharactersRaidLogsEntity, RealmsEntity } from '@app/pg';
import { charactersQueue } from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WclBrowserService, WclDiscoveryService, WclParseService, WclRosterService } from './services';
import { WarcraftLogsService } from './warcraft-logs.service';

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
    TypeOrmModule.forFeature([RealmsEntity, CharactersRaidLogsEntity]),
    BullModule.forRoot({
      connection: REDIS_CONNECTION,
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      connection: charactersQueue.connection,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BattleNetModule,
  ],
  controllers: [],
  providers: [
    WarcraftLogsService,
    WclBrowserService,
    WclDiscoveryService,
    WclRosterService,
    WclParseService,
    RealmsCacheService,
  ],
})
export class WarcraftLogsModule {}
