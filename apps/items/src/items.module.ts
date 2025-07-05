import { Module } from '@nestjs/common';
import { PricingService, ItemsService } from './services';
import { BullModule } from '@nestjs/bullmq';
import { itemsQueue, pricingQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { bullConfig, postgresConfig } from '@app/configuration';
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
