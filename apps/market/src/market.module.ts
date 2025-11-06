import { Module } from '@nestjs/common';
import { bullConfig, postgresConfig, redisConfig } from '@app/configuration';
import {
  AuctionsService,
  ContractsService,
  EvaluationService,
  GoldService,
  PricingValuationsService,
  ItemsService,
} from './services';
import { BullModule } from '@nestjs/bullmq';
import { auctionsQueue, pricingQueue, itemsQueue } from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ContractEntity,
  EvaluationEntity,
  ItemsEntity,
  KeysEntity,
  MarketEntity,
  PricingEntity,
  RealmsEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
  ValuationEntity,
} from '@app/pg';
import { HttpModule } from '@nestjs/axios';
import { S3Module } from '@app/s3';
import { s3Config } from '@app/configuration';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      RealmsEntity,
      MarketEntity,
      ContractEntity,
      ItemsEntity,
      PricingEntity,
      SkillLineEntity,
      SpellEffectEntity,
      SpellReagentsEntity,
      ValuationEntity,
      EvaluationEntity,
    ]),
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
      name: auctionsQueue.name,
      defaultJobOptions: auctionsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
      defaultJobOptions: pricingQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
      defaultJobOptions: itemsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [
    RealmsCacheService,
    AuctionsService,
    GoldService,
    ContractsService,
    PricingValuationsService,
    ItemsService,
    EvaluationService,
  ],
})
export class MarketModule {}
