import { Queue } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';

import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth'
import { Browser, Page } from 'playwright';
import { S3Service } from './s3.service';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import {
  CharacterJobQueue,
  charactersQueue,
  delay,
  GuildJobQueue,
  guildsQueue, OSINT_LFG_WOW_PROGRESS,
  ProfileJobQueue,
  profileQueue,
} from '@app/resources';


export interface WowProgressLink {
  href: string;
  text: string;
  fileName: string;
}

interface DownloadResult {
  success: boolean;
  skip: boolean;
  fileName?: string;
  s3Key?: string;
  fileSize?: number;
  s3Location?: string;
  error?: string;
}


export interface DownloadSummary {
  totalFiles: number;
  successful: number;
  failed: number;
  skipped: number;
  downloadPath: string;
  results: DownloadResult[];
}

@Injectable()
export class WowProgressRanksService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WowProgressRanksService.name);
  private readonly baseUrl = 'https://www.wowprogress.com/export/ranks/';
  private readonly s3Bucket = 'cmnw-wow-progress';
  private readonly maxRetries = 3;
  private readonly retryDelay = 2; // 2 seconds
  private readonly requestDelay = 1; // 1 second between requests

  private browser: Browser;
  private page: Page;

  constructor(
    private s3Service: S3Service,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
    @InjectQueue(profileQueue.name)
    private readonly queueProfile: Queue<ProfileJobQueue, number>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacters: Queue<CharacterJobQueue, number>,
  ) {
    chromium.use(stealth());
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Initializing WoW Progress Service...');
    await this.a();
    return;
    try {
      await this.initializeBrowser();
      // Optional: Start downloading on bootstrap
      await this.downloadAllRanks();

      this.logger.log('WoW Progress Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WoW Progress Service', error);
      throw error;
    }
  }

  /**
   * Initialize browser and page
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      this.page = await this.browser.newPage();

      // Set realistic viewport and user agent
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      this.logger.log('Browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser', error);
      throw error;
    }
  }

  /**
   * Parse all available rank files from the main directory
   */
  async parseAvailableFiles(): Promise<WowProgressLink[]> {
    try {
      this.logger.log('Parsing available files...');

      // Navigate to the main ranks directory
      await this.page.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Extract all file links
      const links = await this.page.$$eval('a[href]', (anchors) => {
        return anchors
          .map(anchor => ({
            href: anchor.href,
            text: anchor.textContent?.trim() || ''
          }))
          .filter(link => {
            // Filter for actual rank files
            return link.href &&
              link.text &&
              link.href.includes('eu_')
          });
      });

      // Process links and check if already downloaded
      const processedLinks: WowProgressLink[] = links.map(link => {
        const fileName = link.text.trim();

        return {
          href: link.href,
          text: link.text,
          fileName,
        };
      });

      this.logger.log(`Found ${processedLinks.length} rank files`);

      return processedLinks;
    } catch (error) {
      this.logger.error('Failed to parse available files', error);
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
      this.logger.log(`  ⏭️ Skipped: ${fileName}`);
      return {
        success: true,
        skip: true,
        fileName: link.fileName,
        fileSize: isFileExists.size,
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Downloading ${fileName} (attempt ${attempt}/${this.maxRetries})`);

        const result = await this.downloadWithFetch(link.href, fileName);

        if (result.success) {
          this.logger.log(`✅ Downloaded: ${fileName} (${result.fileSize} bytes)`);
          return result;
        }

        if (attempt < this.maxRetries) {
          this.logger.warn(`Retrying ${fileName} in ${this.retryDelay}ms...`);
          await delay(this.retryDelay);
        }

      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed for ${fileName}:`, error.message);

        if (attempt === this.maxRetries) {
          return {
            success: false,
            skip: false,
            fileName: fileName,
            error: error.message
          };
        }

        await delay(this.retryDelay);
      }
    }

    return {
      success: false,
      skip: false,
      fileName: link.fileName,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Download file using fetch in browser context
   */
  private async downloadWithFetch(url: string, fileName: string): Promise<DownloadResult> {
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
              'Accept': 'application/octet-stream, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Referer': 'https://www.wowprogress.com/export/ranks/',
              // @ts-ignore
              'User-Agent': navigator.userAgent
            }
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
            contentType: responseContentType
          };

        } catch (error) {
          return {
            success: false,
            error: error.message
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
        metadata: { 'export-type': 'rankings', 'compression': 'gzip' }
      });

      return {
        success: true,
        skip: false,
        fileName: fileName,
        fileSize: result.size
      };

    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Download all rank files
   */
  async downloadAllRanks(): Promise<DownloadSummary> {
    try {
      const isExists = await this.s3Service.ensureBucketExists();
      if (!isExists) return;

      this.logger.log('Starting bulk download of WoW Progress ranks...');

      const filesToDownload = await this.parseAvailableFiles();
      const linksCount = filesToDownload.length;

      this.logger.log(`Downloading ${filesToDownload.length} files...`);

      const results: DownloadResult[] = [];

      let successful = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < linksCount; i++) {
        const link = filesToDownload[i];

        this.logger.log(`Progress: ${i + 1}/${linksCount} - ${link.fileName}`);

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
          this.logger.error(`Failed to download ${link.fileName}: ${result.error}`);
        }

        // Rate limiting between downloads
        if (i < filesToDownload.length - 1) {
          await delay(this.requestDelay);
        }
      }

      const summary: DownloadSummary = {
        totalFiles: linksCount,
        successful,
        failed,
        skipped,
        downloadPath: this.s3Bucket,
        results
      };

      this.logger.log(`Download Summary:`);
      this.logger.log(`  Total files: ${summary.totalFiles}`);
      this.logger.log(`  ✅ Successful: ${summary.successful}`);
      this.logger.log(`  ❌ Failed: ${summary.failed}`);
      this.logger.log(`  ⏭️ Skipped: ${summary.skipped}`);
      this.logger.log(`  📁 Location: ${summary.downloadPath}`);

      return summary;

    } catch (error) {
      this.logger.error('Bulk download failed', error);
      throw error;
    }
  }

  /**
   * Clean up browser resources
   */
  async onApplicationShutdown(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.log('Browser resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }

  async a() {
    const logTag = this.a.name;
    try {
      const b = await this.s3Service.findGzFiles(this.s3Bucket, 'eu_');

      for (const fileName of b) {
        const t = await this.s3Service.readAndDecompressGzFile(this.s3Bucket, fileName);
        console.log(t);
      }

    } catch (e) {
      console.log(e);
    }
  }
}
