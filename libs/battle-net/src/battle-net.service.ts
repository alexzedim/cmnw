import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { BattleNetClient, IBattleNetQueryOptions } from './battle-net-client';

@Injectable()
export class BattleNetService {
  private readonly logger = new Logger(BattleNetService.name, { timestamp: true });

  constructor(private readonly httpService: HttpService) {}

  /**
   * Create a new BattleNetClient instance with credentials
   */
  createClient(config?: ConstructorParameters<typeof BattleNetClient>[0]): BattleNetClient {
    return new BattleNetClient(config);
  }

  private shouldRetry(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const axiosError = error as { response?: { status?: number } };
    const status = axiosError.response?.status;

    if (status === undefined) return false;

    return status >= 500 && status < 600;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(
    request: () => Promise<T>,
    client: BattleNetClient,
  ): Promise<T> {
    let attempt = 0;
    const { maxRetries, baseDelayMs, maxDelayMs } = client.retryConfig;

    while (true) {
      try {
        return await request();
      } catch (error) {
        if (!this.shouldRetry(error) || attempt >= maxRetries) {
          throw error;
        }

        attempt++;
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);

        this.logger.warn(
          `Battle.net request failed (attempt ${attempt}/${maxRetries + 1}), ` +
            `retrying in ${delayMs}ms. Error: ${(error as Error).message}`,
        );

        await this.delay(delayMs);
      }
    }
  }

  /**
   * Execute GET request with retry on 5XX errors
   */
  public async query<T>(client: BattleNetClient, path: string, options: IBattleNetQueryOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: client.buildHeaders(options),
      timeout: options.timeout,
    };

    return this.executeWithRetry(async () => {
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.get<T>(`${client.baseUrl}${path}`, config),
      );
      return response.data;
    }, client);
  }

  /**
   * Execute GET request with retry on 5XX errors
   */
  public async get<T>(client: BattleNetClient, path: string, options: IBattleNetQueryOptions): Promise<T> {
    return this.query<T>(client, path, options);
  }

  /**
   * Execute POST request with retry on 5XX errors
   */
  public async post<T>(
    client: BattleNetClient,
    path: string,
    data: unknown,
    options: IBattleNetQueryOptions,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: client.buildHeaders(options),
      timeout: options.timeout,
    };

    return this.executeWithRetry(async () => {
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.post<T>(`${client.baseUrl}${path}`, data, config),
      );
      return response.data;
    }, client);
  }
}
