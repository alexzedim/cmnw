import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersRaidLogsEntity,
  GuildsEntity,
  ItemsEntity,
  MarketEntity,
  RealmsEntity,
} from '@app/pg';
import {
  AnalyticsMetricHistoryDto,
  AnalyticsMetricSnapshotDto,
  AnalyticsMetricType,
  AppHealthPayload,
  HASH_TYPE_REGEX,
  IRaidLogsStats,
  ISearchResult,
  NUMERIC_ID_REGEX,
  RaidLogsStatsDto,
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
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
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

  async getRaidLogsStats(input: RaidLogsStatsDto): Promise<IRaidLogsStats> {
    const logTag = 'getRaidLogsStats';

    try {
      let realmSlug = input.realmSlug ?? null;

      if (!realmSlug && (input.realmName || input.realmId !== undefined)) {
        const realm = await this.realmsRepository.findOne({
          where: [
            ...(input.realmName ? [{ name: input.realmName }] : []),
            ...(input.realmId !== undefined ? [{ id: input.realmId }] : []),
          ],
          select: ['slug'],
        });
        realmSlug = realm?.slug ?? null;
      }

      const query = this.charactersRaidLogsRepository
        .createQueryBuilder('logs')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE logs.is_indexed = true)', 'indexed')
        .addSelect('COUNT(*) FILTER (WHERE logs.is_indexed = false)', 'notIndexed');

      if (realmSlug) {
        query.andWhere('logs.realm_slug = :realmSlug', { realmSlug });
      }

      const result = await query.getRawOne<{ total: string; indexed: string; notIndexed: string }>();

      return {
        realmSlug,
        total: Number(result?.total ?? 0),
        indexed: Number(result?.indexed ?? 0),
        notIndexed: Number(result?.notIndexed ?? 0),
      };
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
      throw new ServiceUnavailableException('Unable to load raid logs statistics');
    }
  }

  async indexSearch(input: SearchQueryDto): Promise<ISearchResult> {
    const logTag = 'indexSearch';
    try {
      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        message: `Performing universal search: ${input.searchQuery}`,
      });

      const searchPattern = `${input.searchQuery}%`;
      const hashTypeChar = input.searchQuery.charAt(0).toLowerCase();
      const isHashQuery = HASH_TYPE_REGEX.test(hashTypeChar) && input.searchQuery.length > 1;
      const hashValue = isHashQuery ? input.searchQuery.slice(1) : null;
      const isNumericQuery = NUMERIC_ID_REGEX.test(input.searchQuery);
      const itemIdQuery = isNumericQuery ? parseInt(input.searchQuery, 10) : null;

      const [characters, guilds, items, realms, hashMatches] = await Promise.all([
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
        this.realmsRepository
          .createQueryBuilder('realms')
          .where('realms.id != 1')
          .andWhere(
            '(LOWER(realms.name) LIKE LOWER(:searchPattern) OR LOWER(realms.slug) LIKE LOWER(:searchPattern) OR realms.id = :itemIdQuery)',
            { searchPattern, itemIdQuery },
          )
          .select([
            'realms.id',
            'realms.slug',
            'realms.name',
            'realms.region',
            'realms.category',
            'realms.populationStatus',
            'realms.connectedRealmId',
            'realms.connectedRealms',
          ])
          .take(10)
          .getMany(),
        isHashQuery
          ? this.charactersRepository
              .createQueryBuilder('c')
              .select('COUNT(*) as count')
              .where(hashTypeChar === 'a' ? 'c.hashA = :hashValue' : 'c.hashB = :hashValue', { hashValue })
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
        realmCount: realms.length,
        hashMatchCount,
        message: `Search completed: ${characters.length} characters, ${guilds.length} guilds, ${items.length} items, ${realms.length} realms, ${hashMatchCount} hash matches`,
      });

      return {
        characters,
        guilds,
        items,
        realms,
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

      throw new ServiceUnavailableException(`Error performing search for ${input.searchQuery}`);
    }
  }

  async getLatestMetricSnapshot(snapshotQuery: AnalyticsMetricSnapshotDto): Promise<AnalyticsEntity | null> {
    const logTag = 'getLatestMetricSnapshot';
    const { category, metricType = AnalyticsMetricType.TOTAL, realmId } = snapshotQuery;

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

      if (!metric) return null;

      if (category === 'market' || category === 'contracts') {
        await this.enrichWithItemNames(metric);
      }

      return metric;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        category,
        metricType,
        realmId,
        message: 'Failed to load analytics metric snapshot',
        errorOrException,
      });

      throw new ServiceUnavailableException('Unable to load analytics metric snapshot');
    }
  }

  async getMetricHistory(historyQuery: AnalyticsMetricHistoryDto): Promise<AnalyticsEntity[]> {
    const logTag = 'getMetricHistory';
    const { category, metricType = AnalyticsMetricType.TOTAL, realmId, fromDate, toDate } = historyQuery;

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

      if (fromDate) {
        query.andWhere('analytics.snapshot_date >= :fromDate', { fromDate });
      }

      if (toDate) {
        query.andWhere('analytics.snapshot_date <= :toDate', { toDate });
      }

      const metrics = await query.orderBy('analytics.snapshot_date', 'ASC').getMany();

      if (metrics.length === 0) return [];

      if (category === 'market' || category === 'contracts') {
        await Promise.all(metrics.map((metric) => this.enrichWithItemNames(metric)));
      }

      return metrics;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        category,
        metricType,
        realmId,
        message: 'Failed to load analytics metric history',
        errorOrException,
      });

      throw new ServiceUnavailableException('Unable to load analytics metric history');
    }
  }

  private async enrichWithItemNames(entity: AnalyticsEntity): Promise<void> {
    const value = entity.value;
    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;

    // Case 1: value itself is a single record with itemId at top level
    if (typeof record.itemId === 'number') {
      const item = await this.itemsRepository.findOne({
        where: { id: record.itemId },
        select: ['id', 'name', 'names'],
      });
      if (item) {
        if (item.name) record.name = item.name;
        if (item.names) record.names = item.names;
      }
      return;
    }

    // Case 2: value is a map of records (some entries have itemId)
    const itemIds: number[] = [];
    for (const entry of Object.values(record)) {
      if (entry && typeof entry === 'object' && 'itemId' in entry) {
        const itemId = (entry as Record<string, unknown>).itemId;
        if (typeof itemId === 'number') itemIds.push(itemId);
      }
    }

    if (itemIds.length === 0) return;

    const items = await this.itemsRepository.find({
      where: { id: In(itemIds) },
      select: ['id', 'name', 'names'],
    });

    const itemMap = new Map(items.map((item) => [item.id, item]));

    for (const key of Object.keys(record)) {
      const entry = record[key];
      if (entry && typeof entry === 'object' && 'itemId' in entry) {
        const itemId = (entry as Record<string, unknown>).itemId;
        if (typeof itemId !== 'number') continue;
        const item = itemMap.get(itemId);
        if (!item) continue;
        const enriched = entry as Record<string, unknown>;
        if (item.name) enriched.name = item.name;
        if (item.names) enriched.names = item.names;
      }
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
