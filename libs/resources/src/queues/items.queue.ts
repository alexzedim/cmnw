import { JobsOptions } from 'bullmq';
import { IQueue } from '../../src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const itemsQueue: IQueue = {
  name: 'DMA_Items',
  workerOptions: {
    concurrency: parseInt(process.env.ITEMS_WORKER_CONCURRENCY || '3', 10),
  },
  defaultJobOptions: options,
};
