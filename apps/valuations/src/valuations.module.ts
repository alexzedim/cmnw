import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { RabbitMQModule } from '@app/rabbitmq';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), RabbitMQModule],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
