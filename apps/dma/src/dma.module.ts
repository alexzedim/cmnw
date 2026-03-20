import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig, REDIS_CONNECTION } from '@app/configuration';
import { AuctionsWorker, ItemsWorker } from './workers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { auctionsQueue, itemsQueue } from '@app/resources';
import { BlizzardApiService } from '@app/resources/services';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, ItemsEntity, MarketEntity]),
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
    BullModule.registerQueue({
      name: auctionsQueue.name,
      connection: auctionsQueue.connection,
      defaultJobOptions: auctionsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
      connection: itemsQueue.connection,
      defaultJobOptions: itemsQueue.defaultJobOptions,
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
  ],
  controllers: [],
  providers: [AuctionsWorker, ItemsWorker, BlizzardApiService],
})
export class DmaModule {}
