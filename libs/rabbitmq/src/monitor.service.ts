import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Gauge, Counter, Histogram, register } from 'prom-client';
import { RABBITMQ_QUEUES, getQueuesByExchange } from '@app/configuration';

/**
 * RabbitMQ Monitoring Service
 * Provides comprehensive monitoring and metrics for RabbitMQ message broker
 * Tracks queue depth, message rates, consumer counts, and error metrics
 */
@Injectable()
export class RabbitMQMonitorService {
  private readonly logger = new Logger(RabbitMQMonitorService.name);

  // Prometheus metrics - lazy initialized
  private queueDepthGauge: Gauge | null = null;
  private consumerCountGauge: Gauge | null = null;
  private messageRateCounter: Counter | null = null;
  private messageErrorCounter: Counter | null = null;
  private messageProcessingDuration: Histogram | null = null;
  private connectionHealthGauge: Gauge | null = null;
  private dlqDepthGauge: Gauge | null = null;

  private queueDepthCache = new Map<string, number>();
  private queueDrainedCallbacks = new Map<string, Array<() => Promise<void>>>();
  private messageCompletedCallbacks = new Map<
    string,
    Array<(message: any) => Promise<void>>
  >();
  private messageFailedCallbacks = new Map<
    string,
    Array<(message: any, error?: unknown) => Promise<void>>
  >();

  constructor(private readonly amqpConnection: AmqpConnection) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    try {
      this.queueDepthGauge = new Gauge({
        name: 'rabbitmq_queue_depth',
        help: 'Current depth of RabbitMQ queues',
        labelNames: ['queue_name', 'exchange'],
        registers: [register],
      });

      this.consumerCountGauge = new Gauge({
        name: 'rabbitmq_consumer_count',
        help: 'Number of active consumers per queue',
        labelNames: ['queue_name'],
        registers: [register],
      });

      this.messageRateCounter = new Counter({
        name: 'rabbitmq_messages_published_total',
        help: 'Total number of messages published',
        labelNames: ['exchange', 'routing_key', 'priority'],
        registers: [register],
      });

      this.messageErrorCounter = new Counter({
        name: 'rabbitmq_messages_failed_total',
        help: 'Total number of failed messages',
        labelNames: ['exchange', 'routing_key', 'error_type'],
        registers: [register],
      });

      this.messageProcessingDuration = new Histogram({
        name: 'rabbitmq_message_processing_duration_seconds',
        help: 'Message processing duration in seconds',
        labelNames: ['queue_name', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
        registers: [register],
      });

      this.connectionHealthGauge = new Gauge({
        name: 'rabbitmq_connection_health',
        help: 'RabbitMQ connection health (1=healthy, 0=unhealthy)',
        registers: [register],
      });

      this.dlqDepthGauge = new Gauge({
        name: 'rabbitmq_dlq_depth',
        help: 'Current depth of Dead Letter Queue',
        registers: [register],
      });
    } catch (error) {
      this.logger.warn('Metrics already registered, skipping initialization', error);
    }
  }

  /**
   * Monitor queue depths every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorQueueDepths(): Promise<void> {
    try {
      if (!this.queueDepthGauge || !this.dlqDepthGauge) {
        this.logger.warn('Metrics not initialized, skipping queue depth monitoring');
        return;
      }

      const channel = this.amqpConnection.channel;

      // Monitor OSINT queues
      const osintQueues = getQueuesByExchange('osint.exchange');
      for (const queueConfig of osintQueues) {
        try {
          const queueInfo = await channel.checkQueue(queueConfig.name);
          this.queueDepthGauge.set(
            { queue_name: queueConfig.name, exchange: 'osint.exchange' },
            queueInfo.messageCount,
          );
          await this.trackQueueDepth(queueConfig.name, queueInfo.messageCount);
        } catch (error) {
          this.logger.warn(`Failed to monitor queue ${queueConfig.name}:`, error);
        }
      }

      // Monitor DMA queues
      const dmaQueues = getQueuesByExchange('dma.exchange');
      for (const queueConfig of dmaQueues) {
        try {
          const queueInfo = await channel.checkQueue(queueConfig.name);
          this.queueDepthGauge.set(
            { queue_name: queueConfig.name, exchange: 'dma.exchange' },
            queueInfo.messageCount,
          );
          await this.trackQueueDepth(queueConfig.name, queueInfo.messageCount);
        } catch (error) {
          this.logger.warn(`Failed to monitor queue ${queueConfig.name}:`, error);
        }
      }

      // Monitor DLQ
      try {
        const dlqConfig = RABBITMQ_QUEUES.DLQ;
        const dlqInfo = await channel.checkQueue(dlqConfig.name);
        this.dlqDepthGauge.set(dlqInfo.messageCount);
      } catch (error) {
        this.logger.warn('Failed to monitor DLQ:', error);
      }

      // this.logger.debug('Queue depths monitored successfully');
    } catch (error) {
      this.logger.error('Error monitoring queue depths:', error);
    }
  }

  /**
   * Monitor consumer counts every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorConsumerCounts(): Promise<void> {
    try {
      if (!this.consumerCountGauge) {
        this.logger.warn(
          'Metrics not initialized, skipping consumer count monitoring',
        );
        return;
      }

      const channel = this.amqpConnection.channel;

      // Get all queues from config
      const allQueues = Object.values(RABBITMQ_QUEUES).filter(
        (q) => q.name !== 'dlx.dlq',
      );

      for (const queueConfig of allQueues) {
        try {
          const queueInfo = await channel.checkQueue(queueConfig.name);
          this.consumerCountGauge.set(
            { queue_name: queueConfig.name },
            queueInfo.consumerCount,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to get consumer count for queue ${queueConfig.name}:`,
            error,
          );
        }
      }

      // this.logger.debug('Consumer counts monitored successfully');
    } catch (error) {
      this.logger.error('Error monitoring consumer counts:', error);
    }
  }

  /**
   * Check RabbitMQ connection health every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkConnectionHealth(): Promise<void> {
    try {
      if (!this.connectionHealthGauge) {
        this.logger.warn(
          'Metrics not initialized, skipping connection health check',
        );
        return;
      }

      const channel = this.amqpConnection.channel;

      // Try to declare a test queue to verify connection
      await channel.assertQueue('health-check');

      this.connectionHealthGauge.set(1);
      // this.logger.debug('RabbitMQ connection is healthy');
    } catch (error) {
      if (this.connectionHealthGauge) {
        this.connectionHealthGauge.set(0);
      }
      this.logger.error('RabbitMQ connection health check failed:', error);
    }
  }

  /**
   * Record message publication
   */
  recordMessagePublished(
    exchange: string,
    routingKey: string,
    priority: number,
  ): void {
    if (!this.messageRateCounter) {
      this.logger.warn('Message rate counter not initialized');
      return;
    }
    this.messageRateCounter.inc({
      exchange,
      routing_key: routingKey,
      priority: priority.toString(),
    });
  }

  /**
   * Record message processing error
   */
  recordMessageError(exchange: string, routingKey: string, errorType: string): void {
    if (!this.messageErrorCounter) {
      this.logger.warn('Message error counter not initialized');
      return;
    }
    this.messageErrorCounter.inc({
      exchange,
      routing_key: routingKey,
      error_type: errorType,
    });
  }

  /**
   * Record message processing duration
   */
  recordMessageProcessingDuration(
    queueName: string,
    durationSeconds: number,
    status: 'success' | 'failure',
  ): void {
    if (!this.messageProcessingDuration) {
      this.logger.warn('Message processing duration histogram not initialized');
      return;
    }
    this.messageProcessingDuration.observe(
      { queue_name: queueName, status },
      durationSeconds,
    );
  }

  /**
   * Get current monitoring metrics
   */
  async getMetrics(): Promise<{
    queueDepths: Record<string, number>;
    consumerCounts: Record<string, number>;
    connectionHealth: number;
    dlqDepth: number;
  }> {
    try {
      const channel = this.amqpConnection.channel;
      const queueDepths: Record<string, number> = {};
      const consumerCounts: Record<string, number> = {};

      // Get all queues from config (excluding DLQ)
      const allQueues = Object.values(RABBITMQ_QUEUES).filter(
        (q) => q.name !== 'dlx.dlq',
      );

      for (const queueConfig of allQueues) {
        try {
          const queueInfo = await channel.checkQueue(queueConfig.name);
          queueDepths[queueConfig.name] = queueInfo.messageCount;
          consumerCounts[queueConfig.name] = queueInfo.consumerCount;
        } catch (error) {
          this.logger.warn(
            `Failed to get metrics for queue ${queueConfig.name}:`,
            error,
          );
          queueDepths[queueConfig.name] = 0;
          consumerCounts[queueConfig.name] = 0;
        }
      }

      let dlqDepth = 0;
      try {
        const dlqConfig = RABBITMQ_QUEUES.DLQ;
        const dlqInfo = await channel.checkQueue(dlqConfig.name);
        dlqDepth = dlqInfo.messageCount;
      } catch (error) {
        this.logger.warn('Failed to get DLQ metrics:', error);
      }

      return {
        queueDepths,
        consumerCounts,
        connectionHealth: 1,
        dlqDepth,
      };
    } catch (error) {
      this.logger.error('Error getting metrics:', error);
      return {
        queueDepths: {},
        consumerCounts: {},
        connectionHealth: 0,
        dlqDepth: 0,
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    messageCount: number;
    consumerCount: number;
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    processingRate: number;
    avgProcessingTime: number;
    activeJobs: any[];
  } | null> {
    try {
      if (!this.isKnownQueueName(queueName)) {
        this.logger.warn(`Unknown queue requested for stats: ${queueName}`);
        return null;
      }

      const channel = this.amqpConnection.channel;
      const queueInfo = await channel.checkQueue(queueName);

      return {
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        name: queueName,
        waiting: queueInfo.messageCount,
        active: queueInfo.consumerCount,
        completed: 0,
        failed: 0,
        processingRate: 0,
        avgProcessingTime: 0,
        activeJobs: [],
      };
    } catch (error) {
      this.logger.error(`Error getting stats for queue ${queueName}:`, error);
      return null;
    }
  }

  private isKnownQueueName(queueName: string): boolean {
    return Object.values(RABBITMQ_QUEUES).some((queue) => queue.name === queueName);
  }

  onQueueDrained(queueName: string, callback: () => Promise<void>): void {
    const callbacks = this.queueDrainedCallbacks.get(queueName) || [];
    callbacks.push(callback);
    this.queueDrainedCallbacks.set(queueName, callbacks);
  }

  onMessageCompleted(
    queueName: string,
    callback: (message: any) => Promise<void>,
  ): void {
    const callbacks = this.messageCompletedCallbacks.get(queueName) || [];
    callbacks.push(callback);
    this.messageCompletedCallbacks.set(queueName, callbacks);
  }

  onMessageFailed(
    queueName: string,
    callback: (message: any, error?: unknown) => Promise<void>,
  ): void {
    const callbacks = this.messageFailedCallbacks.get(queueName) || [];
    callbacks.push(callback);
    this.messageFailedCallbacks.set(queueName, callbacks);
  }

  async emitMessageCompleted(queueName: string, message: any): Promise<void> {
    const callbacks = this.messageCompletedCallbacks.get(queueName) || [];
    await Promise.all(callbacks.map((cb) => cb(message)));
  }

  async emitMessageFailed(
    queueName: string,
    message: any,
    error?: unknown,
  ): Promise<void> {
    const callbacks = this.messageFailedCallbacks.get(queueName) || [];
    await Promise.all(callbacks.map((cb) => cb(message, error)));
  }

  async pauseQueue(queueName: string): Promise<void> {
    this.logger.warn(`Pause queue not supported in RabbitMQ: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    this.logger.warn(`Resume queue not supported in RabbitMQ: ${queueName}`);
  }

  private async trackQueueDepth(queueName: string, depth: number): Promise<void> {
    const previous = this.queueDepthCache.get(queueName);
    this.queueDepthCache.set(queueName, depth);

    if (previous !== undefined && previous > 0 && depth === 0) {
      await this.emitQueueDrained(queueName);
    }
  }

  private async emitQueueDrained(queueName: string): Promise<void> {
    const callbacks = this.queueDrainedCallbacks.get(queueName) || [];
    await Promise.all(callbacks.map((cb) => cb()));
  }

  /**
   * Purge a queue (use with caution)
   */
  async purgeQueue(queueName: string): Promise<boolean> {
    try {
      const channel = this.amqpConnection.channel;
      await channel.purgeQueue(queueName);
      this.logger.warn(`Queue ${queueName} has been purged`);
      return true;
    } catch (error) {
      this.logger.error(`Error purging queue ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Get DLQ messages
   */
  async getDLQMessages(limit: number = 10): Promise<any[]> {
    try {
      const channel = this.amqpConnection.channel;
      const messages: any[] = [];

      for (let i = 0; i < limit; i++) {
        const msg = await channel.get('dlx.dlq', { noAck: false });
        if (!msg) break;

        messages.push({
          content: msg.content.toString(),
          properties: msg.properties,
          fields: msg.fields,
        });

        // Acknowledge the message
        await channel.ack(msg);
      }

      return messages;
    } catch (error) {
      this.logger.error('Error getting DLQ messages:', error);
      return [];
    }
  }
}
