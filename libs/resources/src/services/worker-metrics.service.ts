import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

/**
 * Service for tracking worker job metrics.
 * Should be injected into workers to track job completions/failures.
 */
@Injectable()
export class WorkerMetricsService {
  constructor(
    @InjectMetric('bullmq_jobs_total')
    private readonly jobsTotalCounter: Counter<string>,
  ) {}

  /**
   * Increment completed jobs counter
   */
  incrementCompleted(queue: string, workerId: string): void {
    this.jobsTotalCounter.inc({
      queue,
      status: 'completed',
      worker_id: workerId,
    });
  }

  /**
   * Increment failed jobs counter
   */
  incrementFailed(queue: string, workerId: string): void {
    this.jobsTotalCounter.inc({
      queue,
      status: 'failed',
      worker_id: workerId,
    });
  }

  /**
   * Increment counter for any status
   */
  increment(
    queue: string,
    status: 'completed' | 'failed',
    workerId: string,
  ): void {
    this.jobsTotalCounter.inc({
      queue,
      status,
      worker_id: workerId,
    });
  }
}
