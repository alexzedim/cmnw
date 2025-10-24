import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
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
import {
  IAllQueuesStats,
  IJobCounts,
  IQueueDetailedProgress,
  IQueueStats,
} from './types/queue-monitor.types';

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name, {
    timestamp: true,
  });

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

  async getAllQueuesStats(): Promise<IAllQueuesStats> {
    const queuesStats: IQueueStats[] = [];
    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const { name, queue } of this.allQueues) {
      try {
        const stats = await this.getQueueStats(name, queue);
        queuesStats.push(stats);

        totalWaiting += stats.counts.waiting;
        totalActive += stats.counts.active;
        totalCompleted += stats.counts.completed;
        totalFailed += stats.counts.failed;
      } catch (error) {
        this.logger.error(`Failed to get stats for queue ${name}:`, error);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      queues: queuesStats,
      totalWaiting,
      totalActive,
      totalCompleted,
      totalFailed,
    };
  }

  async getQueueStats(queueName: string, queue: Queue): Promise<IQueueStats> {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );

    const activeJobs = await queue.getActive();
    const activeJobsProgress = await Promise.all(
      activeJobs.slice(0, 10).map(async (job) => ({
        jobId: job.id!,
        name: job.name,
        progress: await job.progress(),
        timestamp: job.timestamp,
      })),
    );

    // Calculate processing rate (jobs per minute)
    const completedJobs = await queue.getCompleted(0, 99);
    const processingRate = await this.calculateProcessingRate(completedJobs);
    const averageProcessingTime = await this.calculateAverageProcessingTime(
      completedJobs,
    );

    let estimatedCompletion: string | undefined;
    const isActiveProcessing = counts.active > 0 && processingRate > 0;
    if (isActiveProcessing) {
      const minutesRemaining = counts.waiting / processingRate;
      estimatedCompletion = this.formatDuration(minutesRemaining * 60 * 1000);
    }

    return {
      queueName,
      counts: counts as IJobCounts,
      activeJobs: activeJobsProgress,
      estimatedCompletion,
      processingRate,
      averageProcessingTime,
    };
  }

  async getQueueDetailedProgress(
    queueName: string,
  ): Promise<IQueueDetailedProgress> {
    const queue = this.allQueues.find((q) => q.name === queueName)?.queue;
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
    );

    const total = counts.waiting + counts.active + counts.completed;
    const current = counts.completed;
    const completionPercentage =
      total > 0 ? Math.round((current / total) * 100) : 0;

    const activeJobs = await queue.getActive();
    const waitingJobs = await queue.getWaiting(0, 10);
    const allJobs = [...activeJobs, ...waitingJobs.slice(0, 10)];

    const jobsDetails = await Promise.all(
      allJobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id!,
          name: job.name,
          progress: (await job.progress()) as number,
          state,
          timestamp: job.timestamp,
          attemptsMade: job.attemptsMade,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        };
      }),
    );

    // Calculate estimated time remaining
    let estimatedTimeRemaining: string | undefined;
    const completedJobs = await queue.getCompleted(0, 99);
    const processingRate = await this.calculateProcessingRate(completedJobs);

    const isRateCalculable = processingRate > 0 && counts.waiting > 0;
    if (isRateCalculable) {
      const minutesRemaining = counts.waiting / processingRate;
      estimatedTimeRemaining = this.formatDuration(minutesRemaining * 60 * 1000);
    }

    return {
      queueName,
      current,
      total,
      completionPercentage,
      estimatedTimeRemaining,
      activeWorkers: counts.active,
      jobs: jobsDetails,
    };
  }

  private async calculateProcessingRate(
    completedJobs: Job[],
  ): Promise<number> {
    const recentJobs = completedJobs.filter((job) => {
      const isJobFinished = job.finishedOn !== undefined;
      if (!isJobFinished) return false;

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return job.finishedOn! > fiveMinutesAgo;
    });

    const isNoRecentJobs = recentJobs.length === 0;
    if (isNoRecentJobs) return 0;

    // Jobs per minute
    return (recentJobs.length / 5) || 0;
  }

  private async calculateAverageProcessingTime(
    completedJobs: Job[],
  ): Promise<number> {
    const jobsWithTimes = completedJobs.filter(
      (job) => job.processedOn && job.finishedOn,
    );

    const isNoJobsWithTimes = jobsWithTimes.length === 0;
    if (isNoJobsWithTimes) return 0;

    const totalTime = jobsWithTimes.reduce((sum, job) => {
      return sum + (job.finishedOn! - job.processedOn!);
    }, 0);

    return totalTime / jobsWithTimes.length;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.allQueues.find((q) => q.name === queueName)?.queue;
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.allQueues.find((q) => q.name === queueName)?.queue;
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.resume();
  }
}
