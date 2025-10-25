import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { CharactersWorker, GuildsWorker, ProfileWorker } from '../workers';
import chalk from 'chalk';

@Injectable()
export class WorkerStatsListener implements OnModuleInit {
  private readonly logger = new Logger(WorkerStatsListener.name);
  private charactersQueueEvents: QueueEvents;
  private guildsQueueEvents: QueueEvents;
  private profileQueueEvents: QueueEvents;

  constructor(
    @InjectQueue(charactersQueue.name) private readonly charactersQueue: Queue,
    @InjectQueue(guildsQueue.name) private readonly guildsQueue: Queue,
    @InjectQueue(profileQueue.name) private readonly profileQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    private readonly charactersWorker: CharactersWorker,
    private readonly guildsWorker: GuildsWorker,
    private readonly profileWorker: ProfileWorker,
  ) {}

  onModuleInit() {
    this.setupCharactersQueueListener();
    this.setupGuildsQueueListener();
    this.setupProfileQueueListener();
    this.logger.log(chalk.green('✓ Worker stats listeners initialized'));
  }

  private setupCharactersQueueListener() {
    this.charactersQueueEvents = new QueueEvents(charactersQueue.name, {
      connection: this.charactersQueue.opts.connection,
    });

    this.charactersQueueEvents.on('drained', async () => {
      const counts = await this.charactersQueue.getJobCounts();

      // Only log summary if there are no more jobs
      if (counts.waiting === 0 && counts.active === 0) {
        this.logger.log(chalk.cyan('\n🏁 Characters queue drained - all jobs completed!'));
        this.charactersWorker.logFinalSummary();

        // Publish stats to Redis for API access
        await this.publishWorkerStats('characters', this.charactersWorker);
      }
    });
  }

  private setupGuildsQueueListener() {
    this.guildsQueueEvents = new QueueEvents(guildsQueue.name, {
      connection: this.guildsQueue.opts.connection,
    });

    this.guildsQueueEvents.on('drained', async () => {
      const counts = await this.guildsQueue.getJobCounts();

      // Only log summary if there are no more jobs
      if (counts.waiting === 0 && counts.active === 0) {
        this.logger.log(chalk.cyan('\n🏁 Guilds queue drained - all jobs completed!'));
        this.guildsWorker.logFinalSummary();

        // Publish stats to Redis for API access
        await this.publishWorkerStats('guilds', this.guildsWorker);
      }
    });
  }

  private async publishWorkerStats(workerName: string, worker: any) {
    try {
      const stats = (worker as any).stats;
      const statsData = {
        workerName,
        timestamp: new Date().toISOString(),
        ...stats,
        uptime: Date.now() - stats.startTime,
        successRate: stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0',
        rate: stats.total > 0 ? (stats.total / ((Date.now() - stats.startTime) / 1000)).toFixed(2) : '0.00',
      };

      // Store in Redis with 24h expiration
      await this.redis.setex(
        `worker:${workerName}:last-stats`,
        86400, // 24 hours
        JSON.stringify(statsData)
      );

      // Publish to Redis pub/sub for real-time updates
      await this.redis.publish(
        'worker:stats:update',
        JSON.stringify(statsData)
      );

      this.logger.log(chalk.dim(`📊 Published ${workerName} stats to Redis`));
    } catch (error) {
      this.logger.error(`Failed to publish stats for ${workerName}:`, error);
    }
  }

  private setupProfileQueueListener() {
    this.profileQueueEvents = new QueueEvents(profileQueue.name, {
      connection: this.profileQueue.opts.connection,
    });

    this.profileQueueEvents.on('drained', async () => {
      const counts = await this.profileQueue.getJobCounts();

      // Only log summary if there are no more jobs
      if (counts.waiting === 0 && counts.active === 0) {
        this.logger.log(chalk.cyan('\n🏁 Profile queue drained - all jobs completed!'));
        this.profileWorker.logFinalSummary();

        // Publish stats to Redis for API access
        await this.publishWorkerStats('profile', this.profileWorker);
      }
    });
  }
}
