import { osintConfig } from '@app/configuration';
import { CharactersRaidLogsEntity, RealmsEntity } from '@app/pg';
import {
  extractZoneReportsRows,
  WCL_DISCOVERY_CURSOR_KEY,
  WCL_HISTORY_CURSOR_KEY,
  WCL_RAID_LOG_STATUS,
  WCL_ZONE_REPORTS_URL_BUILDER,
  type WclZoneReportsRow,
} from '@app/resources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import chalk from 'chalk';
import type Redis from 'ioredis';
import { In, type Repository } from 'typeorm';
import { WclBrowserService } from './wcl-browser.service';

@Injectable()
export class WclDiscoveryService {
  private readonly logger = new Logger(WclDiscoveryService.name, { timestamp: true });

  constructor(
    private readonly browserService: WclBrowserService,
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  /**
   * Freshness pass over a rotating slice of realms: walks the newest
   * /zone/reports pages per realm and stops early once enough already-known
   * log ids show up. New log ids are inserted as 'discovered' and never
   * overwrite existing rows.
   */
  public async sweepFreshness(
    realmsLimit: number,
  ): Promise<{ realms: number; discovered: number; isBlocked: boolean }> {
    const realmsEntities = await this.takeRealms(realmsLimit);
    if (!realmsEntities.length) {
      return { realms: 0, discovered: 0, isBlocked: false };
    }

    let discovered = 0;
    let processed = 0;
    let isBlocked = false;

    for (const realmEntity of realmsEntities) {
      if (!(await this.browserService.isChannelHealthy())) {
        isBlocked = true;
        break;
      }
      const result = await this.walkFreshnessPages(realmEntity);
      processed += 1;
      discovered += result.discovered;
      if (result.isBlocked) {
        isBlocked = true;
        break;
      }
      this.logger.log(
        `${chalk.green('✓')} ${realmEntity.name} ${chalk.dim(`| +${result.discovered} logs | ${result.pages} pages`)}`,
      );
    }

    return { realms: processed, discovered, isBlocked };
  }

  /**
   * Full-history deep pagination, resumable across runs: one realm at a time,
   * page cursor persisted in Redis, advancing to the next realm when a realm
   * runs out of pages or hits the configured page cap.
   */
  public async sweepHistory(pagesBudget: number): Promise<{ discovered: number; isBlocked: boolean }> {
    if (!(await this.browserService.isChannelHealthy())) {
      return { discovered: 0, isBlocked: true };
    }

    let { realmEntity, page } = await this.resolveHistoryCursor();
    let discovered = 0;
    let budget = pagesBudget;

    while (budget > 0) {
      if (page > osintConfig.wclHistoryMaxPages) {
        const nextRealm = await this.takeNextRealm(realmEntity.id);
        if (!nextRealm) {
          await this.redisService.del(WCL_HISTORY_CURSOR_KEY);
          this.logger.log(chalk.green('✓ History sweep complete for all realms'));
          return { discovered, isBlocked: false };
        }
        realmEntity = nextRealm;
        page = 1;
        continue;
      }

      if (!(await this.browserService.isChannelHealthy())) {
        break;
      }

      const result = await this.browserService.fetchHtml(
        WCL_ZONE_REPORTS_URL_BUILDER(realmEntity.warcraftLogsId, page),
      );
      if (result.status === 'blocked') {
        break;
      }
      if (result.status === 'error') {
        this.logger.warn(
          chalk.yellow(`⚠ History page error | ${realmEntity.name} ${chalk.dim(`| page ${page} | ${result.message}`)}`),
        );
        break;
      }

      const rows = extractZoneReportsRows(result.html);
      if (!rows.length) {
        this.logger.log(chalk.blue(`ℹ History exhausted | ${realmEntity.name} ${chalk.dim(`| at page ${page}`)}`));
        const nextRealm = await this.takeNextRealm(realmEntity.id);
        if (!nextRealm) {
          await this.redisService.del(WCL_HISTORY_CURSOR_KEY);
          this.logger.log(chalk.green('✓ History sweep complete for all realms'));
          return { discovered, isBlocked: false };
        }
        realmEntity = nextRealm;
        page = 1;
        continue;
      }

      discovered += await this.insertDiscoveredRows(rows, realmEntity);
      page += 1;
      budget -= 1;
    }

    await this.redisService.set(WCL_HISTORY_CURSOR_KEY, `${realmEntity.id}:${page}`);
    return { discovered, isBlocked: false };
  }

  private async takeRealms(limit: number): Promise<Array<RealmsEntity>> {
    const cursor = Number(await this.redisService.get(WCL_DISCOVERY_CURSOR_KEY)) || 0;
    let realmsEntities = await this.queryRealmsAfter(cursor, limit);
    if (!realmsEntities.length && cursor !== 0) {
      realmsEntities = await this.queryRealmsAfter(0, limit);
    }
    if (realmsEntities.length) {
      await this.redisService.set(WCL_DISCOVERY_CURSOR_KEY, String(realmsEntities[realmsEntities.length - 1].id));
    }
    return realmsEntities;
  }

  private queryRealmsAfter(cursor: number, limit: number): Promise<Array<RealmsEntity>> {
    return this.realmsRepository
      .createQueryBuilder('realm')
      .where('realm.warcraft_logs_id IS NOT NULL AND realm.id > :cursor', { cursor })
      .orderBy('realm.id', 'ASC')
      .take(limit)
      .getMany();
  }

  private takeNextRealm(realmId: number): Promise<RealmsEntity | null> {
    return this.realmsRepository
      .createQueryBuilder('realm')
      .where('realm.warcraft_logs_id IS NOT NULL AND realm.id > :realmId', { realmId })
      .orderBy('realm.id', 'ASC')
      .getOne();
  }

  private async resolveHistoryCursor(): Promise<{ realmEntity: RealmsEntity; page: number }> {
    const rawCursor = await this.redisService.get(WCL_HISTORY_CURSOR_KEY);
    const [realmId, page] = (rawCursor?.split(':') ?? []).map(Number);
    if (realmId && page) {
      const realmEntity = await this.realmsRepository.findOne({ where: { id: realmId } });
      if (realmEntity?.warcraftLogsId) {
        return { realmEntity, page };
      }
    }
    const firstRealm = await this.takeNextRealm(0);
    if (!firstRealm) {
      throw new Error('No realms with warcraftLogsId available for history sweep');
    }
    return { realmEntity: firstRealm, page: 1 };
  }

  private async walkFreshnessPages(
    realmEntity: RealmsEntity,
  ): Promise<{ discovered: number; pages: number; isBlocked: boolean }> {
    let knownCount = 0;
    let discovered = 0;
    let pages = 0;

    for (let page = 1; page <= osintConfig.wclDiscoveryMaxPages; page++) {
      const result = await this.browserService.fetchHtml(
        WCL_ZONE_REPORTS_URL_BUILDER(realmEntity.warcraftLogsId, page),
      );
      if (result.status === 'blocked') {
        return { discovered, pages, isBlocked: true };
      }
      if (result.status === 'error') {
        this.logger.warn(
          chalk.yellow(
            `⚠ Discovery page error | ${realmEntity.name} ${chalk.dim(`| page ${page} | ${result.message}`)}`,
          ),
        );
        return { discovered, pages, isBlocked: false };
      }

      pages = page;
      const rows = extractZoneReportsRows(result.html);
      if (!rows.length) {
        break;
      }

      const logIds = rows.map((row) => row.logId);
      const existingLogs = await this.charactersRaidLogsRepository.find({
        where: { logId: In(logIds) },
        select: { logId: true },
      });
      knownCount += existingLogs.length;

      const existingIds = new Set(existingLogs.map((log) => log.logId));
      const freshRows = rows.filter((row) => !existingIds.has(row.logId));
      if (freshRows.length) {
        discovered += await this.insertDiscoveredRows(freshRows, realmEntity);
      }

      if (knownCount >= osintConfig.wclDiscoveryKnownThreshold) {
        break;
      }
    }

    return { discovered, pages, isBlocked: false };
  }

  private async insertDiscoveredRows(rows: Array<WclZoneReportsRow>, realmEntity: RealmsEntity): Promise<number> {
    if (!rows.length) return 0;
    const insertResult = await this.charactersRaidLogsRepository
      .createQueryBuilder()
      .insert()
      .into(CharactersRaidLogsEntity)
      .values(
        rows.map(({ logId, startedAt }) => ({
          logId,
          status: WCL_RAID_LOG_STATUS.DISCOVERED,
          isIndexed: false,
          realmSlug: realmEntity.slug,
          startedAt,
        })),
      )
      .orIgnore()
      .execute();
    return Number((insertResult.raw as { rowCount?: number })?.rowCount ?? 0);
  }
}
