import {
  auctionsQueue,
  charactersQueue,
  guildsQueue,
  hashQueue,
  itemsQueue,
  profileQueue,
  realmsQueue,
  valuationsQueue,
} from '@app/resources';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

const QUEUES = [
  charactersQueue,
  guildsQueue,
  hashQueue,
  profileQueue,
  auctionsQueue,
  itemsQueue,
  valuationsQueue,
  realmsQueue,
];

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
