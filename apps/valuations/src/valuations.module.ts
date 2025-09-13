import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { bullConfig, mongoConfig, mongoOptionsConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { valuationsQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import {
  Market,
  AuctionsSchema,
  Item,
  ItemsSchema,
  Pricing,
  PricingSchema,
} from '@app/mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemsSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: Market.name, schema: AuctionsSchema },
    ]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions
    }),
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
