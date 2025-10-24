import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge, Counter } from 'prom-client';
import {
  auctionsQueue,
  charactersQueue,
  guildsQueue,
  itemsQueue,
  pricingQueue,
  realmsQueue,
  valuationsQueue,
  getStatusLabel,
} from '@app/resources';
import { profileQueue } from '@app/resources/queues/profile.queue';
import { workerConfig } from '@app/configuration';

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  private readonly logger = new Logger(QueueMetricsService.name);
  private updateInterval: NodeJS.Timeout;
  private readonly workerId: string;

  constructor(
    @InjectQueue(auctionsQueue.name)
    private readonly auctionsQueue: Queue,
    @InjectQueue(charactersQueue.name)
    private readonly charactersQueue: Queue,
    @InjectQueue(guildsQueue.name)
    private readonly guildsQueue: Queue,
    @InjectQueue(realmsQueue.name)
    private readonly realmsQueue: Queue,
    @InjectQueue(itemsQueue.name)
    private readonly itemsQueue: Queue,
    @InjectQueue(pricingQueue.name)
    private readonly pricingQueue: Queue,
    @InjectQueue(valuationsQueue.name)
    private readonly valuationsQueue: Queue,
    @InjectQueue(profileQueue.name)
    private readonly profileQueue: Queue,
    @InjectMetric('bullmq_queue_waiting_jobs')
    private readonly waitingGauge: Gauge<string>,
    @InjectMetric('bullmq_queue_active_jobs')
    private readonly activeGauge: Gauge<string>,
    @InjectMetric('bullmq_queue_completed_jobs')
    private readonly completedGauge: Gauge<string>,
    @InjectMetric('bullmq_queue_failed_jobs')
    private readonly failedGauge: Gauge<string>,
    @InjectMetric('bullmq_queue_delayed_jobs')
    private readonly delayedGauge: Gauge<string>,
    @InjectMetric('bullmq_queue_processing_rate')
    private readonly processingRateGauge: Gauge<string>,
    @InjectMetric('bullmq_queue_avg_processing_time_ms')
    private readonly avgProcessingTimeGauge: Gauge<string>,
    @InjectMetric('bullmq_jobs_total')
    private readonly jobsTotalCounter: Counter<string>,
    @InjectMetric('bullmq_jobs_by_status_code')
    private readonly jobsByStatusCodeCounter: Counter<string>,
    @InjectMetric('bullmq_jobs_by_source')
    private readonly jobsBySourceCounter: Counter<string>,
  ) {
    this.workerId = workerConfig.workerId;
  }

  private get allQueues(): Array<{ name: string; queue: Queue }> {
    return [
      { name: auctionsQueue.name, queue: this.auctionsQueue },
      { name: charactersQueue.name, queue: this.charactersQueue },
      { name: guildsQueue.name, queue: this.guildsQueue },
      { name: realmsQueue.name, queue: this.realmsQueue },
      { name: itemsQueue.name, queue: this.itemsQueue },
      { name: pricingQueue.name, queue: this.pricingQueue },
      { name: valuationsQueue.name, queue: this.valuationsQueue },
      { name: profileQueue.name, queue: this.profileQueue },
    ];
  }

  async onModuleInit() {
    // Initial metrics collection
    await this.updateMetrics();

    // Set up event listeners for job completions/failures
    this.setupQueueEventListeners();

    // Update metrics every 15 seconds (aligned with Prometheus scrape interval)
    this.updateInterval = setInterval(() => {
      this.updateMetrics().catch((error) => {
        console.error('Failed to update queue metrics:', error);
      });
    }, 15000);
  }

  private setupQueueEventListeners() {
    for (const { name, queue } of this.allQueues) {
      // Listen for completed jobs
      queue.on('completed', async (job) => {
        this.jobsTotalCounter.inc({
          queue: name,
          status: 'completed',
          worker_id: this.workerId,
        });

        // Track job metadata if available
        await this.trackJobMetadata(name, job);
      });

      // Listen for failed jobs
      queue.on('failed', () => {
        this.jobsTotalCounter.inc({
          queue: name,
          status: 'failed',
          worker_id: this.workerId,
        });
      });
    }
  }

  async updateMetrics() {
    for (const { name, queue } of this.allQueues) {
      try {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        );

        this.waitingGauge.set({ queue: name, worker_id: this.workerId }, counts.waiting);
        this.activeGauge.set({ queue: name, worker_id: this.workerId }, counts.active);
        this.completedGauge.set({ queue: name, worker_id: this.workerId }, counts.completed);
        this.failedGauge.set({ queue: name, worker_id: this.workerId }, counts.failed);
        this.delayedGauge.set({ queue: name, worker_id: this.workerId }, counts.delayed);

        // Calculate processing rate
        const completedJobs = await queue.getCompleted(0, 99);
        const processingRate = await this.calculateProcessingRate(completedJobs);
        this.processingRateGauge.set({ queue: name, worker_id: this.workerId }, processingRate);

        // Calculate average processing time
        const avgTime = await this.calculateAverageProcessingTime(completedJobs);
        this.avgProcessingTimeGauge.set({ queue: name, worker_id: this.workerId }, avgTime);

        // Note: bullmq_jobs_total counter should be incremented by workers on job completion
        // NOT here in the metrics collection loop, as that would cause incorrect totals
      } catch (error) {
        console.error(`Failed to update metrics for queue ${name}:`, error);
      }
    }
  }

  private async calculateProcessingRate(completedJobs: any[]): Promise<number> {
    const recentJobs = completedJobs.filter((job) => {
      const isJobFinished = job.finishedOn !== undefined;
      if (!isJobFinished) return false;

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return job.finishedOn > fiveMinutesAgo;
    });

    const isNoRecentJobs = recentJobs.length === 0;
    if (isNoRecentJobs) return 0;

    return recentJobs.length / 5 || 0;
  }

  private async calculateAverageProcessingTime(
    completedJobs: any[],
  ): Promise<number> {
    const jobsWithTimes = completedJobs.filter(
      (job) => job.processedOn && job.finishedOn,
    );

    const isNoJobsWithTimes = jobsWithTimes.length === 0;
    if (isNoJobsWithTimes) return 0;

    const totalTime = jobsWithTimes.reduce((sum, job) => {
      return sum + (job.finishedOn - job.processedOn);
    }, 0);

    return totalTime / jobsWithTimes.length;
  }

  /**
   * Track job metadata (createdBy, updatedBy, statusCode) from job return value
   * The worker returns statusCode as the job result
   */
  private async trackJobMetadata(queueName: string, job: Job): Promise<void> {
    try {
      const statusCode = job.returnvalue;
      const jobData = job.data as any;

      // Track status code if available
      if (typeof statusCode === 'number') {
        const statusLabel = getStatusLabel(statusCode);
        this.jobsByStatusCodeCounter.inc({
          queue: queueName,
          status_code: statusCode.toString(),
          status_label: statusLabel,
          worker_id: this.workerId,
        });
      }

      // Track createdBy source
      if (jobData?.createdBy) {
        this.jobsBySourceCounter.inc({
          queue: queueName,
          source: jobData.createdBy,
          source_type: 'createdBy',
          worker_id: this.workerId,
        });
      }

      // Track updatedBy source
      if (jobData?.updatedBy) {
        this.jobsBySourceCounter.inc({
          queue: queueName,
          source: jobData.updatedBy,
          source_type: 'updatedBy',
          worker_id: this.workerId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to track job metadata for queue ${queueName}:`,
        error,
      );
    }
  }

  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
