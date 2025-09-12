import { MiddlewareConsumer, Module } from '@nestjs/common';
import { bullConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import {
  auctionsQueue,
  charactersQueue,
  guildsQueue,
  itemsQueue,
  pricingQueue,
  realmsQueue,
  valuationsQueue,
} from '@app/resources';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: auctionsQueue.name
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
    }),
    BullModule.registerQueue({
      name: realmsQueue.name,
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
    }),
    BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
    BullBoardModule.forFeature(
      { name: auctionsQueue.name, adapter: BullMQAdapter },
      { name: charactersQueue.name, adapter: BullMQAdapter },
      { name: guildsQueue.name, adapter: BullMQAdapter },
      { name: realmsQueue.name, adapter: BullMQAdapter },
      { name: itemsQueue.name, adapter: BullMQAdapter },
      { name: pricingQueue.name, adapter: BullMQAdapter },
      { name: valuationsQueue.name, adapter: BullMQAdapter },
    ),
  ],
  controllers: [],
  providers: [],
})
export class QueueModule {}
