export interface IQueueConfig {
  name: string;
  defaultJobOptions?: {
    removeOnComplete?: number;
    removeOnFail?: number;
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    delay?: number;
    priority?: number;
  };
  workerOptions?: {
    concurrency?: number;
    limiter?: {
      max: number;
      duration: number;
    };
  };
}
