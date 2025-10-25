import { Controller, Get, Param, Post } from '@nestjs/common';
import { QueueMonitorService } from './queue-monitor.service';
import {
  IAllQueuesStats,
  IQueueDetailedProgress,
} from './types/queue-monitor.types';

@Controller('queue-monitor')
export class QueueMonitorController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  @Get('stats')
  async getAllQueuesStats(): Promise<IAllQueuesStats> {
    return this.queueMonitorService.getAllQueuesStats();
  }

  @Get('stats/:queueName')
  async getQueueDetailedProgress(
    @Param('queueName') queueName: string,
  ): Promise<IQueueDetailedProgress> {
    return this.queueMonitorService.getQueueDetailedProgress(queueName);
  }

  @Post('pause/:queueName')
  async pauseQueue(@Param('queueName') queueName: string): Promise<void> {
    return this.queueMonitorService.pauseQueue(queueName);
  }

  @Post('resume/:queueName')
  async resumeQueue(@Param('queueName') queueName: string): Promise<void> {
    return this.queueMonitorService.resumeQueue(queueName);
  }

  @Get('worker-stats')
  async getAllWorkerStats(): Promise<any[]> {
    return this.queueMonitorService.getAllWorkerStats();
  }

  @Get('worker-stats/:workerName')
  async getWorkerStats(@Param('workerName') workerName: string): Promise<any> {
    return this.queueMonitorService.getWorkerStats(workerName);
  }
}
