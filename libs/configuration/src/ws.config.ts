import type { IWsConfig } from '@app/configuration/interfaces';

export const wsConfig: IWsConfig = {
  path: '/api/ws/feed',
  channel: 'cmnw:feed',
};
