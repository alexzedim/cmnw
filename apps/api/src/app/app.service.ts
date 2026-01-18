import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  AnalyticsEntity,
  CharactersEntity,
  GuildsEntity,
  ItemsEntity,
  MarketEntity,
} from '@app/pg';
import {
  AnalyticsMetricSnapshotDto,
  AnalyticsMetricType,
  AppHealthPayload,
  SearchQueryDto,
} from '@app/resources';

@Injectable()
export class AppService {
  private readonly version: string;
  private readonly logger = new Logger(AppService.name, { timestamp: true });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsRepository: Repository<AnalyticsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {
    this.version = this.loadVersion();
  }

  async getMetrics(): Promise<AppHealthPayload> {
    const logTag = 'getMetrics';

    try {
      const latestMarketTimestamp = await this.getLatestCommodityTimestamp();
      const uptimeSeconds = Math.round(process.uptime());
      const uptime = this.formatUptime(uptimeSeconds);

      return {
        status: 'ok',
        version: this.version,
        uptime,
        latestMarketTimestamp,
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Failed to load application metrics',
        errorOrException,
      });

      throw new ServiceUnavailableException('Unable to load application metrics');
    }
  }

  async indexSearch(input: SearchQueryDto): Promise<{
    characters: CharactersEntity[];
    guilds: GuildsEntity[];
    items: ItemsEntity[];
    hashMatches: { count: number };
  }> {
    const logTag = 'indexSearch';
    try {
      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        message: `Performing universal search: ${input.searchQuery}`,
      });

      const searchPattern = `${input.searchQuery}%`;
      const hashTypeChar = input.searchQuery.charAt(0).toLowerCase();
      const isHashQuery =
        /^[ab]$/.test(hashTypeChar) && input.searchQuery.length > 1;
      const hashValue = isHashQuery ? input.searchQuery.slice(1) : null;
      const isNumericQuery = /^\d+$/.test(input.searchQuery);
      const itemIdQuery = isNumericQuery ? parseInt(input.searchQuery, 10) : null;

      const [characters, guilds, items, hashMatches] = await Promise.all([
        this.charactersRepository.find({
          where: {
            guid: ILike(searchPattern),
          },
          take: 100,
        }),
        this.guildsRepository.find({
          where: {
            guid: ILike(searchPattern),
          },
          take: 100,
        }),
        this.itemsRepository
          .createQueryBuilder('items')
          .where('LOWER(items.name) LIKE LOWER(:searchPattern)', {
            searchPattern,
          })
          .orWhere('LOWER(items.names::text) LIKE LOWER(:searchPattern)', {
            searchPattern,
          })
          .orWhere('items.id = :searchQuery', { searchQuery: itemIdQuery })
          .take(100)
          .getMany(),
        isHashQuery
          ? this.charactersRepository
              .createQueryBuilder('c')
              .select('COUNT(*) as count')
              .where(
                hashTypeChar === 'a'
                  ? 'c.hashA = :hashValue'
                  : 'c.hashB = :hashValue',
                { hashValue },
              )
              .getRawOne()
          : Promise.resolve({ count: 0 }),
      ]);

      const hashMatchCount = Number(hashMatches?.count ?? 0);

      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        characterCount: characters.length,
        guildCount: guilds.length,
        itemCount: items.length,
        hashMatchCount,
        message: `Search completed: ${characters.length} characters, ${guilds.length} guilds, ${items.length} items, ${hashMatchCount} hash matches`,
      });

      return {
        characters,
        guilds,
        items,
        hashMatches: {
          count: hashMatchCount,
        },
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        searchQuery: input.searchQuery,
        errorOrException,
        message: `Error performing universal search: ${input.searchQuery}`,
      });

      throw new ServiceUnavailableException(
        `Error performing search for ${input.searchQuery}`,
      );
    }
  }

  async getLatestMetricSnapshot(
    snapshotQuery: AnalyticsMetricSnapshotDto,
  ): Promise<AnalyticsEntity | null> {
    const logTag = 'getLatestMetricSnapshot';
    const {
      category,
      metricType = AnalyticsMetricType.TOTAL,
      realmId,
    } = snapshotQuery;

    try {
      const query = this.analyticsRepository
        .createQueryBuilder('analytics')
        .where('analytics.category = :category', { category })
        .andWhere('analytics.metric_type = :metricType', { metricType });

      if (realmId === undefined) {
        query.andWhere('analytics.realm_id IS NULL');
      } else {
        query.andWhere('analytics.realm_id = :realmId', { realmId });
      }

      const metric = await query
        .orderBy('analytics.snapshot_date', 'DESC')
        .addOrderBy('analytics.created_at', 'DESC')
        .getOne();

      return metric ?? null;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        category,
        metricType,
        realmId,
        message: 'Failed to load analytics metric snapshot',
        errorOrException,
      });

      throw new ServiceUnavailableException(
        'Unable to load analytics metric snapshot',
      );
    }
  }

  private loadVersion(): string {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
      const { version } = JSON.parse(packageJsonContent);
      return version ?? 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getLatestCommodityTimestamp(): Promise<number | null> {
    const latestCommodity = await this.marketRepository
      .createQueryBuilder('market')
      .select('market.timestamp', 'timestamp')
      .where('market.type = :type', { type: 'COMMDTY' })
      .andWhere('market.timestamp IS NOT NULL')
      .orderBy('market.timestamp', 'DESC')
      .limit(1)
      .getRawOne<{ timestamp: string | number | null }>();

    if (!latestCommodity?.timestamp) {
      return null;
    }

    const numericTimestamp =
      typeof latestCommodity.timestamp === 'string'
        ? parseInt(latestCommodity.timestamp, 10)
        : Number(latestCommodity.timestamp);

    return Number.isFinite(numericTimestamp) ? numericTimestamp : null;
  }

  private formatUptime(totalSeconds: number): string {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    const humanReadable = parts.join(' ');
    return `${totalSeconds}s (${humanReadable})`;
  }
}
