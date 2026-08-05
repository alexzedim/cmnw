import { REDIS_CONNECTION, redisConfig } from '@app/configuration';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
// HoF + analytics snapshots computed on API bootstrap so the snapshot
// endpoint serves fresh data without requiring a separate analytics process.
import { AnalyticsModule } from '../../analytics/src/analytics.module';
import { AppInfoModule } from './app/app.module';
import { AuthModule } from './auth/auth.module';
import { DmaModule } from './dma/dma.module';
import { FeedModule } from './feed/feed.module';
import { OsintModule } from './osint/osint.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    HttpModule,
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    OsintModule,
    DmaModule,
    AuthModule,
    QueueModule,
    AppInfoModule,
    FeedModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
