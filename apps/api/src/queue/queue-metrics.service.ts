import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge, Counter } from 'prom-client';
import { getStatusLabel } from '@app/resources';
import { workerConfig } from '@app/configuration';
import { RabbitMQMonitorService } from '@app/rabbitmq';

@Injectable()
export class QueueMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueMetricsService.name);
  private updateInterval: NodeJS.Timeout;
  private readonly workerId: string;

  private readonly queueNames = [
    'dma.auctions',
    'osint.characters',
    'osint.guilds',
    'core.realms',
    'dma.items',
    'dma.valuations',
    'osint.profiles',
  ];

  constructor(
    @InjectMetric('rabbitmq_queue_messages_ready')
    private readonly messagesReadyGauge: Gauge<string>,
    @InjectMetric('rabbitmq_queue_messages_unacked')
    private readonly messagesUnackedGauge: Gauge<string>,
    @InjectMetric('rabbitmq_queue_consumers')
    private readonly consumersGauge: Gauge<string>,
    @InjectMetric('rabbitmq_queue_processing_rate')
    private readonly processingRateGauge: Gauge<string>,
    @InjectMetric('rabbitmq_queue_avg_processing_time_ms')
    private readonly avgProcessingTimeGauge: Gauge<string>,
    @InjectMetric('rabbitmq_message_consume_total')
    private readonly jobsTotalCounter: Counter<string>,
    @InjectMetric('rabbitmq_jobs_by_status_code')
    private readonly jobsByStatusCodeCounter: Counter<string>,
    @InjectMetric('rabbitmq_jobs_by_source')
    private readonly jobsBySourceCounter: Counter<string>,
    private readonly rabbitMQMonitorService: RabbitMQMonitorService,
  ) {
    this.workerId = workerConfig.workerId;
  }

  async onModuleInit() {
    this.logger.log(
      `QueueMetricsService initialized with worker_id: ${this.workerId}`,
    );
    this.logger.debug(
      `QueueMetricsService monitoring queues: ${this.queueNames.join(', ')}`,
    );

    // Initial metrics collection
    await this.updateMetrics();

    // Set up event listeners for job completions/failures via RabbitMQ
    this.setupQueueEventListeners();

    // Update metrics every 15 seconds (aligned with Prometheus scrape interval)
    this.updateInterval = setInterval(() => {
      this.updateMetrics().catch((error) => {
        console.error('Failed to update queue metrics:', error);
      });
    }, 15000);
  }

  private setupQueueEventListeners() {
    for (const queueName of this.queueNames) {
      // Listen for completed messages via RabbitMQ
      this.rabbitMQMonitorService.onMessageCompleted(queueName, async (message) => {
        this.jobsTotalCounter.inc({
          queue: queueName,
          status: 'completed',
          worker_id: this.workerId,
        });

        // Track message metadata
        try {
          await this.trackMessageMetadata(queueName, message);
        } catch (error) {
          this.logger.error(
            `Failed to track message metadata for ${queueName}:`,
            error,
          );
        }
      });

      // Listen for failed messages via RabbitMQ
      this.rabbitMQMonitorService.onMessageFailed(queueName, async () => {
        this.jobsTotalCounter.inc({
          queue: queueName,
          status: 'failed',
          worker_id: this.workerId,
        });
      });
    }
  }

  async updateMetrics() {
    for (const queueName of this.queueNames) {
      try {
        const stats = await this.rabbitMQMonitorService.getQueueStats(queueName);
        if (!stats) {
          this.logger.warn(`Queue stats unavailable for ${queueName}`);
          continue;
        }

        this.messagesReadyGauge
          .labels(queueName, this.workerId)
          .set(stats.messageCount ?? stats.waiting ?? 0);
        this.messagesUnackedGauge.labels(queueName, this.workerId).set(0);
        this.consumersGauge
          .labels(queueName)
          .set(stats.consumerCount ?? stats.active ?? 0);

        // Calculate processing rate
        const processingRate = await this.calculateProcessingRate(queueName);
        this.processingRateGauge
          .labels(queueName, this.workerId)
          .set(processingRate);

        // Calculate average processing time
        const avgTime = await this.calculateAverageProcessingTime(queueName);
        this.avgProcessingTimeGauge.labels(queueName, this.workerId).set(avgTime);
      } catch (error) {
        console.error(`Failed to update metrics for queue ${queueName}:`, error);
      }
    }
  }

  private async calculateProcessingRate(queueName: string): Promise<number> {
    // Get recent completion stats from RabbitMQ monitor
    const stats = await this.rabbitMQMonitorService.getQueueStats(queueName);
    return stats.processingRate || 0;
  }

  private async calculateAverageProcessingTime(queueName: string): Promise<number> {
    // Get average processing time from RabbitMQ monitor
    const stats = await this.rabbitMQMonitorService.getQueueStats(queueName);
    return stats.avgProcessingTime || 0;
  }

  /**
   * Track message metadata (createdBy, updatedBy, statusCode) from message content
   */
  private async trackMessageMetadata(
    queueName: string,
    message: any,
  ): Promise<void> {
    try {
      const messageData = message.data || message;

      // Track status code if available
      if (typeof messageData.statusCode === 'number') {

        this.jobsByStatusCodeCounter.inc({
          queue: queueName,
          status_code: messageData.statusCode.toString(),
          status_label: statusLabel,
          worker_id: this.workerId,
        });
      }

      // Track createdBy source
      if (messageData?.createdBy) {
        this.jobsBySourceCounter.inc({
          queue: queueName,
          source: messageData.createdBy,
          source_type: 'createdBy',
          worker_id: this.workerId,
        });
      }

      // Track updatedBy source
      if (messageData?.updatedBy) {
        this.jobsBySourceCounter.inc({
          queue: queueName,
          source: messageData.updatedBy,
          source_type: 'updatedBy',
          worker_id: this.workerId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to track message metadata for queue ${queueName}:`,
        error,
      );
    }
  }

  async onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
