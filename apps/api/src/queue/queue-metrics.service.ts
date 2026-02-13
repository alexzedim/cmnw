import {
  Injectable,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge, Counter } from 'prom-client';
import { workerConfig } from '@app/configuration';
import { getStatusChar } from '@app/resources';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

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

  private queues: Record<string, Queue> = {};

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
    @InjectQueue('dma.auctions') private readonly dmaAuctionsQueue: Queue,
    @InjectQueue('osint.characters')
    private readonly osintCharactersQueue: Queue,
    @InjectQueue('osint.guilds') private readonly osintGuildsQueue: Queue,
    @InjectQueue('core.realms') private readonly coreRealmsQueue: Queue,
    @InjectQueue('dma.items') private readonly dmaItemsQueue: Queue,
    @InjectQueue('dma.valuations') private readonly dmaValuationsQueue: Queue,
    @InjectQueue('osint.profiles') private readonly osintProfilesQueue: Queue,
  ) {
    this.workerId = workerConfig.workerId;
    this.queues = {
      'dma.auctions': dmaAuctionsQueue,
      'osint.characters': osintCharactersQueue,
      'osint.guilds': osintGuildsQueue,
      'core.realms': coreRealmsQueue,
      'dma.items': dmaItemsQueue,
      'dma.valuations': dmaValuationsQueue,
      'osint.profiles': osintProfilesQueue,
    };
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

    // Update metrics every 15 seconds (aligned with Prometheus scrape interval)
    this.updateInterval = setInterval(() => {
      this.updateMetrics().catch((error) => {
        console.error('Failed to update queue metrics:', error);
      });
    }, 15000);
  }

  async updateMetrics() {
    for (const queueName of this.queueNames) {
      try {
        const queue = this.getQueueByName(queueName);
        if (!queue) {
          this.logger.warn(`Queue not found: ${queueName}`);
          continue;
        }

        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        this.messagesReadyGauge.labels(queueName, this.workerId).set(waiting);
        this.messagesUnackedGauge.labels(queueName, this.workerId).set(0);
        this.consumersGauge.labels(queueName).set(active);

        // For BullMQ, processing rate and avg time require tracking
        const processingRate = 0; // TODO: implement rate tracking
        const avgTime = 0; // TODO: implement avg time tracking

        this.processingRateGauge
          .labels(queueName, this.workerId)
          .set(processingRate);
        this.avgProcessingTimeGauge
          .labels(queueName, this.workerId)
          .set(avgTime);
      } catch (error) {
        console.error(
          `Failed to update metrics for queue ${queueName}:`,
          error,
        );
      }
    }
  }

  private getQueueByName(queueName: string): Queue | undefined {
    return this.queues[queueName];
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
        const statusLabel = getStatusChar(
          messageData.status || '------',
          'STATUS',
        );

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
