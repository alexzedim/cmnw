export interface SetConcurrencyDto {
  worker: string;
  concurrency: number;
  replicas?: number;
}

export interface WorkerConfig {
  concurrency: string | null;
  replicas: string | null;
}

export type RefreshEndpoint = 'STATUS' | 'SUMMARY' | 'MEDIA' | 'PETS' | 'MOUNTS' | 'PROFESSIONS';

export interface IRefreshContext {
  sessionId: string;
  requestId?: string;
  guid?: string;
}
