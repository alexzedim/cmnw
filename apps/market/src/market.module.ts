import { Module } from '@nestjs/common';
import { bullConfig, postgresConfig, redisConfig } from '@app/configuration';
import { AuctionsService, ContractsService, GoldService } from './services';
import { BullModule } from '@nestjs/bullmq';
import { auctionsQueue } from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      RealmsEntity,
      MarketEntity,
      ContractEntity,
      ItemsEntity
    ]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      }
    }),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: auctionsQueue.name,
      defaultJobOptions: auctionsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [RealmsCacheService, AuctionsService, GoldService, ContractsService],
})
export class MarketModule {}
