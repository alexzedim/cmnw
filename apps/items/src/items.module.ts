import { Module } from '@nestjs/common';
import { PricingService, ItemsService } from './services';
import { BullModule } from '@nestjs/bullmq';
import { itemsQueue, pricingQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { bullConfig, postgresConfig, s3Config } from '@app/configuration';
import { S3Module } from '@app/s3';
import {
  ItemsEntity,
  KeysEntity,
  PricingEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
} from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      ItemsEntity,
      PricingEntity,
      SkillLineEntity,
      SpellEffectEntity,
      SpellReagentsEntity
    ]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
      defaultJobOptions: itemsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
      defaultJobOptions: pricingQueue.defaultJobOptions
    }),
  ],
  controllers: [],
  providers: [ItemsService, PricingService],
})
export class ItemsModule {}
