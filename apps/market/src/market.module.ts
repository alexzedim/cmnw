import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, REDIS_CONNECTION, redisConfig, s3Config } from '@app/configuration';
import {
  ContractEntity,
  EvaluationEntity,
  ItemsEntity,
  MarketEntity,
  PricingEntity,
  RealmsEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
  ValuationEntity,
} from '@app/pg';
import { auctionsQueue, itemsQueue } from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { S3Module } from '@app/s3';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import {
  AuctionsService,
  ContractsService,
  EvaluationService,
  GoldService,
  ItemsService,
  XvaService,
} from './services';

@Module({
  imports: [
    HttpModule,
    BattleNetModule,
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
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
      connection: REDIS_CONNECTION,
    }),
    BullModule.registerQueue({
      name: auctionsQueue.name,
      connection: auctionsQueue.connection,
      defaultJobOptions: auctionsQueue.defaultJobOptions,
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
    XvaService,
    ItemsService,
    EvaluationService,
  ],
})
export class MarketModule {}
