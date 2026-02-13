import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
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

  private readonly queueNames = [
    'dma.auctions',
    'osint.characters',
    'osint.guilds',
    'core.realms',
    'dma.items',
    'dma.valuations',
    'osint.profiles',
  ];

  private readonly workerQueueMap: Record<string, string> = {
    characters: 'osint.characters',
    guilds: 'osint.guilds',
    profile: 'osint.profiles',
    items: 'dma.items',
    auctions: 'dma.auctions',
    realms: 'core.realms',
  };

  constructor(
    @InjectQueue('dma.auctions') private readonly dmaAuctionsQueue: Queue,
    @InjectQueue('osint.characters')
    private readonly osintCharactersQueue: Queue,
    @InjectQueue('osint.guilds') private readonly osintGuildsQueue: Queue,
    @InjectQueue('core.realms') private readonly coreRealmsQueue: Queue,
    @InjectQueue('dma.items') private readonly dmaItemsQueue: Queue,
    @InjectQueue('dma.valuations') private readonly dmaValuationsQueue: Queue,
    @InjectQueue('osint.profiles') private readonly osintProfilesQueue: Queue,
  ) {}

  private getQueueByName(queueName: string): Queue | undefined {
    switch (queueName) {
      case 'dma.auctions':
        return this.dmaAuctionsQueue;
      case 'osint.characters':
        return this.osintCharactersQueue;
      case 'osint.guilds':
        return this.osintGuildsQueue;
      case 'core.realms':
        return this.coreRealmsQueue;
      case 'dma.items':
        return this.dmaItemsQueue;
      case 'dma.valuations':
        return this.dmaValuationsQueue;
      case 'osint.profiles':
        return this.osintProfilesQueue;
      default:
        return undefined;
    }
  }

  private getEmptyQueueStats(queueName: string): IQueueStats {
    return {
      queueName,
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      },
      activeJobs: [],
      estimatedCompletion: undefined,
      processingRate: 0,
      averageProcessingTime: 0,
    };
  }

  async getAllQueuesStats(): Promise<IAllQueuesStats> {
    const queuesStats: IQueueStats[] = [];
    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const queueName of this.queueNames) {
      try {
        const stats = await this.getQueueStats(queueName);
        queuesStats.push(stats);

        totalWaiting += stats.counts.waiting;
        totalActive += stats.counts.active;
        totalCompleted += stats.counts.completed;
        totalFailed += stats.counts.failed;
      } catch (error) {
        this.logger.error(`Failed to get stats for queue ${queueName}:`, error);
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

  async getQueueStats(queueName: string): Promise<IQueueStats> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      this.logger.warn(`Queue not found: ${queueName}`);
      return this.getEmptyQueueStats(queueName);
    }

    const [waiting, active, completed, delayed, failed, paused] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getDelayedCount(),
        queue.getFailedCount(),
        queue.isPaused().then((p) => (p ? 1 : 0)),
      ]);

    const counts: IJobCounts = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };

    return {
      queueName,
      counts,
      activeJobs: [], // BullMQ doesn't provide active job details easily
      estimatedCompletion: undefined,
      processingRate: 0,
      averageProcessingTime: 0,
    };
  }

  async getQueueDetailedProgress(
    queueName: string,
  ): Promise<IQueueDetailedProgress> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      this.logger.warn(`Queue not found: ${queueName}`);
      return {
        queueName,
        current: 0,
        total: 0,
        completionPercentage: 0,
        estimatedTimeRemaining: undefined,
        activeWorkers: 0,
        jobs: [],
      };
    }

    const [waiting, active, completed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
    ]);

    const total = waiting + active + completed;
    const current = completed;
    const completionPercentage =
      total > 0 ? Math.round((current / total) * 100) : 0;

    return {
      queueName,
      current,
      total,
      completionPercentage,
      estimatedTimeRemaining: undefined,
      activeWorkers: active,
      jobs: [],
    };
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
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      this.logger.warn(`Queue not found: ${queueName}`);
      return;
    }
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      this.logger.warn(`Queue not found: ${queueName}`);
      return;
    }
    await queue.resume();
  }

  async getWorkerStats(workerName: string): Promise<any> {
    const queueName = this.workerQueueMap[workerName];
    if (!queueName) {
      return {
        workerName,
        message: 'No queue mapping available for this worker',
        timestamp: new Date().toISOString(),
      };
    }

    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return {
        workerName,
        queueName,
        message: 'Queue stats unavailable',
        timestamp: new Date().toISOString(),
      };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      workerName,
      queueName,
      timestamp: new Date().toISOString(),
      consumers: active,
      depth: waiting,
      processingRate: 0,
      averageProcessingTime: 0,
    };
  }

  async getAllWorkerStats(): Promise<any[]> {
    const workerNames = Object.keys(this.workerQueueMap);
    const statsPromises = workerNames.map((name) => this.getWorkerStats(name));
    return Promise.all(statsPromises);
  }
}
