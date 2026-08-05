import { REDIS_CONNECTION } from '@app/configuration';
import { ItemsEntity, MarketEntity, PricingEntity, RealmsEntity } from '@app/pg';
import { valuationsQueue } from '@app/resources';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValuationsService } from './valuations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemsEntity, RealmsEntity, PricingEntity, MarketEntity]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({ connection: REDIS_CONNECTION }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
