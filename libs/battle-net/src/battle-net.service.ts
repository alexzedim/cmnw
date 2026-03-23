import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, throwError, timer, lastValueFrom } from 'rxjs';
import { finalize, map, mergeMap, retryWhen, timeout } from 'rxjs/operators';
import { IBattleNetClientConfig, IBattleNetQueryOptions, IBattleNetRetryConfig, DEFAULT_RETRY_CONFIG } from './types';
import { BattleNetRegion } from './enums';
import {
  BATTLE_NET_BASE_URLS,
  BATTLE_NET_KEY_TAG_OSINT,
  BATTLE_NET_KEY_TAG_DMA,
  BATTLE_NET_KEY_TAG_BLIZZARD,
} from './constants';
import { KeysEntity } from '@app/pg';
import { battleNetConfig, IBattleNetKeyHealthConfig } from '@app/configuration';

@Injectable()
export class BattleNetService {
  private readonly logger = new Logger(BattleNetService.name, { timestamp: true });
  private readonly keyHealth: IBattleNetKeyHealthConfig;
  private _currentKeyUuid: string | null = null;
  private _clientConfig: IBattleNetClientConfig | null = null;

  get currentKeyUuid(): string | null {
    return this._currentKeyUuid;
  }

  setCurrentKey(key: KeysEntity): void {
    this._currentKeyUuid = key.uuid;
  }

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {
    this.keyHealth = battleNetConfig;
  }

  /**
   * Initialize the service by finding an available key with the given tag.
   * If no tag is provided, any available key will be used.
   * Throws if no keys are available.
   */
  async initialize(tag?: string): Promise<void> {
    const key = await this.getAvailableKey(tag);
    if (!key) {
      throw new Error(`No available Battle.net key found${tag ? ` for tag '${tag}'` : ''}`);
    }

    this._currentKeyUuid = key.uuid;
    this._clientConfig = {
      clientId: key.clientId,
      clientSecret: key.clientSecret,
      accessToken: key.accessToken,
      region: BattleNetRegion.EU,
    };
  }

  // ============ Key Health Methods ============

  /**
   * Get remaining cooldown for a key in milliseconds
   */
  async getKeyCooldownMs(keyUuid: string): Promise<number> {
    const key = await this.keysRepository.findOne({ where: { uuid: keyUuid } });
    if (!key || key.cooldownDelaySeconds === 0 || !key.lastFailureAt) {
      return 0;
    }
    const cooldownEnd = new Date(key.lastFailureAt.getTime() + key.cooldownDelaySeconds * 1000);
    const now = new Date();
    return Math.max(0, cooldownEnd.getTime() - now.getTime());
  }

  /**
   * Check if we need to wait before using a key
   */
  async shouldWaitForKey(keyUuid: string): Promise<{ wait: boolean; remainingMs: number }> {
    const remainingMs = await this.getKeyCooldownMs(keyUuid);
    return { wait: remainingMs > 0, remainingMs };
  }

  /**
   * Record a rate limit (429) response for a key
   * Formula: cooldownDelay = min(maxDelay, currentDelay * multiplier + baseDelay)
   */
  async recordKeyRateLimit(keyUuid?: string): Promise<number> {
    const resolvedKeyUuid = keyUuid ?? this._currentKeyUuid;
    if (!resolvedKeyUuid) {
      throw new NotFoundException('No keyUuid provided and no current key is set');
    }

    const key = await this.keysRepository.findOne({ where: { uuid: resolvedKeyUuid } });
    if (!key) throw new NotFoundException(`Key ${resolvedKeyUuid} not found`);

    const newCooldown = Math.min(
      this.keyHealth.maxDelay,
      key.cooldownDelaySeconds * this.keyHealth.multiplier + this.keyHealth.baseDelay,
    );

    key.cooldownDelaySeconds = newCooldown;
    key.lastFailureAt = new Date();

    await this.keysRepository.save(key);

    this.logger.warn(`Rate limited: ${resolvedKeyUuid} | cooldown: ${newCooldown}s`);
    return newCooldown;
  }

  /**
   * Record an error response for a key
   * Uses same formula as rate limit
   */
  async recordKeyError(keyUuid?: string): Promise<number> {
    const resolvedKeyUuid = keyUuid ?? this._currentKeyUuid;
    if (!resolvedKeyUuid) {
      throw new NotFoundException('No keyUuid provided and no current key is set');
    }

    const key = await this.keysRepository.findOne({ where: { uuid: resolvedKeyUuid } });
    if (!key) throw new NotFoundException(`Key ${resolvedKeyUuid} not found`);

    const newCooldown = Math.min(
      this.keyHealth.maxDelay,
      key.cooldownDelaySeconds * this.keyHealth.multiplier + this.keyHealth.baseDelay,
    );

    key.cooldownDelaySeconds = newCooldown;
    key.lastFailureAt = new Date();

    await this.keysRepository.save(key);
    return newCooldown;
  }

  /**
   * Record a successful request for a key
   * Formula: cooldownDelay = max(0, cooldownDelay - decayStep)
   */
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

  /**
   * Refresh OAuth token for a key
   */
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

  /**
   * Reset key health state
   */
  async resetKeyHealth(keyUuid: string): Promise<void> {
    await this.keysRepository.update(keyUuid, {
      cooldownDelaySeconds: 0,
      lastFailureAt: null,
    });
    this.logger.log(`Key health reset: ${keyUuid}`);
  }

  /**
   * Get the most available key (lowest cooldown) that is not currently in cooldown
   * Returns null if no keys are available
   */
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

  /**
   * Get all keys sorted by health (lowest cooldown delay first)
   * Keys in hard cooldown are still returned but sorted last
   */
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

  // ============ HTTP Request Methods ============

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

  private buildHeaders(config: IBattleNetClientConfig, options: IBattleNetQueryOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.accessToken) {
      headers['Authorization'] = `Bearer ${config.accessToken}`;
    }

    headers['Battlenet-Namespace'] = options.namespace;

    if (options.locale) {
      headers['Accept-Language'] = options.locale;
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

  public async queryInternal<T>(
    config: IBattleNetClientConfig,
    path: string,
    options: IBattleNetQueryOptions,
  ): Promise<T> {
    const config_: AxiosRequestConfig = {
      headers: this.buildHeaders(config, options),
      timeout: options.timeout,
    };

    return this.makeRequest(
      this.httpService.get<T>(`${this.getBaseUrl(config.region)}${path}`, config_),
      'GET',
      config,
    );
  }

  public async query<T>(path: string, options: IBattleNetQueryOptions): Promise<T> {
    if (!this._clientConfig) {
      throw new Error('BattleNetService not initialized. Call initialize() first.');
    }
    return this.queryInternal<T>(this._clientConfig, path, options);
  }

  public async get<T>(path: string, options: IBattleNetQueryOptions): Promise<T> {
    return this.query<T>(path, options);
  }

  public async postInternal<T>(
    config: IBattleNetClientConfig,
    path: string,
    data: unknown,
    options: IBattleNetQueryOptions,
  ): Promise<T> {
    const config_: AxiosRequestConfig = {
      headers: this.buildHeaders(config, options),
      timeout: options.timeout,
    };

    return this.makeRequest(
      this.httpService.post<T>(`${this.getBaseUrl(config.region)}${path}`, data, config_),
      'POST',
      config,
    );
  }

  public async post<T>(path: string, data: unknown, options: IBattleNetQueryOptions): Promise<T> {
    if (!this._clientConfig) {
      throw new Error('BattleNetService not initialized. Call initialize() first.');
    }
    return this.postInternal<T>(this._clientConfig, path, data, options);
  }
}
