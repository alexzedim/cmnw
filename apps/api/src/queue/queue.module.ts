import { Module } from '@nestjs/common';
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
import { profileQueue } from '@app/resources/queues/profile.queue';
import { QueueMonitorController } from './queue-monitor.controller';
import { QueueMonitorService } from './queue-monitor.service';
import { WorkersController } from './workers.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { QueueMetricsService } from './queue-metrics.service';
import { queueMetricsProviders } from './queue-metrics.provider';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
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
    BullModule.registerQueue({
      name: profileQueue.name,
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
      { name: profileQueue.name, adapter: BullMQAdapter },
    ),
  ],
  controllers: [QueueMonitorController, WorkersController],
  providers: [QueueMonitorService, QueueMetricsService, ...queueMetricsProviders],
})
export class QueueModule {}
