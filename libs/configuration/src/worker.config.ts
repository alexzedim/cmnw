import { IWorkerConfig } from '@app/configuration/interfaces';
import { hostname } from 'os';

export const workerConfig: IWorkerConfig = {
  workerId:
    process.env.WORKER_ID ||
    process.env.HOSTNAME ||
    hostname() ||
    `worker-${process.pid}`,
};
