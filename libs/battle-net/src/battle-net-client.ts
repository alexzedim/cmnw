import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
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

@Injectable()
export class BattleNetClient {
  private _clientId: string;
  private _clientSecret: string;
  private _accessToken: string;
  private _region: BattleNetRegion;

  constructor(private readonly httpService: HttpService) {
    this._clientId = '';
    this._clientSecret = '';
    this._accessToken = '';
    this._region = BattleNetRegion.EU;
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

  public get token(): string {
    return this._accessToken;
  }

  public get region(): BattleNetRegion {
    return this._region;
  }

  public get baseUrl(): string {
    return BATTLE_NET_BASE_URLS[this._region];
  }

  private buildHeaders(options: IBattleNetQueryOptions): AxiosHeaders {
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

  public async query<T>(path: string, options: IBattleNetQueryOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? BATTLE_NET_TIMEOUT,
    };

    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.get<T>(`${this.baseUrl}${path}`, config),
    );

    return response.data;
  }

  public async get<T>(path: string, options: IBattleNetQueryOptions): Promise<T> {
    return this.query<T>(path, options);
  }

  public async post<T>(path: string, data: unknown, options: IBattleNetQueryOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? BATTLE_NET_TIMEOUT,
    };

    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.post<T>(`${this.baseUrl}${path}`, data, config),
    );

    return response.data;
  }
}
