import { IWorkerConfig } from '@app/configuration/interfaces';
import { hostname } from 'os';

const getWorkerId = (): string => {
  // Check for explicit WORKER_ID env var
  if (process.env.WORKER_ID?.trim()) {
    return process.env.WORKER_ID.trim();
  }

  // Check for HOSTNAME env var (Docker container ID)
  if (process.env.HOSTNAME?.trim()) {
    return process.env.HOSTNAME.trim();
  }

  // Use system hostname
  const systemHostname = hostname();
  if (systemHostname && systemHostname.trim()) {
    return systemHostname.trim();
  }

  // Fallback to process ID
  return `worker-${process.pid}`;
};

export const workerConfig: IWorkerConfig = {
  workerId: getWorkerId(),
};
