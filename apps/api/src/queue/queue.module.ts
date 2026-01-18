import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@app/rabbitmq';
import {
  QueueMonitorController,
  QueueRabbitMQController,
} from './queue-monitor.controller';
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
    RabbitMQModule,
  ],
  controllers: [QueueMonitorController, WorkersController, QueueRabbitMQController],
  providers: [QueueMonitorService, QueueMetricsService, ...queueMetricsProviders],
})
export class QueueModule {}
