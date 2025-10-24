import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  InjectMetric,
  makeGaugeProvider,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';
import { Gauge, Counter } from 'prom-client';
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

export const queueMetricsProviders = [
  makeGaugeProvider({
    name: 'bullmq_queue_waiting_jobs',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_active_jobs',
    help: 'Number of jobs currently being processed',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_completed_jobs',
    help: 'Number of completed jobs',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_failed_jobs',
    help: 'Number of failed jobs',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_delayed_jobs',
    help: 'Number of delayed jobs',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_processing_rate',
    help: 'Queue processing rate (jobs per minute)',
    labelNames: ['queue'],
  }),
  makeGaugeProvider({
    name: 'bullmq_queue_avg_processing_time_ms',
    help: 'Average job processing time in milliseconds',
    labelNames: ['queue'],
  }),
  makeCounterProvider({
    name: 'bullmq_jobs_total',
    help: 'Total number of jobs processed',
    labelNames: ['queue', 'status'],
  }),
];

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  private updateInterval: NodeJS.Timeout;

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
  ) {}

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

    // Update metrics every 15 seconds (aligned with Prometheus scrape interval)
    this.updateInterval = setInterval(() => {
      this.updateMetrics().catch((error) => {
        console.error('Failed to update queue metrics:', error);
      });
    }, 15000);
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

        this.waitingGauge.set({ queue: name }, counts.waiting);
        this.activeGauge.set({ queue: name }, counts.active);
        this.completedGauge.set({ queue: name }, counts.completed);
        this.failedGauge.set({ queue: name }, counts.failed);
        this.delayedGauge.set({ queue: name }, counts.delayed);

        // Calculate processing rate
        const completedJobs = await queue.getCompleted(0, 99);
        const processingRate = await this.calculateProcessingRate(completedJobs);
        this.processingRateGauge.set({ queue: name }, processingRate);

        // Calculate average processing time
        const avgTime = await this.calculateAverageProcessingTime(completedJobs);
        this.avgProcessingTimeGauge.set({ queue: name }, avgTime);

        // Update total counters (these are cumulative)
        this.jobsTotalCounter.inc(
          { queue: name, status: 'completed' },
          counts.completed,
        );
        this.jobsTotalCounter.inc({ queue: name, status: 'failed' }, counts.failed);
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

  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
