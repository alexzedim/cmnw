import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, throwError, timer, lastValueFrom } from 'rxjs';
import { finalize, map, mergeMap, retryWhen, timeout } from 'rxjs/operators';
import { BattleNetClient, IBattleNetQueryOptions, IBattleNetRetryConfig } from './battle-net-client';

@Injectable()
export class BattleNetService {
  private readonly logger = new Logger(BattleNetService.name, { timestamp: true });

  constructor(private readonly httpService: HttpService) {}

  createClient(config?: ConstructorParameters<typeof BattleNetClient>[0]): BattleNetClient {
    return new BattleNetClient(config);
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

  private makeRequest<T>(request$: Observable<AxiosResponse<T>>, method: string, client: BattleNetClient): Promise<T> {
    const retrySettings: Required<IBattleNetRetryConfig> = {
      maxRetries: 3,
      retryDelayMs: 1000,
      maxDelayMs: 10000,
      timeoutMs: 60000,
      ...client.retryConfig,
    };

    const url = client.baseUrl;

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

  public async query<T>(client: BattleNetClient, path: string, options: IBattleNetQueryOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: client.buildHeaders(options),
      timeout: options.timeout,
    };

    return this.makeRequest(this.httpService.get<T>(`${client.baseUrl}${path}`, config), 'GET', client);
  }

  public async get<T>(client: BattleNetClient, path: string, options: IBattleNetQueryOptions): Promise<T> {
    return this.query<T>(client, path, options);
  }

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

    return this.makeRequest(this.httpService.post<T>(`${client.baseUrl}${path}`, data, config), 'POST', client);
  }
}
