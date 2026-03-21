import { BlizzAPI } from '@alexzedim/blizzapi';
import { KeysEntity } from '@app/pg';

export class BlizzardApiClient {
  public readonly client: BlizzAPI;
  public readonly initialKey: KeysEntity;
  public currentKey: KeysEntity;
  public get accessToken(): string {
    return this.client.accessTokenObject?.access_token;
  }

  constructor(client: BlizzAPI, key: KeysEntity) {
    this.client = client;
    this.initialKey = key;
    this.currentKey = key;
  }

  public rotate(newKey: KeysEntity): KeysEntity {
    this.recordRateLimit();
    (this.client as any).setAccessToken(newKey.token);
    this.currentKey = newKey;
    return newKey;
  }

  public recordSuccess(): void {
    this.currentKey.requestCount += 1;
    this.currentKey.successCount += 1;
    this.currentKey.consecutiveErrors = 0;
    this.currentKey.lastSuccessAt = new Date();
    this.currentKey.lastRequestAt = new Date();
  }

  public recordError(statusCode: number): void {
    this.currentKey.requestCount += 1;
    this.currentKey.errorCount += 1;
    this.currentKey.consecutiveErrors += 1;
    this.currentKey.lastErrorAt = new Date();
    this.currentKey.lastRequestAt = new Date();

    if (statusCode === 429) {
      this.recordRateLimit();
    }
  }

  public recordRateLimit(): void {
    this.currentKey.rateLimitCount += 1;
    this.currentKey.lastRateLimitAt = new Date();
  }
}
