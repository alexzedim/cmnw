import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { charactersQueue, guildsQueue, profileQueue } from '@app/resources';
import { CharactersWorker, GuildsWorker, ProfileWorker } from '../workers';
import chalk from 'chalk';

@Injectable()
export class WorkerStatsListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerStatsListener.name);
  private charactersQueueEvents: QueueEvents;
  private guildsQueueEvents: QueueEvents;
  private profileQueueEvents: QueueEvents;
  private isInitialized = false;

  constructor(
    @InjectQueue(charactersQueue.name) private readonly charactersQueue: Queue,
    @InjectQueue(guildsQueue.name) private readonly guildsQueue: Queue,
    @InjectQueue(profileQueue.name) private readonly profileQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    private readonly charactersWorker: CharactersWorker,
    private readonly guildsWorker: GuildsWorker,
    private readonly profileWorker: ProfileWorker,
  ) {}

  async onModuleInit() {
    try {
      // Initialize queue listeners asynchronously with timeout
      await Promise.race([
        this.initializeListeners(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Queue listeners initialization timeout')), 5000)
        ),
      ]);
      this.isInitialized = true;
      this.logger.log(chalk.green('✓ Worker stats listeners initialized'));
    } catch (error) {
      this.logger.warn(
        chalk.yellow('⚠ Failed to initialize worker stats listeners (non-critical):'),
        error.message
      );
      // Don't throw - allow app to start even if listeners fail
    }
  }

  async onModuleDestroy() {
    // Cleanup queue event listeners
    try {
      await Promise.all([
        this.charactersQueueEvents?.close(),
        this.guildsQueueEvents?.close(),
        this.profileQueueEvents?.close(),
      ]);
      this.logger.log(chalk.dim('Worker stats listeners closed'));
    } catch (error) {
      this.logger.error('Error closing queue event listeners:', error);
    }
  }

  private async initializeListeners() {
    await Promise.all([
      this.setupCharactersQueueListener(),
      this.setupGuildsQueueListener(),
      this.setupProfileQueueListener(),
    ]);
  }

  private async setupCharactersQueueListener() {
    try {
      this.charactersQueueEvents = new QueueEvents(charactersQueue.name, {
        connection: this.charactersQueue.opts.connection,
      });

      // Wait for connection to be ready
      await this.charactersQueueEvents.waitUntilReady();

      this.charactersQueueEvents.on('drained', async () => {
        try {
          const counts = await this.charactersQueue.getJobCounts();

          // Only log summary if there are no more jobs
          const isCondition = counts.waiting === 0 && counts.active === 0;
          if (isCondition) {
            this.logger.log(chalk.cyan('\n🏁 Characters queue drained - all jobs completed!'));
            this.charactersWorker.logFinalSummary();

            // Publish stats to Redis for API access
            await this.publishWorkerStats('characters', this.charactersWorker);
          }
        } catch (error) {
          this.logger.error('Error in characters queue drained handler:', error);
        }
      });

      this.charactersQueueEvents.on('error', (error) => {
        this.logger.error('Characters QueueEvents error:', error);
      });
    } catch (error) {
      this.logger.warn('Failed to setup characters queue listener:', error.message);
      throw error;
    }
  }

  private async setupGuildsQueueListener() {
    try {
      this.guildsQueueEvents = new QueueEvents(guildsQueue.name, {
        connection: this.guildsQueue.opts.connection,
      });

      // Wait for connection to be ready
      await this.guildsQueueEvents.waitUntilReady();

      this.guildsQueueEvents.on('drained', async () => {
        try {
          const counts = await this.guildsQueue.getJobCounts();

          // Only log summary if there are no more jobs
          const isCondition = counts.waiting === 0 && counts.active === 0;
          if (isCondition) {
            this.logger.log(chalk.cyan('\n🏁 Guilds queue drained - all jobs completed!'));
            this.guildsWorker.logFinalSummary();

            // Publish stats to Redis for API access
            await this.publishWorkerStats('guilds', this.guildsWorker);
          }
        } catch (error) {
          this.logger.error('Error in guilds queue drained handler:', error);
        }
      });

      this.guildsQueueEvents.on('error', (error) => {
        this.logger.error('Guilds QueueEvents error:', error);
      });
    } catch (error) {
      this.logger.warn('Failed to setup guilds queue listener:', error.message);
      throw error;
    }
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

  private async setupProfileQueueListener() {
    try {
      this.profileQueueEvents = new QueueEvents(profileQueue.name, {
        connection: this.profileQueue.opts.connection,
      });

      // Wait for connection to be ready
      await this.profileQueueEvents.waitUntilReady();

      this.profileQueueEvents.on('drained', async () => {
        try {
          const counts = await this.profileQueue.getJobCounts();

          // Only log summary if there are no more jobs
          const isCondition = counts.waiting === 0 && counts.active === 0;
          if (isCondition) {
            this.logger.log(chalk.cyan('\n🏁 Profile queue drained - all jobs completed!'));
            this.profileWorker.logFinalSummary();

            // Publish stats to Redis for API access
            await this.publishWorkerStats('profile', this.profileWorker);
          }
        } catch (error) {
          this.logger.error('Error in profile queue drained handler:', error);
        }
      });

      this.profileQueueEvents.on('error', (error) => {
        this.logger.error('Profile QueueEvents error:', error);
      });
    } catch (error) {
      this.logger.warn('Failed to setup profile queue listener:', error.message);
      throw error;
    }
  }
}
