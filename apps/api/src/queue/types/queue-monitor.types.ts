export interface IJobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface IJobProgress {
  jobId: string;
  name: string;
  progress: number;
  data?: any;
  timestamp?: number;
}

export interface IQueueStats {
  queueName: string;
  counts: IJobCounts;
  activeJobs: IJobProgress[];
  estimatedCompletion?: string;
  processingRate?: number;
  averageProcessingTime?: number;
}

export interface IAllQueuesStats {
  timestamp: string;
  queues: IQueueStats[];
  totalWaiting: number;
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
}

export interface IQueueDetailedProgress {
  queueName: string;
  current: number;
  total: number;
  completionPercentage: number;
  estimatedTimeRemaining?: string;
  activeWorkers: number;
  jobs: Array<{
    id: string;
    name: string;
    progress: number;
    state: string;
    timestamp: number;
    attemptsMade: number;
    processedOn?: number;
    finishedOn?: number;
  }>;
}
