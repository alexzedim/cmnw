import { postgresConfig, REDIS_CONNECTION, redisConfig } from '@app/configuration';
import { ContractEntity, ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';
import { auctionsQueue, itemsQueue, valuationsQueue } from '@app/resources';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([ItemsEntity, KeysEntity, MarketEntity, ContractEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
    BullModule.registerQueue(valuationsQueue, itemsQueue, auctionsQueue),
  ],
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
