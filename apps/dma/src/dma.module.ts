import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { postgresConfig } from '@app/configuration';
import { AuctionsWorker, ItemsWorker } from './workers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { getRedisConnection } from '@app/configuration';
import { auctionsQueue, BlizzardApiService, itemsQueue } from '@app/resources';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      RealmsEntity,
      ItemsEntity,
      MarketEntity,
    ]),
    BullModule.forRoot({ connection: getRedisConnection() }),
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
  ],
  controllers: [],
  providers: [AuctionsWorker, ItemsWorker, BlizzardApiService],
})
export class DmaModule {}
