import { BATTLE_NET_KEY_TAG_WCL_SESSION, BATTLE_NET_KEY_TAG_WCL_V2, BattleNetService } from '@app/battle-net';
import { osintConfig } from '@app/configuration';
import { CharactersRaidLogsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import {
  CharacterMessageDto,
  type FightsAPIResponse,
  getRandomizedHeaders,
  type ICharacterMessageBase,
  isCharacterRaidLogResponse,
  KEY_LOCK,
  type RaidCharacter,
  toGuid,
  toSlug,
} from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { AxiosError, type AxiosProxyConfig } from 'axios';
import type { Queue } from 'bullmq';
import chalk from 'chalk';
import type Redis from 'ioredis';
import { get } from 'lodash';
import { DateTime } from 'luxon';
import { parse } from 'node-html-parser';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ArrayContains, IsNull, Not, type Repository } from 'typeorm';

@Injectable()
export class WarcraftLogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarcraftLogsService.name, {
    timestamp: true,
  });

  private stats = {
    logsIndexed: 0,
    logsSkipped: 0,
    logsCreated: 0,
    charactersQueued: 0,
    errors: 0,
    startTime: Date.now(),
  };

  // Cached headers that rotate via cron task
  private cachedBrowserHeaders: Record<string, string> = {};
  private cachedXHRHeaders: Record<string, Record<string, string>> = {};

  // Cookie jar for human-verification and WCL session cookies
  private sessionCookies: Record<string, string> = {};

  constructor(
    private httpService: HttpService,
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectQueue('osint.characters')
    private readonly charactersQueue: Queue<ICharacterMessageBase>,
    private readonly battleNetService: BattleNetService,
    private readonly realmsCacheService: RealmsCacheService,
  ) {
    // Initialize headers on service creation
    this.refreshHeaders();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexLogs();
    await this.indexWarcraftLogs();
  }

  /**
   * Refresh cached headers with new randomized values
   * Runs every 1-2 hours via cron to avoid detection
   */
  @Cron('0 */1 * * * *') // Every hour at minute 0
  private refreshHeaders(): void {
    // Random chance to skip (makes rotation less predictable: ~1-2 hour interval)
    const shouldSkip = Math.random() < 0.5;
    if (shouldSkip) {
      this.logger.log(chalk.dim('⏭️ Header refresh skipped (randomized timing)'));
      return;
    }

    this.cachedBrowserHeaders = getRandomizedHeaders({ type: 'browser' });
    this.cachedXHRHeaders = {}; // XHR headers need referer, will be generated per-request

    this.logger.log(chalk.dim('🔄 Headers refreshed (next check in 1h, ~50% chance to refresh)'));
  }

  /**
   * Get cached browser headers
   */
  private getBrowserHeaders(): Record<string, string> {
    return this.cachedBrowserHeaders;
  }

  /**
   * Get cached XHR headers with referer
   */
  private getXHRHeaders(referer: string): Record<string, string> {
    // Generate XHR headers with current base headers + referer
    // We cache the base but generate referer-specific headers on demand
    const cacheKey = referer;
    if (!this.cachedXHRHeaders[cacheKey]) {
      this.cachedXHRHeaders[cacheKey] = getRandomizedHeaders({
        type: 'xhr',
        referer,
      });
    }

    return this.cachedXHRHeaders[cacheKey];
  }

  private async getSessionCookie(): Promise<string | null> {
    const keyEntity = await this.keysRepository.findOne({
      where: { tags: ArrayContains([BATTLE_NET_KEY_TAG_WCL_SESSION]) },
    });

    if (!keyEntity) return null;

    if (keyEntity.accessToken) {
      this.sessionCookies.wcl_session = keyEntity.accessToken;
      return keyEntity.accessToken;
    }

    return this.login(keyEntity);
  }

  private updateCookies(setCookieHeaders: unknown): void {
    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const cookie of cookies) {
      if (typeof cookie !== 'string') continue;
      const [pair] = cookie.split(';');
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) continue;
      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1);
      if (!name) continue;
      if (!value || value === 'deleted') {
        delete this.sessionCookies[name];
        continue;
      }
      this.sessionCookies[name] = value;
    }
  }

  private getCookieHeader(extraCookies: Record<string, string> = {}): string {
    return Object.entries({ ...this.sessionCookies, ...extraCookies })
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  private getProxyConfig(): AxiosProxyConfig | undefined {
    if (!osintConfig.wclProxyUrl) return undefined;
    const proxyUrl = new URL(osintConfig.wclProxyUrl);
    const auth =
      proxyUrl.username && proxyUrl.password
        ? {
            username: decodeURIComponent(proxyUrl.username),
            password: decodeURIComponent(proxyUrl.password),
          }
        : undefined;
    return {
      protocol: proxyUrl.protocol.replace(':', ''),
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80),
      auth,
    };
  }

  private async passHumanChallenge(): Promise<void> {
    const challengeUrl = 'https://www.warcraftlogs.com/human-challenge';
    const challengePage = await this.httpService.axiosRef.get<string>(challengeUrl, {
      headers: { ...this.getBrowserHeaders(), Cookie: this.getCookieHeader() },
      timeout: 15_000,
      proxy: this.getProxyConfig(),
    });

    this.updateCookies(challengePage.headers['set-cookie']);

    const challengeToken = parse(challengePage.data).querySelector('form input[name="_token"]')?.getAttribute('value');
    if (!challengeToken) return;

    const challengeResponse = await this.httpService.axiosRef.request<unknown>({
      method: 'post',
      url: challengeUrl,
      headers: {
        ...this.getBrowserHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.getCookieHeader(),
        Referer: challengeUrl,
        Origin: 'https://www.warcraftlogs.com',
      },
      data: new URLSearchParams({ _token: challengeToken }).toString(),
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 200,
      timeout: 15_000,
      proxy: this.getProxyConfig(),
    });

    this.updateCookies(challengeResponse.headers['set-cookie']);
  }

  private async login(keyEntity: KeysEntity): Promise<string> {
    const logTag = 'wclLogin';
    const loginUrl = 'https://www.warcraftlogs.com/login';

    try {
      await this.passHumanChallenge();

      const loginPage = await this.httpService.axiosRef.get<string>(loginUrl, {
        headers: { ...this.getBrowserHeaders(), Cookie: this.getCookieHeader() },
        timeout: 15_000,
        proxy: this.getProxyConfig(),
      });

      this.updateCookies(loginPage.headers['set-cookie']);

      const $ = parse(loginPage.data);
      const csrfToken =
        $.querySelector('form input[name="_token"]')?.getAttribute('value') ??
        $.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

      if (!csrfToken) {
        throw new Error('CSRF token not found on login page');
      }

      const loginResponse = await this.httpService.axiosRef.request<unknown>({
        method: 'post',
        url: loginUrl,
        headers: {
          ...this.getBrowserHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: this.getCookieHeader(),
          Referer: loginUrl,
          Origin: 'https://www.warcraftlogs.com',
        },
        data: new URLSearchParams({
          _token: csrfToken,
          email: keyEntity.clientId,
          password: keyEntity.clientSecret,
          remember: '1',
        }).toString(),
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 200,
        timeout: 15_000,
        proxy: this.getProxyConfig(),
      });

      this.updateCookies(loginResponse.headers['set-cookie']);

      const sessionCookie = this.sessionCookies.wcl_session;
      if (!sessionCookie) {
        throw new Error('wcl_session cookie not found in login response');
      }

      await this.keysRepository.update({ uuid: keyEntity.uuid }, { accessToken: sessionCookie });

      this.logger.log(chalk.green(`✓ WCL login successful | ${keyEntity.clientId}`));

      return sessionCookie;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
      throw errorOrException;
    }
  }

  private async refreshSession(): Promise<string | null> {
    const keyEntity = await this.keysRepository.findOne({
      where: { tags: ArrayContains([BATTLE_NET_KEY_TAG_WCL_SESSION]) },
    });

    if (!keyEntity) return null;

    this.sessionCookies = {};
    await this.keysRepository.update({ uuid: keyEntity.uuid }, { accessToken: null });

    return this.login(keyEntity);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async indexWarcraftLogs(): Promise<void> {
    const startTime = Date.now();
    try {
      const lock = Boolean(await this.redisService.exists(KEY_LOCK.WARCRAFT_LOGS));
      if (lock) {
        this.logger.warn(chalk.yellow('⚠ indexWarcraftLogs is already running'));
        return;
      }

      await this.redisService.set(KEY_LOCK.WARCRAFT_LOGS, '1', 'EX', 60 * 60 * 23);

      const realmsEntities = await this.realmsRepository.findBy({
        warcraftLogsId: Not(IsNull()),
      });

      this.logger.log(chalk.cyan(`🔍 Starting WCL indexing for ${chalk.bold(realmsEntities.length)} realms`));

      for (const realmEntity of realmsEntities) {
        await this.indexCharacterRaidLogs(realmEntity);
      }

      const duration = Date.now() - startTime;
      this.logger.log(chalk.green(`✓ WCL indexing completed in ${chalk.bold(Math.round(duration / 1000))}s`));
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(chalk.red('✗ Error in indexWarcraftLogs:'), errorOrException.message);
    } finally {
      await this.redisService.del(KEY_LOCK.WARCRAFT_LOGS);
    }
  }

  async getLogsFromPage(realmId = 1, page = 1) {
    try {
      const warcraftLogsURI = 'https://www.warcraftlogs.com/zone/reports';
      const params = `server=${realmId}&`;
      const pageUrl = `${warcraftLogsURI}?${params}page=${page}`;

      const sessionCookie = await this.getSessionCookie();

      const buildHeaders = (cookie: string | null) => ({
        ...this.getBrowserHeaders(),
        ...(cookie ? { Cookie: this.getCookieHeader({ wcl_session: cookie }) } : {}),
      });

      let response = await this.httpService.axiosRef.get<string>(pageUrl, {
        headers: buildHeaders(sessionCookie),
        timeout: 10_000,
        maxRedirects: 0,
        validateStatus: (status) => status < 400,
        proxy: this.getProxyConfig(),
      });

      this.updateCookies(response.headers['set-cookie']);

      const isLoginRedirect = response.status === 302;
      if (isLoginRedirect && sessionCookie) {
        this.logger.warn(chalk.yellow('🔄 Session expired, refreshing WCL login'));
        const freshCookie = await this.refreshSession();
        response = await this.httpService.axiosRef.get<string>(pageUrl, {
          headers: buildHeaders(freshCookie),
          timeout: 10_000,
          proxy: this.getProxyConfig(),
        });
        this.updateCookies(response.headers['set-cookie']);
      }

      const wclHTML = parse(response.data);
      const warcraftLogsMap = new Map<string, Pick<CharactersRaidLogsEntity, 'logId' | 'createdAt'>>();

      wclHTML.querySelectorAll('tbody > tr').forEach((element) => {
        const momentFormat = element.querySelector('td > span.moment-format')?.getAttribute('data-timestamp');
        const hrefString = element.querySelector('td.description-cell > a')?.getAttribute('href');

        const isReports = hrefString?.includes('reports');
        if (isReports && momentFormat) {
          const matchResult = hrefString.match(/(.{16})\s*$/g);
          if (matchResult?.[0]) {
            const logId = matchResult[0];
            const createdAt = DateTime.fromSeconds(Number(momentFormat)).toJSDate();
            warcraftLogsMap.set(logId, { logId, createdAt });
          }
        }
      });

      return Array.from(warcraftLogsMap.values());
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getLogsFromPage',
        errorOrException,
      });

      return [];
    }
  }

  async indexCharacterRaidLogs(realmEntity: RealmsEntity): Promise<void> {
    try {
      let logsAlreadyExists = 0;

      for (let page = osintConfig.wclFromPage; page < osintConfig.wclToPage; page++) {
        // No need for delay here - getLogsFromPage already has 1-3s delay
        const wclLogsFromPage = (await this.getLogsFromPage(realmEntity.warcraftLogsId, page)) ?? []; // Ensure it's always an array
        /**
         * If indexing logs on the page have ended and page fault
         * tolerance is more than config, then break for loop
         */
        const isCondition1 = !wclLogsFromPage.length;
        const isCondition2 = logsAlreadyExists > osintConfig.wclLogs;

        if (isCondition2) {
          this.logger.log(
            chalk.blue(
              `ℹ Break | ${realmEntity.name} ${chalk.dim(`| logs: ${logsAlreadyExists} > ${osintConfig.wclLogs}`)}`,
            ),
          );
          break;
        }

        // --- If parsed page have no results --- //
        if (isCondition1) {
          this.logger.warn(chalk.yellow(`⚠ Empty page | ${realmEntity.name} ${chalk.dim(`| page: ${page}`)}`));
          break;
        }

        for (const { logId, createdAt } of wclLogsFromPage) {
          const existingLog = await this.charactersRaidLogsRepository.findOne({
            where: { logId },
            select: { logId: true, realmSlug: true },
          });
          // --- If exists counter --- //
          if (existingLog) {
            logsAlreadyExists += 1;
            this.stats.logsSkipped++;
            if (!existingLog.realmSlug && realmEntity.slug) {
              await this.charactersRaidLogsRepository.update({ logId }, { realmSlug: realmEntity.slug });
              this.logger.log(
                `${chalk.magenta('↻')} Backfilled ${chalk.dim(logId)} ${chalk.dim('|')} ${realmEntity.slug}`,
              );
            }
            this.logger.log(
              `${chalk.yellow('⊘')} Skipped ${chalk.dim(logId)} ${chalk.dim('|')} ${realmEntity.name} ${chalk.dim(`| exists: ${logsAlreadyExists}`)}`,
            );
            continue;
          }

          if (!existingLog) {
            await this.charactersRaidLogsRepository.save({
              logId,
              isIndexed: false,
              createdAt,
              realmSlug: realmEntity.slug,
            });
            this.stats.logsCreated++;
            this.logger.log(
              `${chalk.green('✓')} Created ${chalk.cyan(logId)} ${chalk.dim('|')} ${realmEntity.name} ${chalk.dim(`| exists: ${logsAlreadyExists}`)}`,
            );

            if (logsAlreadyExists > 1) logsAlreadyExists -= 1;
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'indexCharacterRaidLogs',
        errorOrException,
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async indexLogs(): Promise<void> {
    const startTime = Date.now();
    try {
      const isJobLocked = Boolean(await this.redisService.exists(BATTLE_NET_KEY_TAG_WCL_V2));
      if (isJobLocked) {
        this.logger.warn(chalk.yellow('⚠ indexLogs is already running'));
        return;
      }

      await this.redisService.set(BATTLE_NET_KEY_TAG_WCL_V2, '1', 'EX', 60 * 59);

      const wclKey = await this.battleNetService.getAvailableKey(BATTLE_NET_KEY_TAG_WCL_V2);
      if (!wclKey) {
        this.logger.error(chalk.red('✗ No available WCL key'));
        return;
      }

      const characterRaidLog = await this.charactersRaidLogsRepository.find({
        where: { isIndexed: false },
        take: 5_000,
      });

      if (!characterRaidLog.length) {
        this.logger.log(chalk.blue('ℹ No logs to index'));
        return;
      }

      this.logger.log(chalk.cyan(`🔄 Processing ${chalk.bold(characterRaidLog.length)} raid logs`));

      // Reduced concurrency from 5 to 2 to avoid rate limiting on Fights API
      await lastValueFrom(
        from(characterRaidLog).pipe(
          mergeMap(
            (characterRaidLogEntity) => this.indexLogAndPushCharactersToQueue(characterRaidLogEntity, wclKey),
            2,
          ),
        ),
        { defaultValue: undefined },
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        chalk.green(
          `✓ Indexed ${chalk.bold(characterRaidLog.length)} logs in ${chalk.bold(Math.round(duration / 1000))}s`,
        ),
      );

      // Log progress summary every hour
      this.logProgress();
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(chalk.red('✗ Error in indexLogs:'), errorOrException.message);
    } finally {
      await this.redisService.del(BATTLE_NET_KEY_TAG_WCL_V2);
    }
  }

  /**
   * Indexes a raid log and pushes discovered characters to the processing queue.
   * Implements a fallback strategy: tries Fights API first (no quota), then GraphQL API.
   *
   * @param characterRaidLogEntity - The raid log entity to index
   * @param wclKey - The API key for GraphQL fallback
   * @throws Logs errors but doesn't throw - returns gracefully on failure
   */
  async indexLogAndPushCharactersToQueue(
    characterRaidLogEntity: CharactersRaidLogsEntity,
    wclKey: KeysEntity,
  ): Promise<void> {
    const logId = characterRaidLogEntity.logId;
    const startTime = Date.now();

    try {
      // Attempt to fetch characters using primary and fallback APIs
      const raidCharacters = await this.fetchCharactersWithFallback(logId, wclKey);

      // Mark log as indexed regardless of character count (prevents re-processing)
      await this.markLogAsIndexed(logId);

      const duration = Date.now() - startTime;
      this.stats.logsIndexed++;

      this.logger.log(
        `${chalk.green('✓')} Indexed ${chalk.dim(logId)} ${chalk.dim('|')} ${chalk.bold(raidCharacters.length)} characters ${chalk.dim(`(${duration}ms)`)}`,
      );

      // Only queue if characters were found
      if (raidCharacters.length > 0) {
        await this.charactersToQueue(raidCharacters);
      }
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        `${chalk.red('✗')} Failed to index ${chalk.dim(logId)} - ${errorOrException?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Attempts to fetch characters from raid log using primary and fallback APIs.
   * Strategy: Fights API (no quota) → GraphQL API (quota-limited)
   *
   * @param logId - The raid log ID
   * @param wclKey - API key for GraphQL fallback
   * @returns Array of raid characters (empty if both APIs fail)
   */
  private async fetchCharactersWithFallback(logId: string, wclKey: KeysEntity): Promise<Array<RaidCharacter>> {
    // Primary: Try Fights API (no token required, no quota limits)
    try {
      const characters = await this.getCharactersFromFightsAPI(logId);
      if (characters.length > 0) {
        return characters;
      }
    } catch (fightsApiError) {
      this.logger.warn(
        chalk.yellow(
          `⚠ Fights API failed for ${logId}: ${fightsApiError?.message || 'Unknown error'}, falling back to GraphQL`,
        ),
      );
    }

    // Fallback: Try GraphQL API (requires token, has quota)
    try {
      const characters = await this.getCharactersFromLogs(wclKey.accessToken, logId);
      if (characters.length > 0) {
        return characters;
      }
    } catch (graphqlApiError) {
      this.logger.warn(
        chalk.yellow(`⚠ GraphQL API failed for ${logId}: ${graphqlApiError?.message || 'Unknown error'}`),
      );
    }

    // Both APIs failed or returned no characters
    return [];
  }

  /**
   * Marks a raid log as indexed in the database.
   * This prevents re-processing even if no characters were found.
   *
   * @param logId - The raid log ID to mark
   * @throws Database errors are propagated
   */
  private async markLogAsIndexed(logId: string): Promise<void> {
    await this.charactersRaidLogsRepository.update({ logId }, { isIndexed: true });
  }

  /**
   * Handle Axios HTTP errors with detailed error information
   * @param error - The error to handle
   * @param logId - Log ID for context
   */
  private handleFightsAPIError(error: unknown, logId: string): void {
    if (error instanceof AxiosError) {
      const errorInfo = {
        logTag: 'getCharactersFromFightsAPI',
        logId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        responseData: error.response?.data,
        code: error.code,
        message: error.message,
      };

      this.logger.error(errorInfo);
    } else {
      // Fallback for non-Axios errors
      this.logger.error({
        logTag: 'getCharactersFromFightsAPI',
        logId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Fetches character roster from Warcraft Logs internal API endpoint.
   * This endpoint doesn't require GraphQL API token and provides full character data.
   * @param logId - The 16-character report ID
   * @returns Array of RaidCharacter objects with name, realm, and timestamp
   */
  async getCharactersFromFightsAPI(logId: string): Promise<Array<RaidCharacter>> {
    try {
      const apiUrl = `https://www.warcraftlogs.com/reports/fights-and-participants/${logId}/0`;

      const headers = this.getXHRHeaders(`https://www.warcraftlogs.com/reports/${logId}`);

      const response = await this.httpService.axiosRef.get<FightsAPIResponse>(apiUrl, {
        headers,
        timeout: 15_000,
      });

      const isConditionNotFound = response.status === 404;
      if (isConditionNotFound) {
        this.logger.warn(chalk.yellow(`⚠ Log not found (404) for ${logId}`));
        return [];
      }

      const isConditionBadResponse = response.status !== 200 || !response.data;
      if (isConditionBadResponse) {
        this.logger.warn(chalk.yellow(`⚠ Bad response (${response.status}) for ${logId}`));
        throw new Error(`Bad response status: ${response.status}`);
      }

      const realmSlugCache = new Map<string, string>();

      const players: RaidCharacter[] = [];
      for (const character of response.data.friendlies || []) {
        if (character.type === 'NPC' || !character.server) continue;

        const normalizedName = character.name.trim();
        const normalizedRealm = toSlug(character.server);

        let canonicalSlug = realmSlugCache.get(normalizedRealm);
        if (canonicalSlug === undefined) {
          canonicalSlug = await CharacterMessageDto.resolveRealmSlug(this.realmsCacheService, normalizedRealm);
          realmSlugCache.set(normalizedRealm, canonicalSlug);
        }

        players.push({
          guid: toGuid(normalizedName, canonicalSlug),
          name: normalizedName,
          realm: canonicalSlug,
        });
      }

      const characters = new Map<string, RaidCharacter>();
      for (const character of players) {
        if (characters.has(character.guid)) continue;
        characters.set(character.guid, character);
      }

      this.logger.log(
        `${chalk.green('✓')} Fights API ${chalk.dim(logId)} ${chalk.dim('|')} ${chalk.bold(characters.size)} characters`,
      );

      return Array.from(characters.values());
    } catch (errorOrException) {
      this.handleFightsAPIError(errorOrException, logId);
      return [];
    }
  }

  /**
   * Parses a Warcraft Logs report HTML page to extract basic character information.
   * This is a fallback method when API quota is exceeded.
   * Note: HTML pages load character data dynamically via JavaScript, so this method
   * only extracts limited information like the report creator name.
   * @param logId - The 16-character report ID
   * @returns Array of character info with name and realm (may be incomplete)
   * @deprecated Use getCharactersFromFightsAPI instead
   */
  async getCharactersFromReportHtml(logId: string): Promise<Array<{ name: string; realm?: string }>> {
    try {
      const reportUrl = `https://www.warcraftlogs.com/reports/${logId}`;
      const response = await this.httpService.axiosRef.get<string>(reportUrl, {
        headers: this.getBrowserHeaders(),
        timeout: 15000,
      });

      const root = parse(response.data);
      const characters = new Map<string, { name: string; realm?: string }>();

      // Extract report creator name
      const creatorName = (root.querySelector('.report-title-details-text .gold.bold')?.text ?? '').trim();
      if (creatorName) {
        characters.set(creatorName.toLowerCase(), { name: creatorName });
      }

      // Try to extract guild/team name if present
      const guildName = (root.querySelector('.guild-reports-guildName')?.text ?? '').trim();
      if (guildName && guildName !== 'Personal Logs' && guildName !== creatorName) {
        characters.set(guildName.toLowerCase(), { name: guildName });
      }

      // Note: Full character roster with realms requires API access
      // HTML pages load this data asynchronously via JavaScript
      this.logger.warn(
        chalk.yellow(`⚠ HTML parsing for ${logId} - limited data (creator only). Use API for full roster.`),
      );

      return Array.from(characters.values());
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getCharactersFromReportHtml',
        logId,
        error: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
      return [];
    }
  }

  async getCharactersFromLogs(token: string, logId: string) {
    try {
      const response = await this.httpService.axiosRef.request<unknown, unknown>({
        method: 'post',
        url: 'https://www.warcraftlogs.com/api/v2/client',
        headers: { Authorization: `Bearer ${token}` },
        data: {
          query: `
            query {
              reportData {
                report (code: "${logId}") {
                  startTime
                  rankedCharacters {
                    id
                    name
                    guildRank
                    server {
                      id
                      name
                      normalizedName
                      slug
                    }
                  }
                  masterData {
                    actors {
                      type
                      name
                      server
                    }
                  }
                }
              }
            }`,
        },
      });

      const isGuard = isCharacterRaidLogResponse(response);
      if (!isGuard) return [];

      const timestamp = get(response, 'data.data.reportData.report.startTime', 1);
      const realmSlugCache = new Map<string, string>();

      const resolveSlug = async (input: string): Promise<string> => {
        const slug = toSlug(input);
        let canonicalSlug = realmSlugCache.get(slug);
        if (canonicalSlug === undefined) {
          canonicalSlug = await CharacterMessageDto.resolveRealmSlug(this.realmsCacheService, slug);
          realmSlugCache.set(slug, canonicalSlug);
        }
        return canonicalSlug;
      };

      const rankedCharacters: Array<RaidCharacter> = [];
      for (const character of get(response, 'data.data.reportData.report.rankedCharacters', []) as Array<any>) {
        const canonicalSlug = await resolveSlug(character.server.slug);
        rankedCharacters.push({
          guid: toGuid(character.name, canonicalSlug),
          id: character.id,
          name: character.name,
          realm: canonicalSlug,
          guildRank: character.guildRank,
          timestamp: timestamp,
        });
      }

      const playableCharacters: Array<RaidCharacter> = [];
      for (const character of (get(response, 'data.data.reportData.report.masterData.actors', []) as Array<any>).filter(
        (c) => c.type === 'Player',
      )) {
        const canonicalSlug = await resolveSlug(character.server);
        playableCharacters.push({
          guid: toGuid(character.name, canonicalSlug),
          name: character.name,
          realm: canonicalSlug,
          timestamp: timestamp,
        });
      }

      const raidCharacters = [...rankedCharacters, ...playableCharacters];
      const characters = new Map<string, RaidCharacter>();

      for (const character of raidCharacters) {
        const isIn = characters.has(character.guid);
        if (isIn) continue;
        characters.set(character.guid, character);
      }

      return Array.from(characters.values());
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getCharactersFromLogs',
        logId,
        error: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
      return [];
    }
  }

  async charactersToQueue(raidCharacters: Array<RaidCharacter>): Promise<boolean> {
    try {
      const charactersToJobs = raidCharacters.map((raidCharacter) =>
        CharacterMessageDto.fromWarcraftLogs({
          name: raidCharacter.name,
          realm: raidCharacter.realm,
        }),
      );

      await this.charactersQueue.addBulk(
        charactersToJobs.map((job) => ({
          name: job.name,
          data: job.data,
          opts: job.opts,
        })),
      );
      this.stats.charactersQueued += charactersToJobs.length;
      this.logger.log(`${chalk.cyan('→')} Queued ${chalk.bold(charactersToJobs.length)} characters to characterQueue`);
      return true;
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(chalk.red('✗ Error in charactersToQueue:'), errorOrException.message);
      return false;
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 WCL SERVICE PROGRESS')}\n` +
        `${chalk.cyan('  ✓ Logs Indexed:')} ${chalk.cyan.bold(this.stats.logsIndexed)}\n` +
        `${chalk.green('  ✓ Logs Created:')} ${chalk.green.bold(this.stats.logsCreated)}\n` +
        `${chalk.yellow('  ⊚ Logs Skipped:')} ${chalk.yellow.bold(this.stats.logsSkipped)}\n` +
        `${chalk.cyan('  → Characters Queued:')} ${chalk.cyan.bold(this.stats.charactersQueued)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Uptime:')} ${chalk.bold(`${hours}h ${minutes}m`)}\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }
}
