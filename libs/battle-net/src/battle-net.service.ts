import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { lastValueFrom } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { IBattleNetClientConfig, IBattleNetQueryOptions, DEFAULT_RETRY_CONFIG } from './types';
import { BattleNetRegion } from './enums';
import { BATTLE_NET_BASE_URLS, BATTLE_NET_OSINT_TIMEOUT } from './constants';
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

  async initialize(tag?: string): Promise<IBattleNetClientConfig> {
    const maxAttempts = 10;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      const key = await this.getAvailableKey(tag);

      if (key) {
        this._currentKeyUuid = key.uuid;
        this._config = {
          clientId: key.clientId,
          clientSecret: key.clientSecret,
          accessToken: key.accessToken,
          region: BattleNetRegion.EU,
        };
        return this._config;
      }

      if (attempt >= maxAttempts) {
        break;
      }

      const delayMs = Math.min(
        this.keyHealth.baseDelay * Math.pow(this.keyHealth.multiplier, attempt - 1),
        this.keyHealth.maxDelay * 1000,
      );
      lastError = new Error(
        `No available Battle.net key found${tag ? ` for tag '${tag}'` : ''} after ${attempt} attempts`,
      );
      this.logger.warn(`${lastError.message} | retrying in ${delayMs}ms`);
      await this.delay(delayMs);
    }

    throw lastError || new Error(`No available Battle.net key found${tag ? ` for tag '${tag}'` : ''}`);
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

  private buildHeaders(config: IBattleNetClientConfig, options: IBattleNetQueryOptions): AxiosHeaders {
    const headers = new AxiosHeaders();

    headers.set('Content-Type', 'application/json');

    if (config.accessToken) {
      headers.set('Authorization', `Bearer ${config.accessToken}`);
    }

    headers.set('Battlenet-Namespace', options.namespace);

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

    return headers;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRateLimitError(error: any): boolean {
    return error?.response?.status === 429;
  }

  private isServerError(error: any): boolean {
    if (!error.response) return false;
    return error.response.status >= 500;
  }

  private async waitForCooldown(keyUuid: string): Promise<void> {
    const cooldownMs = await this.getKeyCooldownMs(keyUuid);
    if (cooldownMs > 0) {
      this.logger.warn(`Waiting ${cooldownMs}ms for key ${keyUuid} cooldown`);
      await this.delay(cooldownMs);
    }
  }

  private getBaseUrl(region: BattleNetRegion): string {
    return BATTLE_NET_BASE_URLS[region];
  }

  private async executeQuery<T>(
    method: 'GET' | 'POST',
    path: string,
    options: IBattleNetQueryOptions,
    config: IBattleNetClientConfig,
    data?: unknown,
  ): Promise<T> {
    const maxRetries = DEFAULT_RETRY_CONFIG.maxRetries;
    const fixedRetryDelay = DEFAULT_RETRY_CONFIG.retryDelayMs;
    let attempt = 0;

    while (true) {
      attempt++;

      if (this._currentKeyUuid) {
        await this.waitForCooldown(this._currentKeyUuid);
      }

      const headers = this.buildHeaders(config, options);
      const url = `${this.getBaseUrl(config.region)}${path}`;
      const params = options.locale ? { locale: options.locale } : undefined;

      try {
        const response = await lastValueFrom(
          this.httpService.request<T>({ method, url, data, headers, timeout: options.timeout, params }).pipe(
            timeout(DEFAULT_RETRY_CONFIG.timeoutMs),
            map((res: AxiosResponse<T>) => res.data),
          ),
        );

        if (this._currentKeyUuid) {
          this.recordKeySuccess(this._currentKeyUuid).catch(() => {});
        }

        return response;
      } catch (error) {
        if (this.isRateLimitError(error)) {
          if (attempt > maxRetries) {
            this.logger.error(`Rate limited after ${attempt} attempts for ${url}`);
            if (this._currentKeyUuid) {
              await this.recordKeyRateLimit(this._currentKeyUuid);
            }
            throw error;
          }

          this.logger.warn(`Rate limited (attempt ${attempt}/${maxRetries}) for ${url}`);

          if (this._currentKeyUuid) {
            await this.recordKeyRateLimit(this._currentKeyUuid);
            await this.waitForCooldown(this._currentKeyUuid);
          }

          continue;
        } else if (this.isServerError(error)) {
          if (attempt > maxRetries) {
            this.logger.error(`Server error after ${attempt} attempts for ${url}`);
            throw error;
          }

          this.logger.warn(
            `Server error (attempt ${attempt}/${maxRetries}) for ${url} - retrying in ${fixedRetryDelay}ms`,
          );
          await this.delay(fixedRetryDelay);
          continue;
        } else {
          throw error;
        }
      }
    }
  }

  public async query<T>(path: string, options: IBattleNetQueryOptions, config?: IBattleNetClientConfig): Promise<T> {
    const resolvedConfig = config ?? this._config;
    if (!resolvedConfig) {
      throw new Error('BattleNetService not initialized');
    }
    return this.executeQuery<T>('GET', path, options, resolvedConfig);
  }

  public async post<T>(
    path: string,
    data: unknown,
    options: IBattleNetQueryOptions,
    config?: IBattleNetClientConfig,
  ): Promise<T> {
    const resolvedConfig = config ?? this._config;
    if (!resolvedConfig) {
      throw new Error('BattleNetService not initialized');
    }
    return this.executeQuery<T>('POST', path, options, resolvedConfig, data);
  }

  public createQueryOptions(
    namespace: string,
    timeout: number = BATTLE_NET_OSINT_TIMEOUT,
    locale: string = 'en_GB',
    headers?: Record<string, string>,
  ): IBattleNetQueryOptions {
    return {
      namespace,
      locale,
      timeout,
      headers,
    };
  }
}
