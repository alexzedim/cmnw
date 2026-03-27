import { BattleNetRegion } from './enums';

export interface IBattleNetClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  region?: BattleNetRegion;
}

export interface IBattleNetQueryOptions {
  namespace: string;
  locale?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface IBattleNetRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export const DEFAULT_RETRY_CONFIG: IBattleNetRetryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 60000,
};
