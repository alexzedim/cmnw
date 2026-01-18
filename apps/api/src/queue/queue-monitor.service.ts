import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQMonitorService } from '@app/rabbitmq';
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

  constructor(private readonly rabbitMQMonitorService: RabbitMQMonitorService) {}

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
    // Get queue stats from RabbitMQ monitor service
    const queueStats = await this.rabbitMQMonitorService.getQueueStats(queueName);
    if (!queueStats) {
      this.logger.warn(`Queue stats unavailable for ${queueName}`);
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

    const counts: IJobCounts = {
      waiting: queueStats.waiting || 0,
      active: queueStats.active || 0,
      completed: queueStats.completed || 0,
      failed: queueStats.failed || 0,
      delayed: 0, // RabbitMQ doesn't have delayed state like BullMQ
      paused: 0, // RabbitMQ doesn't have paused state like BullMQ
    };

    const processingRate = queueStats.processingRate ?? 0;
    const averageProcessingTime = queueStats.avgProcessingTime ?? 0;

    let estimatedCompletion: string | undefined;
    const isActiveProcessing = counts.active > 0 && processingRate > 0;
    if (isActiveProcessing) {
      const minutesRemaining = counts.waiting / processingRate;
      estimatedCompletion = this.formatDuration(minutesRemaining * 60 * 1000);
    }

    return {
      queueName,
      counts,
      activeJobs: queueStats.activeJobs || [],
      estimatedCompletion,
      processingRate,
      averageProcessingTime,
    };
  }

  async getQueueDetailedProgress(
    queueName: string,
  ): Promise<IQueueDetailedProgress> {
    const queueStats = await this.rabbitMQMonitorService.getQueueStats(queueName);
    if (!queueStats) {
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

    const counts = {
      waiting: queueStats.waiting || 0,
      active: queueStats.active || 0,
      completed: queueStats.completed || 0,
      failed: queueStats.failed || 0,
    };

    const total = counts.waiting + counts.active + counts.completed;
    const current = counts.completed;
    const completionPercentage = total > 0 ? Math.round((current / total) * 100) : 0;

    // Calculate estimated time remaining
    let estimatedTimeRemaining: string | undefined;
    const processingRate = queueStats.processingRate ?? 0;

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
      jobs: queueStats.activeJobs || [],
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
    // RabbitMQ doesn't have a pause concept like BullMQ
    // Instead, we can stop consumers for this queue
    await this.rabbitMQMonitorService.pauseQueue(queueName);
  }

  async resumeQueue(queueName: string): Promise<void> {
    // Resume consumers for this queue
    await this.rabbitMQMonitorService.resumeQueue(queueName);
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

    const stats = await this.rabbitMQMonitorService.getQueueStats(queueName);
    if (!stats) {
      return {
        workerName,
        queueName,
        message: 'Queue stats unavailable',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      workerName,
      queueName,
      timestamp: new Date().toISOString(),
      consumers: stats.consumerCount,
      depth: stats.messageCount,
      processingRate: stats.processingRate ?? 0,
      averageProcessingTime: stats.avgProcessingTime ?? 0,
    };
  }

  async getAllWorkerStats(): Promise<any[]> {
    const workerNames = Object.keys(this.workerQueueMap);
    const statsPromises = workerNames.map((name) => this.getWorkerStats(name));
    return Promise.all(statsPromises);
  }
}
