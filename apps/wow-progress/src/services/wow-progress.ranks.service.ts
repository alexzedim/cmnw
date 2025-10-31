import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'playwright';
import { S3Service } from '@app/s3';
import ms from 'ms';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import chalk from 'chalk';

import {
  delay,
  GuildJobQueue,
  guildsQueue,
  WowProgressLink,
  DownloadSummary,
  DownloadResult,
  isValidArray,
  isWowProgressJson,
  extractRealmName,
  WowProgressJson,
  toGuid,
  getKeys,
  GLOBAL_OSINT_KEY,
  OSINT_SOURCE,
  IGuildJob,
} from '@app/resources';
import { findRealm } from '@app/resources/dao/realms.dao';

@Injectable()
export class WowProgressRanksService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(WowProgressRanksService.name);
  private readonly baseUrl = 'https://www.wowprogress.com/export/ranks/';
  private readonly maxRetries = 3;
  private readonly retryDelay = 2; // 2 seconds
  private readonly requestDelay = 1; // 1 second between requests
  private keyEntities: KeysEntity[];
  private guildJobsItx = 0;

  private stats = {
    filesDownloaded: 0,
    filesSkipped: 0,
    filesFailed: 0,
    guildsQueued: 0,
    realmsSkipped: 0,
    errors: 0,
    startTime: Date.now(),
  };

  private browser: Browser;
  private page: Page;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    private s3Service: S3Service,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
  ) {
    chromium.use(stealth());
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(
      chalk.cyan('\n🚀 Initializing WoW Progress Ranks Service...'),
    );

    try {
      await this.initializeBrowser();
      // Optional: Start downloading on bootstrap
      await this.downloadAllRanks();
      await this.extractAllGuildRanks();

      this.logger.log(
        chalk.green('✓ WoW Progress Service initialized successfully'),
      );
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Failed to initialize WoW Progress Service:'),
        errorOrException.message,
      );
    }
  }

  /**
   * Initialize browser and page
   */
  private async initializeBrowser(): Promise<void> {
    const logTag = this.initializeBrowser.name;
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      this.page = await this.browser.newPage();

      // Set realistic viewport and user agent
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      this.logger.log(chalk.green('✓ Browser initialized successfully'));
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Failed to initialize browser:'),
        errorOrException.message,
      );

      throw errorOrException;
    }
  }

  /**
   * Parse all available rank files from the main directory
   */
  async parseAvailableFiles(): Promise<WowProgressLink[]> {
    try {
      this.logger.log(chalk.cyan('🔍 Parsing available files...'));

      // Navigate to the main ranks directory
      await this.page.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Extract all file links
      const links = await this.page.$$eval('a[href]', (anchors) => {
        return anchors
          .map((anchor) => ({
            href: anchor.href,
            text: anchor.textContent?.trim() || '',
          }))
          .filter((link) => {
            // Filter for actual rank files
            return link.href && link.text && link.href.includes('eu_');
          });
      });

      // Process links and check if already downloaded
      const processedLinks: WowProgressLink[] = links.map((link) => {
        const fileName = link.text.trim();

        return {
          href: link.href,
          text: link.text,
          fileName,
        };
      });

      this.logger.log(
        chalk.green(`✓ Found ${chalk.bold(processedLinks.length)} rank files`),
      );

      return processedLinks;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Failed to parse available files:'),
        error.message,
      );
      throw error;
    }
  }

  /**
   * Download a single file with retry logic
   */
  async downloadFile(link: WowProgressLink): Promise<DownloadResult> {
    const fileName = link.fileName;

    const isFileExists = await this.s3Service.getFileMetadata(fileName);

    if (isFileExists.exists) {
      this.stats.filesSkipped++;
      this.logger.log(`${chalk.yellow('⊘')} Skipped ${chalk.dim(fileName)}`);
      return {
        success: true,
        skip: true,
        fileName: link.fileName,
        fileSize: isFileExists.size,
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(
          chalk.cyan(
            `📥 Downloading ${chalk.dim(fileName)} ${chalk.dim(`(${attempt}/${this.maxRetries})`)}`,
          ),
        );

        const result = await this.downloadWithFetch(link.href, fileName);

        if (result.success) {
          this.stats.filesDownloaded++;
          this.logger.log(
            `${chalk.green('✓')} Downloaded ${chalk.cyan(fileName)} ${chalk.dim(`(${result.fileSize} bytes)`)}`,
          );
          return result;
        }

        if (attempt < this.maxRetries) {
          this.logger.warn(
            chalk.yellow(
              `⚠ Retrying ${chalk.dim(fileName)} in ${this.retryDelay}s...`,
            ),
          );
          await delay(this.retryDelay);
        }
      } catch (error) {
        this.logger.error(
          chalk.red(
            `✗ Attempt ${attempt} failed for ${chalk.dim(fileName)}: ${error.message}`,
          ),
        );

        if (attempt === this.maxRetries) {
          this.stats.filesFailed++;
          return {
            success: false,
            skip: false,
            fileName: fileName,
            error: error.message,
          };
        }

        await delay(this.retryDelay);
      }
    }

    return {
      success: false,
      skip: false,
      fileName: link.fileName,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Download file using fetch in browser context
   */
  private async downloadWithFetch(
    url: string,
    fileName: string,
  ): Promise<DownloadResult> {
    const logTag = this.downloadWithFetch.name;
    try {
      // First ensure we have a session by visiting the main page
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });

      // Download using fetch in browser context
      const result = await this.page.evaluate(async (downloadUrl) => {
        try {
          const response = await fetch(downloadUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              Accept: 'application/octet-stream, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              Referer: 'https://www.wowprogress.com/export/ranks/',
              // @ts-ignore
              'User-Agent': navigator.userAgent,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();

          // Extract content type from response headers if not provided
          const responseContentType = response.headers.get('content-type');

          return {
            success: true,
            data: Array.from(new Uint8Array(arrayBuffer)),
            size: arrayBuffer.byteLength,
            contentType: responseContentType,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      }, url);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Determine content type
      const buffer = Buffer.from(result.data);
      await this.s3Service.writeFile(fileName, buffer, {
        contentType: 'application/gzip',
        metadata: { 'export-type': 'rankings', compression: 'gzip' },
      });

      return {
        success: true,
        skip: false,
        fileName: fileName,
        fileSize: result.size,
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: errorOrException.message,
        errorOrException,
      });
      throw new Error(`Download failed: ${errorOrException.message}`);
    }
  }

  /**
   * Download all rank files
   */
  async downloadAllRanks(): Promise<DownloadSummary> {
    const startTime = Date.now();
    try {
      const isExists = await this.s3Service.ensureBucketExists();
      if (!isExists) return;

      this.logger.log(
        chalk.cyan('\n📦 Starting bulk download of WoW Progress ranks...'),
      );

      const filesToDownload = await this.parseAvailableFiles();
      const linksCount = filesToDownload.length;

      this.logger.log(
        chalk.cyan(
          `📥 Downloading ${chalk.bold(filesToDownload.length)} files...`,
        ),
      );

      const results: DownloadResult[] = [];

      let successful = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < linksCount; i++) {
        const link = filesToDownload[i];

        // Progress report every 10 files
        if (i % 10 === 0 && i > 0) {
          this.logger.log(
            chalk.blue(
              `ℹ Progress: ${chalk.bold(`${i}/${linksCount}`)} files processed`,
            ),
          );
        }

        const result = await this.downloadFile(link);
        results.push(result);

        if (result.skip) {
          skipped++;
          continue;
        }

        if (result.success) {
          successful++;
        } else {
          failed++;
          this.logger.error(
            chalk.red(
              `✗ Failed to download ${chalk.dim(link.fileName)}: ${result.error}`,
            ),
          );
        }

        // Rate limiting between downloads
        if (i < filesToDownload.length - 1) {
          await delay(this.requestDelay);
        }
      }

      const bucketName = this.s3Service.getDefaultBucketName();
      const summary: DownloadSummary = {
        totalFiles: linksCount,
        successful,
        failed,
        skipped,
        downloadPath: bucketName,
        results,
      };

      const duration = Date.now() - startTime;
      this.logger.log(
        `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
          `${chalk.magenta('📊 DOWNLOAD SUMMARY')}\n` +
          `${chalk.dim('  Total files:')} ${chalk.bold(summary.totalFiles)}\n` +
          `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(summary.successful)}\n` +
          `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(summary.failed)}\n` +
          `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(summary.skipped)}\n` +
          `${chalk.dim('  Location:')} ${chalk.dim(summary.downloadPath)}\n` +
          `${chalk.dim('  Duration:')} ${chalk.bold(Math.round(duration / 1000))}s\n` +
          `${chalk.magenta.bold('━'.repeat(60))}`,
      );

      return summary;
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Bulk download failed:'),
        errorOrException.message,
      );
      throw errorOrException;
    }
  }

  async extractAllGuildRanks(clearance: string = GLOBAL_OSINT_KEY) {
    const startTime = Date.now();
    try {
      const bucketName = this.s3Service.getDefaultBucketName();
      const listWowProgressGzipFiles = await this.s3Service.findGzFiles(
        bucketName,
        'eu_',
      );

      this.logger.log(
        chalk.cyan(
          `\n📊 Extracting guilds from ${chalk.bold(listWowProgressGzipFiles.length)} rank files...`,
        ),
      );

      this.keyEntities = await getKeys(
        this.keysRepository,
        clearance,
        false,
        true,
      );

      for (const fileName of listWowProgressGzipFiles) {
        const realmName = extractRealmName(fileName);
        if (!realmName) {
          this.stats.realmsSkipped++;
          this.logger.warn(
            chalk.yellow(
              `⚠ Unable to extract realm from ${chalk.dim(fileName)}`,
            ),
          );
          continue;
        }

        const realm = await findRealm(this.realmsRepository, realmName);
        if (!realm) {
          this.stats.realmsSkipped++;
          this.logger.warn(
            chalk.yellow(`⚠ Realm not found: ${chalk.dim(realmName)}`),
          );
          continue;
        }

        const jsonRankings = await this.s3Service.readAndDecompressGzFile(
          fileName,
          bucketName,
        );

        const isGuildRankingArray = isValidArray(jsonRankings);
        if (!isGuildRankingArray) {
          this.stats.realmsSkipped++;
          this.logger.warn(
            chalk.yellow(`⚠ Invalid data for realm ${chalk.dim(realm.slug)}`),
          );
          continue;
        }

        // Calculate file checksum and check if already imported
        const fileContent = JSON.stringify(jsonRankings);
        const fileChecksum = createHash('md5')
          .update(fileContent)
          .digest('hex');
        const redisKey = `WP_RANKS_FILE_IMPORTED:${fileChecksum}`;

        const isAlreadyImported = await this.redisService.exists(redisKey);
        if (isAlreadyImported) {
          this.logger.log(
            `${chalk.yellow('⊘')} Skipped ${chalk.dim(fileName)} ${chalk.dim('(already imported)')}`,
          );
          continue;
        }

        const guildRankings = (jsonRankings as Array<unknown>)
          .filter((guild) => isWowProgressJson(guild))
          .map((wowProgressGuild) =>
            this.transformWowProgressToGuildJobs(wowProgressGuild, realm.slug),
          );

        await this.queueGuilds.addBulk(guildRankings);
        this.stats.guildsQueued += guildRankings.length;
        this.logger.log(
          `${chalk.green('✓')} Queued ${chalk.bold(guildRankings.length)} guilds from ${chalk.dim(realm.slug)}`,
        );

        // Mark file as imported with checksum
        await this.redisService.set(
          redisKey,
          Date.now(),
          'EX',
          60 * 60 * 24 * 30,
        ); // 30 days TTL
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        chalk.green(
          `\n✓ Extraction completed in ${chalk.bold(Math.round(duration / 1000))}s`,
        ),
      );
      this.logProgress();
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Guild extraction failed:'),
        errorOrException.message,
      );
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 WOW PROGRESS RANKS SERVICE')}\n` +
        `${chalk.green('  ✓ Files Downloaded:')} ${chalk.green.bold(this.stats.filesDownloaded)}\n` +
        `${chalk.yellow('  ⊘ Files Skipped:')} ${chalk.yellow.bold(this.stats.filesSkipped)}\n` +
        `${chalk.red('  ✗ Files Failed:')} ${chalk.red.bold(this.stats.filesFailed)}\n` +
        `${chalk.cyan('  → Guilds Queued:')} ${chalk.cyan.bold(this.stats.guildsQueued)}\n` +
        `${chalk.yellow('  ⚠ Realms Skipped:')} ${chalk.yellow.bold(this.stats.realmsSkipped)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Uptime:')} ${chalk.bold(`${hours}h ${minutes}m`)}\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  transformWowProgressToGuildJobs = (
    obj: WowProgressJson,
    realmSlug: string,
  ): IGuildJob => {
    const guildGuid = toGuid(obj.name, realmSlug);

    const { client, secret, token } =
      this.keyEntities[this.guildJobsItx % this.keyEntities.length];

    this.guildJobsItx = this.guildJobsItx + 1;

    return {
      name: guildGuid,
      data: {
        guid: guildGuid,
        name: obj.name,
        realm: realmSlug,
        accessToken: token,
        clientId: client,
        clientSecret: secret,
        createOnlyUnique: true,
        forceUpdate: ms('12h'),
        iteration: this.guildJobsItx,
        region: 'eu',
        createdBy: OSINT_SOURCE.WOW_PROGRESS,
        updatedBy: OSINT_SOURCE.WOW_PROGRESS,
      },
      opts: {
        jobId: guildGuid,
        priority: 3,
      },
    };
  };

  async onApplicationShutdown(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.log(chalk.green('✓ Browser resources cleaned up'));
    } catch (errorOrException) {
      this.logger.error(
        chalk.red('✗ Error cleaning up browser:'),
        errorOrException.message,
      );
    }
  }
}
