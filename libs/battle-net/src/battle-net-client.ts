import { AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BattleNetRegion, BattleNetNamespace } from './enums';
import { BATTLE_NET_BASE_URLS, BATTLE_NET_TIMEOUT } from './constants';

export interface IBattleNetClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  region?: BattleNetRegion;
}

export interface IBattleNetQueryOptions {
  namespace: BattleNetNamespace | string;
  locale?: string;
  timeout?: number;
}

export interface IBattleNetRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: IBattleNetRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * BattleNetClient - Configuration holder passed to BattleNetService
 * Contains credentials and retry settings
 */
export class BattleNetClient {
  private _clientId: string;
  private _clientSecret: string;
  private _accessToken: string;
  private _region: BattleNetRegion;
  private _retryConfig: IBattleNetRetryConfig;

  constructor(config?: IBattleNetClientConfig, retryConfig?: IBattleNetRetryConfig) {
    this._clientId = config?.clientId ?? '';
    this._clientSecret = config?.clientSecret ?? '';
    this._accessToken = config?.accessToken ?? '';
    this._region = config?.region ?? BattleNetRegion.EU;
    this._retryConfig = retryConfig ?? DEFAULT_RETRY_CONFIG;
  }

  public configure(config: IBattleNetClientConfig): void {
    this._clientId = config.clientId;
    this._clientSecret = config.clientSecret;
    this._accessToken = config.accessToken ?? '';
    this._region = config.region ?? BattleNetRegion.EU;
  }

  public setToken(token: string): void {
    this._accessToken = token;
  }

  public setCredentials(clientId: string, clientSecret: string): void {
    this._clientId = clientId;
    this._clientSecret = clientSecret;
  }

  public setRegion(region: BattleNetRegion): void {
    this._region = region;
  }

  public setRetryConfig(retryConfig: IBattleNetRetryConfig): void {
    this._retryConfig = retryConfig;
  }

  public get clientId(): string {
    return this._clientId;
  }

  public get clientSecret(): string {
    return this._clientSecret;
  }

  public get accessToken(): string {
    return this._accessToken;
  }

  public get token(): string {
    return this._accessToken;
  }

  public get region(): BattleNetRegion {
    return this._region;
  }

  public get baseUrl(): string {
    return BATTLE_NET_BASE_URLS[this._region];
  }

  public get retryConfig(): IBattleNetRetryConfig {
    return this._retryConfig;
  }

  public buildHeaders(options: IBattleNetQueryOptions): AxiosHeaders {
    const headers = new AxiosHeaders();

    headers.set('Content-Type', 'application/json');

    if (this._accessToken) {
      headers.set('Authorization', `Bearer ${this._accessToken}`);
    }

    headers.set('Battlenet-Namespace', options.namespace);

    if (options.locale) {
      headers.set('Accept-Language', options.locale);
    }

    return headers;
  }
}
