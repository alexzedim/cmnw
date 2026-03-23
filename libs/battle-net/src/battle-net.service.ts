import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosRequestConfig, AxiosResponse, AxiosHeaders } from 'axios';
import { Observable, throwError, timer, lastValueFrom } from 'rxjs';
import { finalize, map, mergeMap, retryWhen, timeout } from 'rxjs/operators';
import { IBattleNetClientConfig, IBattleNetQueryOptions, IBattleNetRetryConfig, DEFAULT_RETRY_CONFIG } from './types';
import { BattleNetRegion } from './enums';
import { BATTLE_NET_BASE_URLS } from './constants';
import { KeysEntity } from '@app/pg';
import { battleNetConfig, IBattleNetKeyHealthConfig } from '@app/configuration';

@Injectable()
export class BattleNetService {
  private readonly logger = new Logger(BattleNetService.name, { timestamp: true });
  private readonly keyHealth: IBattleNetKeyHealthConfig;
  private _currentKeyUuid: string | null = null;
  private _config: IBattleNetClientConfig | null = null;

  get currentKeyUuid(): string | null {
    return this._currentKeyUuid;
  }

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {
    this.keyHealth = battleNetConfig;
  }

  async initialize(tag?: string): Promise<void> {
    const key = await this.getAvailableKey(tag);
    if (!key) {
      throw new Error(`No available Battle.net key found${tag ? ` for tag '${tag}'` : ''}`);
    }

    this._currentKeyUuid = key.uuid;
    this._config = {
      clientId: key.clientId,
      clientSecret: key.clientSecret,
      accessToken: key.accessToken,
      region: BattleNetRegion.EU,
    };
  }

  async getKeyCooldownMs(keyUuid: string): Promise<number> {
    const key = await this.keysRepository.findOne({ where: { uuid: keyUuid } });
    if (!key || key.cooldownDelaySeconds === 0 || !key.lastFailureAt) {
      return 0;
    }
    const cooldownEnd = new Date(key.lastFailureAt.getTime() + key.cooldownDelaySeconds * 1000);
    const now = new Date();
    return Math.max(0, cooldownEnd.getTime() - now.getTime());
  }

  async shouldWaitForKey(keyUuid: string): Promise<{ wait: boolean; remainingMs: number }> {
    const remainingMs = await this.getKeyCooldownMs(keyUuid);
    return { wait: remainingMs > 0, remainingMs };
  }

  private calculateNewCooldown(currentCooldown: number, isRateLimit: boolean): number {
    if (isRateLimit) {
      return Math.min(this.keyHealth.maxDelay, currentCooldown * this.keyHealth.multiplier + this.keyHealth.baseDelay);
    }
    return Math.max(0, currentCooldown - this.keyHealth.decayStep);
  }

  private async recordKeyFailure(keyUuid: string, isRateLimit: boolean): Promise<number> {
    const key = await this.keysRepository.findOne({ where: { uuid: keyUuid } });
    if (!key) throw new NotFoundException(`Key ${keyUuid} not found`);

    const newCooldown = this.calculateNewCooldown(key.cooldownDelaySeconds, isRateLimit);
    key.cooldownDelaySeconds = newCooldown;
    key.lastFailureAt = new Date();

    await this.keysRepository.save(key);
    this.logger.warn(`${isRateLimit ? 'Rate limited' : 'Error'}: ${keyUuid} | cooldown: ${newCooldown}s`);
    return newCooldown;
  }

  async recordKeyRateLimit(keyUuid?: string): Promise<number> {
    const resolvedKeyUuid = keyUuid ?? this._currentKeyUuid;
    if (!resolvedKeyUuid) {
      throw new NotFoundException('No keyUuid provided and no current key is set');
    }
    return this.recordKeyFailure(resolvedKeyUuid, true);
  }

  async recordKeyError(keyUuid?: string): Promise<number> {
    const resolvedKeyUuid = keyUuid ?? this._currentKeyUuid;
    if (!resolvedKeyUuid) {
      throw new NotFoundException('No keyUuid provided and no current key is set');
    }
    return this.recordKeyFailure(resolvedKeyUuid, false);
  }

  async recordKeySuccess(keyUuid?: string): Promise<number> {
    const resolvedKeyUuid = keyUuid ?? this._currentKeyUuid;
    if (!resolvedKeyUuid) {
      throw new NotFoundException('No keyUuid provided and no current key is set');
    }

    const key = await this.keysRepository.findOne({ where: { uuid: resolvedKeyUuid } });
    if (!key) throw new NotFoundException(`Key ${resolvedKeyUuid} not found`);

    const newCooldown = Math.max(0, key.cooldownDelaySeconds - this.keyHealth.decayStep);
    key.cooldownDelaySeconds = newCooldown;

    await this.keysRepository.save(key);
    return newCooldown;
  }

  async refreshKeyToken(keyUuid: string): Promise<string> {
    const key = await this.keysRepository.findOne({ where: { uuid: keyUuid } });
    if (!key) throw new NotFoundException(`Key ${keyUuid} not found`);

    const response = await this.httpService.axiosRef.post(
      'https://oauth.battle.net/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: { username: key.clientId, password: key.clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    key.accessToken = response.data.access_token;
    key.expiredIn = response.data.expires_in;

    await this.keysRepository.save(key);

    this.logger.log(`Token refreshed for key ${keyUuid}`);
    return key.accessToken;
  }

  async resetKeyHealth(keyUuid: string): Promise<void> {
    await this.keysRepository.update(keyUuid, {
      cooldownDelaySeconds: 0,
      lastFailureAt: null,
    });
    this.logger.log(`Key health reset: ${keyUuid}`);
  }

  async getAvailableKey(tag?: string): Promise<KeysEntity | null> {
    const keys = await this.keysRepository.find({});

    if (keys.length === 0) {
      return null;
    }

    const now = new Date();

    let availableKeys = keys.filter((key) => {
      if (key.cooldownDelaySeconds === 0 || !key.lastFailureAt) {
        return true;
      }
      const cooldownEnd = new Date(key.lastFailureAt.getTime() + key.cooldownDelaySeconds * 1000);
      return cooldownEnd <= now;
    });

    if (tag) {
      availableKeys = availableKeys.filter((key) => key.tags && key.tags.includes(tag));
    }

    if (availableKeys.length === 0) {
      return null;
    }

    availableKeys.sort((a, b) => a.cooldownDelaySeconds - b.cooldownDelaySeconds);

    return availableKeys[0];
  }

  async getAllKeys(tags?: string[]): Promise<KeysEntity[]> {
    const keys = await this.keysRepository.find({});

    if (keys.length === 0) {
      return [];
    }

    const now = new Date();

    let filteredKeys = keys;

    if (tags && tags.length > 0) {
      filteredKeys = filteredKeys.filter((key) => key.tags && tags.some((tag) => key.tags.includes(tag)));
    }

    return filteredKeys.sort((a, b) => {
      const getEffectiveCooldown = (key: KeysEntity): number => {
        if (key.cooldownDelaySeconds === 0 || !key.lastFailureAt) {
          return 0;
        }
        const cooldownEnd = new Date(key.lastFailureAt.getTime() + key.cooldownDelaySeconds * 1000);
        return cooldownEnd > now ? key.cooldownDelaySeconds : 0;
      };

      return getEffectiveCooldown(a) - getEffectiveCooldown(b);
    });
  }

  private shouldRetryRequest(error: any): boolean {
    if (!error.response) {
      return true;
    }
    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  private createRetryLogic(
    errors: Observable<any>,
    url: string,
    method: string,
    retrySettings: Required<IBattleNetRetryConfig>,
  ): Observable<any> {
    let attemptCount = 0;

    return errors.pipe(
      mergeMap((error) => {
        attemptCount++;

        if (attemptCount > retrySettings.maxRetries || !this.shouldRetryRequest(error)) {
          this.logger.error(
            `${method} request failed permanently after ${attemptCount} attempts for ${url}. Error: ${error.message}`,
          );
          return throwError(() => error);
        }

        this.logger.warn(
          `${method} request failed (attempt ${attemptCount}/${retrySettings.maxRetries + 1}) for ${url}. ` +
            `Retrying in ${retrySettings.retryDelayMs}ms. Error: ${error.message}`,
        );

        return timer(retrySettings.retryDelayMs);
      }),
    );
  }

  private buildHeaders(config: IBattleNetClientConfig, options: IBattleNetQueryOptions): AxiosHeaders {
    const headers = new AxiosHeaders();

    headers.set('Content-Type', 'application/json');

    if (config.accessToken) {
      headers.set('Authorization', `Bearer ${config.accessToken}`);
    }

    headers.set('Battlenet-Namespace', options.namespace);

    if (options.locale) {
      headers.set('Accept-Language', options.locale);
    }

    return headers;
  }

  private getBaseUrl(region: BattleNetRegion): string {
    return BATTLE_NET_BASE_URLS[region];
  }

  private makeRequest<T>(
    request$: Observable<AxiosResponse<T>>,
    method: string,
    config: IBattleNetClientConfig,
  ): Promise<T> {
    const retrySettings: Required<IBattleNetRetryConfig> = {
      ...DEFAULT_RETRY_CONFIG,
    };

    const url = this.getBaseUrl(config.region);

    const requestObservable$ = request$.pipe(
      timeout(retrySettings.timeoutMs),
      map((response: AxiosResponse<T>) => response.data),
      retryWhen((errors) => this.createRetryLogic(errors, url, method, retrySettings)),
      finalize(() => {
        this.logger.debug(`Request completed for ${method} ${url}`);
      }),
    );

    return lastValueFrom(requestObservable$);
  }

  public async query<T>(path: string, options: IBattleNetQueryOptions, config?: IBattleNetClientConfig): Promise<T> {
    const resolvedConfig = config ?? this._config;
    if (!resolvedConfig) {
      throw new Error('BattleNetService not initialized. Call initialize() first.');
    }

    const headers = this.buildHeaders(resolvedConfig, options);

    return this.makeRequest(
      this.httpService.get<T>(`${this.getBaseUrl(resolvedConfig.region)}${path}`, {
        headers,
        timeout: options.timeout,
      }),
      'GET',
      resolvedConfig,
    );
  }

  public async post<T>(
    path: string,
    data: unknown,
    options: IBattleNetQueryOptions,
    config?: IBattleNetClientConfig,
  ): Promise<T> {
    const resolvedConfig = config ?? this._config;
    if (!resolvedConfig) {
      throw new Error('BattleNetService not initialized. Call initialize() first.');
    }

    const headers = this.buildHeaders(resolvedConfig, options);

    return this.makeRequest(
      this.httpService.post<T>(`${this.getBaseUrl(resolvedConfig.region)}${path}`, data, {
        headers,
        timeout: options.timeout,
      }),
      'POST',
      resolvedConfig,
    );
  }
}
