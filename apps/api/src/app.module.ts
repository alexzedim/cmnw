import { Module } from '@nestjs/common';
import { REDIS_CONNECTION, redisConfig } from '@app/configuration';
import { OsintModule } from './osint/osint.module';
import { DmaModule } from './dma/dma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { FeedModule } from './feed/feed.module';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppInfoModule } from './app/app.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

// HoF + analytics snapshots computed on API bootstrap so the snapshot
// endpoint serves fresh data without requiring a separate analytics process.
import { AnalyticsModule } from '../../analytics/src/analytics.module';

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
