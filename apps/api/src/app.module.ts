import { REDIS_CONNECTION, redisConfig } from '@app/configuration';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
// Analytics snapshots are owned exclusively by the dedicated analytics
// worker (cron + bootstrap); the API only reads the analytics table through
// the AnalyticsEntity repository registered in AppInfoModule.
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
