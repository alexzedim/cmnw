import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQModule as GolevelupRabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  rabbitmqConfig,
  RABBITMQ_QUEUES,
  getAllQueueNames,
} from '@app/configuration';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQPublisherService } from './publisher.service';
import { RabbitMQMonitorService } from './monitor.service';
import { RabbitMQAlertingService } from './alerting.service';

/**
 * RabbitMQ Module
 *
 * Configures and initializes RabbitMQ connection with all exchanges and queues.
 * Provides RabbitMQPublisherService for publishing messages.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    GolevelupRabbitMQModule.forRoot({
      exchanges: rabbitmqConfig.exchanges,
      uri: rabbitmqConfig.uri,
      connectionInitOptions: rabbitmqConfig.connectionInitOptions,
      prefetchCount: rabbitmqConfig.prefetch || 10,
      enableControllerDiscovery: true,
    }),
  ],
  providers: [
    RabbitMQPublisherService,
    RabbitMQMonitorService,
    RabbitMQAlertingService,
  ],
  exports: [
    GolevelupRabbitMQModule,
    RabbitMQPublisherService,
    RabbitMQMonitorService,
    RabbitMQAlertingService,
  ],
})
export class RabbitMQModule implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQModule.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Initialize queues and bindings on module startup
   */
  async onModuleInit(): Promise<void> {
    this.logger.log({
      logTag: 'RabbitMQModule.onModuleInit',
      message: 'Initializing RabbitMQ queues and bindings',
      queueCount: getAllQueueNames().length,
    });

    try {
      const channel = this.amqpConnection.managedChannel;

      // Create all queues and bind them to exchanges
      for (const [_queueKey, queueConfig] of Object.entries(RABBITMQ_QUEUES)) {
        try {
          this.logger.debug({
            logTag: 'RabbitMQModule.onModuleInit',
            message: `Asserting queue with config: ${queueConfig.name}`,
            queueName: queueConfig.name,
            exchange: queueConfig.exchange,
            routingKeys: queueConfig.routingKeys,
            options: queueConfig.options,
          });

          // Assert queue with its configuration
          await channel.assertQueue(queueConfig.name, queueConfig.options);

          this.logger.debug({
            logTag: 'RabbitMQModule.onModuleInit',
            message: `Queue created/verified: ${queueConfig.name}`,
            queueName: queueConfig.name,
            durable: queueConfig.options.durable,
            maxPriority: queueConfig.options.arguments['x-max-priority'],
          });

          // Bind queue to exchange with routing keys
          for (const routingKey of queueConfig.routingKeys) {
            await channel.bindQueue(
              queueConfig.name,
              queueConfig.exchange,
              routingKey,
            );

            this.logger.debug({
              logTag: 'RabbitMQModule.onModuleInit',
              message: `Queue binding created: ${queueConfig.name} -> ${queueConfig.exchange} (${routingKey})`,
              queueName: queueConfig.name,
              exchange: queueConfig.exchange,
              routingKey,
            });
          }
        } catch (error) {
          this.logger.error({
            logTag: 'RabbitMQModule.onModuleInit',
            message: `Failed to create/bind queue: ${queueConfig.name}`,
            queueName: queueConfig.name,
            error: error.message,
            stack: error.stack,
          });
          throw error;
        }
      }

      this.logger.log({
        logTag: 'RabbitMQModule.onModuleInit',
        message: 'RabbitMQ module initialized successfully',
        queueCount: getAllQueueNames().length,
        totalBindings: Object.values(RABBITMQ_QUEUES).reduce(
          (sum, q) => sum + q.routingKeys.length,
          0,
        ),
      });
    } catch (error) {
      this.logger.error({
        logTag: 'RabbitMQModule.onModuleInit',
        message: 'Failed to initialize RabbitMQ module',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
