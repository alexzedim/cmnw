import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { getRedisConnection } from '@app/configuration';
import {
  charactersQueue,
  guildsQueue,
  profileQueue,
  auctionsQueue,
  itemsQueue,
  valuationsQueue,
  realmsQueue,
} from '@app/resources';
import { QueueMonitorController } from './queue-monitor.controller';
import { QueueMonitorService } from './queue-monitor.service';
import { WorkersController } from './workers.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { QueueMetricsService } from './queue-metrics.service';
import { queueMetricsProviders } from './queue-metrics.provider';

@Module({
  imports: [
    BullModule.forRoot({ connection: getRedisConnection() }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: profileQueue.name,
      defaultJobOptions: profileQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: auctionsQueue.name,
      defaultJobOptions: auctionsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
      defaultJobOptions: itemsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: realmsQueue.name,
      defaultJobOptions: realmsQueue.defaultJobOptions,
    }),
    BullBoardModule.forFeature({
      name: charactersQueue.name,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: guildsQueue.name,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: profileQueue.name,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: auctionsQueue.name,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: itemsQueue.name,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: valuationsQueue.name,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: realmsQueue.name,
      adapter: BullMQAdapter,
    }),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  controllers: [QueueMonitorController, WorkersController],
  providers: [
    QueueMonitorService,
    QueueMetricsService,
    ...queueMetricsProviders,
  ],
  exports: [],
})
export class QueueModule {}
