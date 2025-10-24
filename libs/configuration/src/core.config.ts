import { ICoreConfig } from '@app/configuration/interfaces';

export const coreConfig: ICoreConfig = {
  useProxy: process.env.KEYS_USE_PROXY === 'true',
};
