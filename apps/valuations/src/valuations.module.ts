import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConnection } from '@app/configuration';
import { valuationsQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({ connection: getRedisConnection() }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
