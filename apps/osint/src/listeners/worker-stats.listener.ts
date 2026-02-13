import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { CharactersWorker, GuildsWorker, ProfileWorker } from '../workers';
import chalk from 'chalk';

@Injectable()
export class WorkerStatsListener implements OnModuleInit {
  private readonly logger = new Logger(WorkerStatsListener.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectQueue('osint.characters') private readonly charactersQueue: Queue,
    @InjectQueue('osint.guilds') private readonly guildsQueue: Queue,
    @InjectQueue('osint.profiles') private readonly profilesQueue: Queue,
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
    // Monitor characters queue via BullMQ
    this.charactersQueue.on('drained' as any, async () => {
      this.logger.log(
        chalk.cyan('\n🏁 Characters queue drained - all jobs completed!'),
      );
      this.charactersWorker.logFinalSummary();

      // Publish stats to Redis for API access
      await this.publishWorkerStats('characters', this.charactersWorker);
    });
  }

  private setupGuildsQueueListener() {
    // Monitor guilds queue via BullMQ
    this.guildsQueue.on('drained' as any, async () => {
      this.logger.log(
        chalk.cyan('\n🏁 Guilds queue drained - all jobs completed!'),
      );
      this.guildsWorker.logFinalSummary();

      // Publish stats to Redis for API access
      await this.publishWorkerStats('guilds', this.guildsWorker);
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
        successRate:
          stats.total > 0
            ? ((stats.success / stats.total) * 100).toFixed(1)
            : '0.0',
        rate:
          stats.total > 0
            ? (stats.total / ((Date.now() - stats.startTime) / 1000)).toFixed(2)
            : '0.00',
      };

      // Store in Redis with 24h expiration
      await this.redis.setex(
        `worker:${workerName}:last-stats`,
        86400, // 24 hours
        JSON.stringify(statsData),
      );

      // Publish to Redis pub/sub for real-time updates
      await this.redis.publish(
        'worker:stats:update',
        JSON.stringify(statsData),
      );

      this.logger.log(chalk.dim(`📊 Published ${workerName} stats to Redis`));
    } catch (error) {
      this.logger.error(`Failed to publish stats for ${workerName}:`, error);
    }
  }

  private setupProfileQueueListener() {
    // Monitor profile queue via BullMQ
    this.profilesQueue.on('drained' as any, async () => {
      this.logger.log(
        chalk.cyan('\n🏁 Profile queue drained - all jobs completed!'),
      );
      this.profileWorker.logFinalSummary();

      // Publish stats to Redis for API access
      await this.publishWorkerStats('profile', this.profileWorker);
    });
  }
}
