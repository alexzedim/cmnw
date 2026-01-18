import { Module } from '@nestjs/common';
import { redisConfig } from '@app/configuration';
import { RabbitMQModule } from '@app/rabbitmq';
import { OsintModule } from './osint/osint.module';
import { DmaModule } from './dma/dma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppInfoModule } from './app/app.module';

@Module({
  imports: [
    HttpModule,
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    RabbitMQModule,
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
