import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { BullModule } from '@nestjs/bullmq';
import { REDIS_CONNECTION } from '@app/configuration';
import { valuationsQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
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
