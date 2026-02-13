import { Module } from '@nestjs/common';
import { getRedisConnection, redisConfig } from '@app/configuration';
import { OsintModule } from './osint/osint.module';
import { DmaModule } from './dma/dma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppInfoModule } from './app/app.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    HttpModule,
    BullModule.forRoot({ connection: getRedisConnection() }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    OsintModule,
    DmaModule,
    AuthModule,
    QueueModule,
    AppInfoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
