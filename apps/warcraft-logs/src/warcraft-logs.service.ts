import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import chalk from 'chalk';
import {
  AdaptiveRateLimiter,
  CharacterMessageDto,
  charactersQueue,
  delay,
  FightsAPIResponse,
  getKey,
  getKeys,
  getRandomizedHeaders,
  GLOBAL_OSINT_KEY,
  GLOBAL_WCL_KEY_V2,
  isCharacterRaidLogResponse,
  KEY_LOCK,
  RaidCharacter,
  randomInt,
  toGuid,
  toSlug,
} from '@app/resources';

import { Cron, CronExpression } from '@nestjs/schedule';
import { osintConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom } from 'rxjs';
import { CharactersRaidLogsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { IsNull, Not, Repository } from 'typeorm';
import { get } from 'lodash';
import { mergeMap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { InjectRedis } from '@nestjs-modules/ioredis';
import * as cheerio from 'cheerio';
import Redis from 'ioredis';
import { RabbitMQPublisherService } from '@app/rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';

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

  // Adaptive rate limiter for Fights API (2-30 second delays)
  private readonly fightsAPIRateLimiter = new AdaptiveRateLimiter(2000, 30000);

  // Cached headers that rotate via cron task
  private cachedBrowserHeaders: Record<string, string> = {};
  private cachedXHRHeaders: Record<string, Record<string, string>> = {};

  constructor(
    private httpService: HttpService,
    private readonly publisher: RabbitMQPublisherService,
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
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
      this.logger.log(
        chalk.dim('⏭️ Header refresh skipped (randomized timing)'),
      );
      return;
    }

    this.cachedBrowserHeaders = getRandomizedHeaders({ type: 'browser' });
    this.cachedXHRHeaders = {}; // XHR headers need referer, will be generated per-request

    this.logger.log(
      chalk.dim(
        '🔄 Headers refreshed (next check in 1h, ~50% chance to refresh)',
      ),
    );
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

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async indexWarcraftLogs(): Promise<void> {
    const startTime = Date.now();
    try {
      const lock = Boolean(
        await this.redisService.exists(KEY_LOCK.WARCRAFT_LOGS),
      );
      if (lock) {
        this.logger.warn(
          chalk.yellow('⚠ indexWarcraftLogs is already running'),
        );
        return;
      }

      await this.redisService.set(
        KEY_LOCK.WARCRAFT_LOGS,
        '1',
        'EX',
        60 * 60 * 23,
      );

      const realmsEntities = await this.realmsRepository.findBy({
        warcraftLogsId: Not(IsNull()),
      });

      this.logger.log(
        chalk.cyan(
          `🔍 Starting WCL indexing for ${chalk.bold(realmsEntities.length)} realms`,
        ),
      );

      for (const realmEntity of realmsEntities) {
        await this.indexCharacterRaidLogs(realmEntity);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        chalk.green(
          `✓ WCL indexing completed in ${chalk.bold(Math.round(duration / 1000))}s`,
        ),
      );
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Error in indexWarcraftLogs:'),
        errorOrException.message,
      );
    } finally {
      await this.redisService.del(KEY_LOCK.WARCRAFT_LOGS);
    }
  }

  async getLogsFromPage(realmId = 1, page = 1) {
    try {
      // Add delay to avoid rate limiting (1-3 seconds)
      const delayMs = randomInt(1000, 3000);
      await delay(delayMs);

      const warcraftLogsURI = 'https://www.warcraftlogs.com/zone/reports';
      // --- add if necessary @todo zone=${this.config.raidTier}& --- //
      const params = `server=${realmId}&`;

      const response = await this.httpService.axiosRef.get<string>(
        `${warcraftLogsURI}?${params}page=${page}`,
        {
          headers: this.getBrowserHeaders(),
          timeout: 10000,
        },
      );

      const wclHTML = cheerio.load(response.data);
      const wclTable = wclHTML.html('tbody > tr');
      const warcraftLogsMap = new Map<
        string,
        Pick<CharactersRaidLogsEntity, 'logId' | 'createdAt'>
      >();

      wclHTML(wclTable).each((_itx, element) => {
        const momentFormat = wclHTML(element)
          .children()
          .find('td > span.moment-format')
          .attr('data-timestamp');
        const hrefString = wclHTML(element)
          .children()
          .find('td.description-cell > a')
          .attr('href');

        const isReports = hrefString?.includes('reports');
        if (isReports && momentFormat) {
          const matchResult = hrefString.match(/(.{16})\s*$/g);
          if (matchResult && matchResult[0]) {
            const logId = matchResult[0];
            const createdAt = DateTime.fromSeconds(
              Number(momentFormat),
            ).toJSDate();
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
      return []; // Return empty array instead of undefined
    }
  }

  async indexCharacterRaidLogs(realmEntity: RealmsEntity): Promise<void> {
    try {
      let logsAlreadyExists = 0;

      for (
        let page = osintConfig.wclFromPage;
        page < osintConfig.wclToPage;
        page++
      ) {
        // No need for delay here - getLogsFromPage already has 1-3s delay
        const wclLogsFromPage =
          (await this.getLogsFromPage(realmEntity.warcraftLogsId, page)) ?? []; // Ensure it's always an array
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
          this.logger.warn(
            chalk.yellow(
              `⚠ Empty page | ${realmEntity.name} ${chalk.dim(`| page: ${page}`)}`,
            ),
          );
          break;
        }

        for (const { logId, createdAt } of wclLogsFromPage) {
          const characterRaidLog =
            await this.charactersRaidLogsRepository.exist({
              where: { logId },
            });
          // --- If exists counter --- //
          if (characterRaidLog) {
            logsAlreadyExists += 1;
            this.stats.logsSkipped++;
            this.logger.log(
              `${chalk.yellow('⊘')} Skipped ${chalk.dim(logId)} ${chalk.dim('|')} ${realmEntity.name} ${chalk.dim(`| exists: ${logsAlreadyExists}`)}`,
            );
            continue;
          }

          if (!characterRaidLog) {
            await this.charactersRaidLogsRepository.save({
              logId,
              isIndexed: false,
              createdAt,
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
      const isJobLocked = Boolean(
        await this.redisService.exists(GLOBAL_WCL_KEY_V2),
      );
      if (isJobLocked) {
        this.logger.warn(chalk.yellow('⚠ indexLogs is already running'));
        return;
      }

      await this.redisService.set(GLOBAL_WCL_KEY_V2, '1', 'EX', 60 * 59);

      await delay(10);
      const wclKey = await getKey(this.keysRepository, GLOBAL_WCL_KEY_V2);
      // --- A bit skeptical about taking the interval required semaphore --- //
      const characterRaidLog = await this.charactersRaidLogsRepository.find({
        where: { isIndexed: false },
        take: 5_000,
      });

      if (!characterRaidLog.length) {
        this.logger.log(chalk.blue('ℹ No logs to index'));
        return;
      }

      this.logger.log(
        chalk.cyan(
          `🔄 Processing ${chalk.bold(characterRaidLog.length)} raid logs`,
        ),
      );

      // Reduced concurrency from 5 to 2 to avoid rate limiting on Fights API
      await lastValueFrom(
        from(characterRaidLog).pipe(
          mergeMap(
            (characterRaidLogEntity) =>
              this.indexLogAndPushCharactersToQueue(
                characterRaidLogEntity,
                wclKey,
              ),
            2,
          ),
        ),
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
      this.logger.error(
        chalk.red('✗ Error in indexLogs:'),
        errorOrException.message,
      );
    } finally {
      await this.redisService.del(GLOBAL_WCL_KEY_V2);
    }
  }

  async indexLogAndPushCharactersToQueue(
    characterRaidLogEntity: CharactersRaidLogsEntity,
    wclKey: KeysEntity,
  ) {
    try {
      let raidCharacters: Array<RaidCharacter> = [];

      // Primary: Try Fights API (no token required, no quota limits)
      try {
        raidCharacters = await this.getCharactersFromFightsAPI(
          characterRaidLogEntity.logId,
        );
      } catch (fightsApiError) {
        this.logger.warn(
          chalk.yellow(
            `⚠ Fights API failed for ${characterRaidLogEntity.logId}, falling back to GraphQL`,
          ),
        );

        // Fallback: Try GraphQL API (requires token, has quota)
        raidCharacters = await this.getCharactersFromLogs(
          wclKey.token,
          characterRaidLogEntity.logId,
        );
      }

      await this.charactersRaidLogsRepository.update(
        { logId: characterRaidLogEntity.logId },
        { isIndexed: true },
      );

      this.stats.logsIndexed++;
      this.logger.log(
        `${chalk.green('✓')} Indexed ${chalk.dim(characterRaidLogEntity.logId)} ${chalk.dim('|')} ${chalk.bold(raidCharacters.length)} characters`,
      );

      await this.charactersToQueue(raidCharacters);
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        `${chalk.red('✗')} Failed ${chalk.dim(characterRaidLogEntity.logId)} - ${errorOrException.message}`,
      );
    }
  }

  /**
   * Fetches character roster from Warcraft Logs internal API endpoint.
   * This endpoint doesn't require GraphQL API token and provides full character data.
   * @param logId - The 16-character report ID
   * @returns Array of RaidCharacter objects with name, realm, and timestamp
   */
  async getCharactersFromFightsAPI(
    logId: string,
  ): Promise<Array<RaidCharacter>> {
    try {
      // Add base random delay (1-3 seconds) to avoid rate limiting
      const delayMs = randomInt(1000, 3000);
      await delay(delayMs);

      // Use adaptive rate limiter - automatically adjusts based on 403 errors
      await this.fightsAPIRateLimiter.wait();

      const rateLimiterStats = this.fightsAPIRateLimiter.getStats();
      const isConditionThrottled = rateLimiterStats.isThrottled;

      if (isConditionThrottled) {
        this.logger.warn(
          chalk.yellow(
            `⚠ Rate limiter active: ${Math.round(rateLimiterStats.currentDelayMs / 1000)}s delay, ${rateLimiterStats.errorCount} errors`,
          ),
        );
      }

      const apiUrl = `https://www.warcraftlogs.com/reports/fights-and-participants/${logId}/0`;

      // Use cached XHR headers with referer to appear human
      const headers = this.getXHRHeaders(
        `https://www.warcraftlogs.com/reports/${logId}`,
      );

      const response = await this.httpService.axiosRef.get<FightsAPIResponse>(
        apiUrl,
        {
          headers,
          timeout: 15000,
          validateStatus: (status) => status >= 200 && status < 500, // Don't throw on 4xx
        },
      );

      // Handle rate limiting / blocking
      const isConditionRateLimited =
        response.status === 403 || response.status === 429;
      const isConditionNotFound = response.status === 404;

      if (isConditionRateLimited) {
        // Notify rate limiter to increase delays
        this.fightsAPIRateLimiter.onRateLimit();

        const stats = this.fightsAPIRateLimiter.getStats();
        this.logger.warn(
          chalk.yellow(
            `⚠ Rate limited (${response.status}) for ${logId} - delay increased to ${Math.round(stats.currentDelayMs / 1000)}s`,
          ),
        );
        throw new Error('Rate limited by Warcraft Logs');
      }

      if (isConditionNotFound) {
        this.logger.warn(chalk.yellow(`⚠ Log not found (404) for ${logId}`));
        return [];
      }

      const isConditionBadResponse = response.status !== 200 || !response.data;
      if (isConditionBadResponse) {
        this.logger.warn(
          chalk.yellow(`⚠ Bad response (${response.status}) for ${logId}`),
        );
        throw new Error(`Bad response status: ${response.status}`);
      }

      // Use first fight timestamp or current time
      const timestamp = response.data.fights?.[0]?.start_time || Date.now();

      // Filter friendlies to get only playable characters (exclude NPCs)
      const players = (response.data.friendlies || [])
        .filter((f) => f.type !== 'NPC' && f.server)
        .map((character) => {
          // Normalize character name and realm to match database standards
          const normalizedName = character.name.trim();
          const normalizedRealm = toSlug(character.server); // Already lowercase from toSlug

          return {
            guid: toGuid(normalizedName, normalizedRealm), // Use normalizedRealm for consistency
            name: normalizedName, // Will be capitalized by lifecycle service
            realm: normalizedRealm, // lowercase realm slug
            timestamp: timestamp,
          };
        });

      // Remove duplicates
      const characters = new Map<string, RaidCharacter>();
      for (const character of players) {
        const isCondition = characters.has(character.guid);
        if (isCondition) continue;
        characters.set(character.guid, character);
      }

      // Notify rate limiter of success
      this.fightsAPIRateLimiter.onSuccess();

      this.logger.log(
        `${chalk.green('✓')} Fights API ${chalk.dim(logId)} ${chalk.dim('|')} ${chalk.bold(characters.size)} characters`,
      );

      return Array.from(characters.values());
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getCharactersFromFightsAPI',
        logId,
        error: errorOrException.message,
      });
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
  async getCharactersFromReportHtml(
    logId: string,
  ): Promise<Array<{ name: string; realm?: string }>> {
    try {
      const reportUrl = `https://www.warcraftlogs.com/reports/${logId}`;
      const response = await this.httpService.axiosRef.get<string>(reportUrl, {
        headers: this.getBrowserHeaders(),
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const characters = new Map<string, { name: string; realm?: string }>();

      // Extract report creator name
      const creatorName = $('.report-title-details-text .gold.bold')
        .text()
        .trim();
      if (creatorName) {
        characters.set(creatorName.toLowerCase(), { name: creatorName });
      }

      // Try to extract guild/team name if present
      const guildName = $('.guild-reports-guildName').text().trim();
      if (
        guildName &&
        guildName !== 'Personal Logs' &&
        guildName !== creatorName
      ) {
        characters.set(guildName.toLowerCase(), { name: guildName });
      }

      // Note: Full character roster with realms requires API access
      // HTML pages load this data asynchronously via JavaScript
      this.logger.warn(
        chalk.yellow(
          `⚠ HTML parsing for ${logId} - limited data (creator only). Use API for full roster.`,
        ),
      );

      return Array.from(characters.values());
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'getCharactersFromReportHtml',
        logId,
        error: errorOrException.message,
      });
      return [];
    }
  }

  async getCharactersFromLogs(token: string, logId: string) {
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

    // --- Take both characters ranked & playable --- //
    const timestamp = get(response, 'data.data.reportData.report.startTime', 1);
    const rankedCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.rankedCharacters',
      [],
    ).map((character) => ({
      guid: toGuid(character.name, character.server.slug),
      id: character.id,
      name: character.name,
      realm: toSlug(character.server.slug),
      guildRank: character.guildRank,
      timestamp: timestamp,
    }));

    const playableCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.masterData.actors',
      [],
    )
      .filter((character) => character.type === 'Player')
      .map((character) => ({
        guid: toGuid(character.name, character.server),
        name: character.name,
        realm: toSlug(character.server),
        timestamp: timestamp,
      }));

    const raidCharacters = [...rankedCharacters, ...playableCharacters];
    const characters = new Map<string, RaidCharacter>();

    for (const character of raidCharacters) {
      const isIn = characters.has(character.guid);
      if (isIn) continue;
      characters.set(character.guid, character);
    }

    return Array.from(characters.values());
  }

  async charactersToQueue(
    raidCharacters: Array<RaidCharacter>,
  ): Promise<boolean> {
    try {
      let itx = 0;
      const keys = await getKeys(this.keysRepository, GLOBAL_OSINT_KEY, false);

      const charactersToJobs = raidCharacters.map((raidCharacter) => {
        itx++;
        if (itx >= keys.length) itx = 0;

        return CharacterMessageDto.fromWarcraftLogs({
          name: raidCharacter.name,
          realm: raidCharacter.realm,
          timestamp: raidCharacter.timestamp,
          clientId: keys[itx].client,
          clientSecret: keys[itx].secret,
          accessToken: keys[itx].token,
        });
      });

      await this.publisher.publishBulk(
        charactersQueue.exchange,
        charactersToJobs,
      );
      this.stats.charactersQueued += charactersToJobs.length;
      this.logger.log(
        `${chalk.cyan('→')} Queued ${chalk.bold(charactersToJobs.length)} characters to characterQueue`,
      );
      return true;
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Error in charactersToQueue:'),
        errorOrException.message,
      );
      return false;
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    const rateLimiterStats = this.fightsAPIRateLimiter.getStats();
    const delaySeconds = Math.round(rateLimiterStats.currentDelayMs / 1000);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 WCL SERVICE PROGRESS')}\n` +
        `${chalk.cyan('  ✓ Logs Indexed:')} ${chalk.cyan.bold(this.stats.logsIndexed)}\n` +
        `${chalk.green('  ✓ Logs Created:')} ${chalk.green.bold(this.stats.logsCreated)}\n` +
        `${chalk.yellow('  ⊚ Logs Skipped:')} ${chalk.yellow.bold(this.stats.logsSkipped)}\n` +
        `${chalk.cyan('  → Characters Queued:')} ${chalk.cyan.bold(this.stats.charactersQueued)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Uptime:')} ${chalk.bold(`${hours}h ${minutes}m`)}\n` +
        `${chalk.blue('  🕒 Rate Limiter:')} ${rateLimiterStats.isThrottled ? chalk.yellow.bold(`${delaySeconds}s (throttled)`) : chalk.green.bold(`${delaySeconds}s`)}\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }
}
