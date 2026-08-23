import { formatFinalSummary, formatWorkerErrorLog, type WorkerStats } from '@app/logger';
import { hashQueue, type IHashMessageBase } from '@app/resources';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { HashBlockService } from '../services';

@Injectable()
@Processor(hashQueue.name, hashQueue.workerOptions)
export class HashWorker extends WorkerHost {
  private readonly logger = new Logger(HashWorker.name, { timestamp: true });

  private stats: WorkerStats = {
    total: 0,
    success: 0,
    errors: 0,
    notFound: 0,
    skipped: 0,
    startTime: Date.now(),
  };

  constructor(private readonly hashBlockService: HashBlockService) {
    super();
  }

  public async process(job: Job<IHashMessageBase>): Promise<void> {
    const { characterGuid, scannedAt } = job.data;
    const startedAt = Date.now();
    this.stats.total++;

    try {
      await this.hashBlockService.reconcileCharacter(characterGuid, scannedAt);
      this.stats.success++;
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startedAt;
      const error = errorOrException instanceof Error ? errorOrException.message : String(errorOrException);
      this.logger.error(formatWorkerErrorLog(this.stats.total, characterGuid, duration, error, 'HASH'));
      throw errorOrException;
    }
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('HashWorker', this.stats, 'hash'));
  }
}
