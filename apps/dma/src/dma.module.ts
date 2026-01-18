import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { RabbitMQModule } from '@app/rabbitmq';
import { AuctionsWorker, ItemsWorker } from './workers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, ItemsEntity, MarketEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    RabbitMQModule,
  ],
  controllers: [],
  providers: [AuctionsWorker, ItemsWorker],
})
export class DmaModule {}
