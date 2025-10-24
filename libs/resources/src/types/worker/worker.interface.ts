export interface SetConcurrencyDto {
  worker: string;
  concurrency: number;
  replicas?: number;
}

export interface WorkerConfig {
  concurrency: string | null;
  replicas: string | null;
}
