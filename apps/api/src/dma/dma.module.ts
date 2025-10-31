import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig, bullConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';
import { valuationsQueue } from '@app/resources';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([ItemsEntity, KeysEntity, MarketEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions,
    }),
  ],
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
