import { osintConfig } from '@app/configuration';
import {
  WCL_BASE_URL,
  WCL_BROWSER_COOLDOWN_KEY,
  WCL_BROWSER_STATE_KEY,
  WCL_CF_CHALLENGE_MARKER,
  WCL_HUMAN_CHALLENGE_MARKER,
  type WclFetchResult,
  type WclNavigationResult,
} from '@app/resources';
import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import chalk from 'chalk';
import type Redis from 'ioredis';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

@Injectable()
export class WclBrowserService implements OnApplicationShutdown {
  private readonly logger = new Logger(WclBrowserService.name, { timestamp: true });

  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private consecutiveFailures = 0;
  private operationQueue: Promise<unknown> = Promise.resolve();

  constructor(@InjectRedis() private readonly redisService: Redis) {
    chromium.use(stealth());
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }

  public async isChannelHealthy(): Promise<boolean> {
    const cooldown = await this.redisService.exists(WCL_BROWSER_COOLDOWN_KEY);
    return cooldown === 0;
  }

  /**
   * Navigates to an HTML page with the real Chromium TLS stack and resolves
   * Cloudflare / WCL human challenges along the way.
   */
  public async fetchHtml(url: string): Promise<WclNavigationResult> {
    return this.runExclusive(async () => {
      await this.pace();
      if (!(await this.isChannelHealthy())) return { status: 'blocked' };
      try {
        const page = await this.ensurePage();
        const navigation = await this.navigate(page, url);
        if (navigation === 'blocked') {
          this.recordFailure('Cloudflare challenge on navigation');
          return { status: 'blocked' };
        }
        const html = await page.content();
        await this.persistStorageState();
        this.recordSuccess();
        return { status: 'ok', html };
      } catch (errorOrException) {
        this.recordFailure(errorOrException instanceof Error ? errorOrException.message : String(errorOrException));
        return {
          status: 'error',
          message: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        };
      }
    });
  }

  /**
   * Fetches a same-origin JSON endpoint via an in-page fetch(), so the request
   * carries Chromium's TLS fingerprint and the live cookie jar. Never uses
   * Playwright's Node-side request client — that would reintroduce the Node
   * TLS fingerprint Cloudflare challenges.
   */
  public async fetchJson<T>(url: string): Promise<WclFetchResult<T>> {
    return this.runExclusive(async () => {
      await this.pace();
      if (!(await this.isChannelHealthy())) return { status: 'blocked' };
      try {
        const page = await this.ensurePage();
        const isPrimed = page.url().startsWith(WCL_BASE_URL) && !page.url().includes(WCL_HUMAN_CHALLENGE_MARKER);
        if (!isPrimed) {
          const navigation = await this.navigate(page, WCL_BASE_URL);
          if (navigation === 'blocked') {
            this.recordFailure('Cloudflare challenge during origin warm-up');
            return { status: 'blocked' };
          }
        }
        const result = await page.evaluate(async (target: string) => {
          const response = await fetch(target, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          return { status: response.status, body: await response.text() };
        }, url);
        if (result.status === 404) {
          this.recordSuccess();
          return { status: 'not_found' };
        }
        const isChallenge = result.status === 403 && result.body.includes(WCL_CF_CHALLENGE_MARKER);
        if (isChallenge) {
          this.recordFailure('Cloudflare challenge on in-page fetch');
          return { status: 'blocked' };
        }
        if (result.status !== 200) {
          this.recordFailure(`In-page fetch status ${result.status}`);
          return { status: 'error', message: `In-page fetch failed with status ${result.status}` };
        }
        const data = JSON.parse(result.body) as T;
        await this.persistStorageState();
        this.recordSuccess();
        return { status: 'ok', data };
      } catch (errorOrException) {
        this.recordFailure(errorOrException instanceof Error ? errorOrException.message : String(errorOrException));
        return {
          status: 'error',
          message: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        };
      }
    });
  }

  public async close(): Promise<void> {
    this.page = undefined;
    await this.context?.close().catch(() => undefined);
    this.context = undefined;
    if (this.browser?.isConnected()) {
      await this.browser.close().catch(() => undefined);
    }
    this.browser = undefined;
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.catch(() => undefined);
    return result;
  }

  private async ensurePage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) return this.page;
    await this.resetContext();
    if (!this.browser?.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    }
    const storedState = await this.redisService.get(WCL_BROWSER_STATE_KEY);
    this.context = await this.browser.newContext({
      storageState: storedState ? JSON.parse(storedState) : undefined,
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    this.page = await this.context.newPage();
    const navigation = await this.navigate(this.page, WCL_BASE_URL);
    if (navigation === 'blocked') {
      this.recordFailure('Cloudflare challenge during context warm-up');
      throw new Error('Cloudflare challenge during context warm-up');
    }
    await this.persistStorageState();
    this.logger.log(chalk.green('✓ WCL browser context ready'));
    return this.page;
  }

  private async navigate(page: Page, url: string): Promise<'ok' | 'blocked'> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (!(await this.resolveChallenges(page))) return 'ok';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return (await this.resolveChallenges(page)) ? 'blocked' : 'ok';
  }

  private async resolveChallenges(page: Page): Promise<boolean> {
    let isBlocked = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (page.url().includes(WCL_HUMAN_CHALLENGE_MARKER)) {
        isBlocked = true;
        await this.submitHumanChallenge(page);
        continue;
      }
      const isCfChallenge = (await page.title()).includes(WCL_CF_CHALLENGE_MARKER);
      if (isCfChallenge) {
        isBlocked = true;
        await page
          .waitForFunction('!document.title.includes("Just a moment")', undefined, {
            polling: 1_000,
            timeout: 15_000,
          })
          .catch(() => undefined);
        continue;
      }
      return false;
    }
    return isBlocked;
  }

  private async submitHumanChallenge(page: Page): Promise<void> {
    const submitControl = page.locator('form button[type="submit"], form input[type="submit"], form button').first();
    await submitControl.click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  private async persistStorageState(): Promise<void> {
    if (!this.context) return;
    try {
      const state = JSON.stringify(await this.context.storageState());
      await this.redisService.set(WCL_BROWSER_STATE_KEY, state);
    } catch (errorOrException) {
      this.logger.warn({
        logTag: 'persistStorageState',
        errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
    }
  }

  private async resetContext(): Promise<void> {
    this.page = undefined;
    await this.context?.close().catch(() => undefined);
    this.context = undefined;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  private recordFailure(reason: string): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures < osintConfig.wclChannelFailureThreshold) return;
    this.consecutiveFailures = 0;
    this.logger.warn(chalk.yellow(`⚠ WCL browser channel entering cooldown | ${chalk.dim(reason)}`));
    void this.redisService
      .set(WCL_BROWSER_COOLDOWN_KEY, '1', 'EX', osintConfig.wclChannelCooldownSec)
      .then(() => this.resetContext())
      .catch((errorOrException: unknown) => {
        this.logger.error({
          logTag: 'wclBrowserCooldown',
          errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        });
      });
  }

  private async pace(): Promise<void> {
    const jitter = osintConfig.wclRequestDelayMs * (0.75 + Math.random() * 0.5);
    await new Promise((resolve) => {
      setTimeout(resolve, jitter);
    });
  }
}
