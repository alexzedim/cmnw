import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import {
  charactersQueue,
  guildsQueue,
  profileQueue,
  auctionsQueue,
  itemsQueue,
  valuationsQueue,
  realmsQueue,
} from '@app/resources';

const QUEUES = [charactersQueue, guildsQueue, profileQueue, auctionsQueue, itemsQueue, valuationsQueue, realmsQueue];

@Module({
  imports: [
    BullModule.registerQueue(
      ...QUEUES.map((queue) => ({
        name: queue.name,
        defaultJobOptions: queue.defaultJobOptions,
      })),
    ),
    BullBoardModule.forFeature(
      ...QUEUES.map((queue) => ({
        name: queue.name,
        adapter: BullMQAdapter,
      })),
    ),
  ],
})
export class QueueModule {}
