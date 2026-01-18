import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import { RabbitMQModule } from '@app/rabbitmq';
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
    RabbitMQModule,
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
