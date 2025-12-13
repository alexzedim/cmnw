import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { DateTime } from 'luxon';
import {
  AnalyticsMetricEntity,
  CharactersEntity,
  GuildsEntity,
  MarketEntity,
  ContractEntity,
  RealmsEntity,
} from '@app/pg';
import {
  AnalyticsMetric,
  CharacterFactionAggregation,
  CharacterClassAggregation,
  CharacterRaceAggregation,
  CharacterLevelAggregation,
  CharacterRealmAggregation,
  CharacterRealmFactionAggregation,
  CharacterRealmClassAggregation,
  CharacterExtreme,
  CharacterAverages,
  GuildTotalMetrics,
  GuildCountAggregation,
  GuildRealmAggregation,
  GuildRealmFactionAggregation,
  GuildSizeDistribution,
  GuildTopByMembers,
  MarketTotalMetrics,
  MarketAggregateCount,
  MarketAggregatePrice,
  MarketByConnectedRealm,
  MarketByFaction,
  MarketPriceRanges,
  MarketTopByVolume,
  MarketTopByAuctions,
  ContractTotalMetrics,
  ContractCommoditiesData,
  ContractByConnectedRealm,
  ContractTopByQuantity,
  ContractTopByOpenInterest,
  ContractPriceVolatility,
} from '@app/resources/types';

@Injectable()
export class AnalyticsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnalyticsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsMetricEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsMetricEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const logTag = 'onApplicationBootstrap';
    try {
      const today = DateTime.now().startOf('day').toJSDate();

      // Check if today's snapshot already exists
      const todaySnapshot = await this.analyticsMetricRepository.findOne({
        where: {
          snapshotDate: MoreThan(today),
        },
      });

      // Check table row count
      const tableRowCount = await this.analyticsMetricRepository.count();

      this.logger.log({
        logTag,
        message: 'Analytics service initialized',
        tableRowCount,
        todaySnapshotExists: !!todaySnapshot,
      });

      // If table is empty (first launch) or no snapshot for today, run immediately
      if (tableRowCount === 0 || !todaySnapshot) {
        this.logger.log({
          logTag,
          message: 'No snapshot for today detected, running computation immediately',
          tableRowCount,
        });
        await this.computeDailySnapshot();
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error during bootstrap initialization',
        errorOrException,
      });
    }
  }

  @Cron('0 2 * * *')
  private async computeDailySnapshot(): Promise<void> {
    const logTag = 'computeDailySnapshot';
    const startTime = Date.now();
    const snapshotDate = DateTime.now().toJSDate();

    try {
      this.logger.log({
        logTag,
        message: 'Starting daily analytics computation',
        snapshotDate: snapshotDate.toISOString(),
      });

      // Compute all metrics in parallel
      const [charMetrics, guildMetrics, marketMetrics, contractMetrics] = await Promise.all([
        this.computeCharacterMetrics(snapshotDate),
        this.computeGuildMetrics(snapshotDate),
        this.computeMarketMetrics(snapshotDate),
        this.computeContractMetrics(snapshotDate),
      ]);

      // Combine all metrics
      const allMetrics: AnalyticsMetric[] = [
        ...charMetrics,
        ...guildMetrics,
        ...marketMetrics,
        ...contractMetrics,
      ];

      // Save to PostgreSQL
      await this.saveMetrics(allMetrics);

      // Cache latest metrics
      await this.cacheSnapshot(allMetrics);

      const duration = Date.now() - startTime;
      this.logger.log({
        logTag,
        message: 'Daily analytics computation completed',
        metricsCount: allMetrics.length,
        durationMs: duration,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error during daily analytics computation',
        errorOrException,
      });
      throw errorOrException;
    }
  }

  private async computeCharacterMetrics(snapshotDate: Date): Promise<AnalyticsMetric[]> {
    const logTag = 'computeCharacterMetrics';
    const metrics: AnalyticsMetric[] = [];

    try {
      // Total count
      const totalCount = await this.charactersRepository.count();
      const inGuildsCount = await this.charactersRepository.count({
        where: { guildGuid: MoreThan('') },
      });
      const notInGuildsCount = totalCount - inGuildsCount;

      metrics.push({
        category: 'characters',
        metricType: 'total',
        value: { count: totalCount, inGuilds: inGuildsCount, notInGuilds: notInGuildsCount },
        snapshotDate,
      });

      // By Faction (global)
      const byFaction = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.faction', 'faction')
        .addSelect('COUNT(*)', 'count')
        .where('c.faction IS NOT NULL')
        .groupBy('c.faction')
        .getRawMany<CharacterFactionAggregation>();

      const factionMap = byFaction.reduce(
        (acc, row) => {
          acc[row.faction] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      metrics.push({
        category: 'characters',
        metricType: 'byFaction',
        value: factionMap,
        snapshotDate,
      });

      // By Class (global)
      const byClass = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.class', 'class')
        .addSelect('COUNT(*)', 'count')
        .where('c.class IS NOT NULL')
        .groupBy('c.class')
        .getRawMany<CharacterClassAggregation>();

      const classMap = byClass.reduce(
        (acc, row) => {
          acc[row.class] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      metrics.push({
        category: 'characters',
        metricType: 'byClass',
        value: classMap,
        snapshotDate,
      });

      // By Race (global)
      const byRace = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.race', 'race')
        .addSelect('COUNT(*)', 'count')
        .where('c.race IS NOT NULL')
        .groupBy('c.race')
        .getRawMany<CharacterRaceAggregation>();

      const raceMap = byRace.reduce(
        (acc, row) => {
          acc[row.race] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      metrics.push({
        category: 'characters',
        metricType: 'byRace',
        value: raceMap,
        snapshotDate,
      });

      // By Level (global)
      const byLevel = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.level', 'level')
        .addSelect('COUNT(*)', 'count')
        .where('c.level IS NOT NULL')
        .groupBy('c.level')
        .getRawMany<CharacterLevelAggregation>();

      const levelMap = byLevel.reduce(
        (acc, row) => {
          acc[String(row.level)] = parseInt(<string><unknown>acc[String(row.level)] || '0', 10) + parseInt(row.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      metrics.push({
        category: 'characters',
        metricType: 'byLevel',
        value: levelMap,
        snapshotDate,
      });

      // By Realm (with guild counts)
      const byRealm = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.realm_id', 'realmId')
        .addSelect('COUNT(*)', 'total')
        .addSelect(
          `SUM(CASE WHEN c.guild_guid IS NOT NULL THEN 1 ELSE 0 END)`,
          'inGuilds',
        )
        .groupBy('c.realm_id')
        .getRawMany<CharacterRealmAggregation>();

      for (const realmData of byRealm) {
        metrics.push({
          category: 'characters',
          metricType: 'total',
          realmId: realmData.realmId,
          value: {
            count: parseInt(realmData.total, 10),
            inGuilds: parseInt(realmData.inGuilds || '0', 10),
            notInGuilds: parseInt(realmData.total, 10) - parseInt(realmData.inGuilds || '0', 10),
          },
          snapshotDate,
        });
      }

      // By Realm + Faction
      const byRealmFaction = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.realm_id', 'realmId')
        .addSelect('c.faction', 'faction')
        .addSelect('COUNT(*)', 'count')
        .where('c.faction IS NOT NULL')
        .groupBy('c.realm_id, c.faction')
        .getRawMany<CharacterRealmFactionAggregation>();

      const byRealmFactionMap = byRealmFaction.reduce(
        (acc, row) => {
          if (!acc[row.realmId]) acc[row.realmId] = {};
          acc[row.realmId][row.faction] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<number, Record<string, number>>,
      );

      for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
        metrics.push({
          category: 'characters',
          metricType: 'byFaction',
          realmId: parseInt(realmId, 10),
          value: factionCounts,
          snapshotDate,
        });
      }

      // By Realm + Class
      const byRealmClass = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.realm_id', 'realmId')
        .addSelect('c.class', 'class')
        .addSelect('COUNT(*)', 'count')
        .where('c.class IS NOT NULL')
        .groupBy('c.realm_id, c.class')
        .getRawMany<CharacterRealmClassAggregation>();

      const byRealmClassMap = byRealmClass.reduce(
        (acc, row) => {
          if (!acc[row.realmId]) acc[row.realmId] = {};
          acc[row.realmId][row.class] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<number, Record<string, number>>,
      );

      for (const [realmId, classCounts] of Object.entries(byRealmClassMap)) {
        metrics.push({
          category: 'characters',
          metricType: 'byClass',
          realmId: parseInt(realmId, 10),
          value: classCounts,
          snapshotDate,
        });
      }

      // Extremes (global)
      const maxAchievement = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.guid', 'guid')
        .addSelect('c.name', 'name')
        .addSelect('c.realm', 'realm')
        .addSelect('c.achievement_points', 'value')
        .where('c.achievement_points > 0')
        .orderBy('c.achievement_points', 'DESC')
        .limit(1)
        .getRawOne<CharacterExtreme>();

      const minAchievement = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.guid', 'guid')
        .addSelect('c.name', 'name')
        .addSelect('c.realm', 'realm')
        .addSelect('c.achievement_points', 'value')
        .where('c.achievement_points > 0')
        .orderBy('c.achievement_points', 'ASC')
        .limit(1)
        .getRawOne<CharacterExtreme>();

      const maxMounts = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.guid', 'guid')
        .addSelect('c.name', 'name')
        .addSelect('c.realm', 'realm')
        .addSelect('c.mounts_number', 'value')
        .where('c.mounts_number > 0')
        .orderBy('c.mounts_number', 'DESC')
        .limit(1)
        .getRawOne<CharacterExtreme>();

      const maxPets = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.guid', 'guid')
        .addSelect('c.name', 'name')
        .addSelect('c.realm', 'realm')
        .addSelect('c.pets_number', 'value')
        .where('c.pets_number > 0')
        .orderBy('c.pets_number', 'DESC')
        .limit(1)
        .getRawOne<CharacterExtreme>();

      const maxItemLevel = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.guid', 'guid')
        .addSelect('c.name', 'name')
        .addSelect('c.realm', 'realm')
        .addSelect('c.avg_item_level', 'value')
        .where('c.avg_item_level > 0')
        .orderBy('c.avg_item_level', 'DESC')
        .limit(1)
        .getRawOne<CharacterExtreme>();

      const extremesValue: Record<string, any> = {};
      if (maxAchievement) {
        extremesValue.maxAchievementPoints = maxAchievement;
      }
      if (minAchievement) {
        extremesValue.minAchievementPoints = minAchievement;
      }
      if (maxMounts) {
        extremesValue.maxMounts = maxMounts;
      }
      if (maxPets) {
        extremesValue.maxPets = maxPets;
      }
      if (maxItemLevel) {
        extremesValue.maxItemLevel = maxItemLevel;
      }

      metrics.push({
        category: 'characters',
        metricType: 'extremes',
        value: extremesValue,
        snapshotDate,
      });

      // Averages (global)
      const averages = await this.charactersRepository
        .createQueryBuilder('c')
        .select('AVG(c.achievement_points)', 'avgAchievement')
        .addSelect('AVG(c.mounts_number)', 'avgMounts')
        .addSelect('AVG(c.pets_number)', 'avgPets')
        .addSelect('AVG(c.avg_item_level)', 'avgItemLevel')
        .where('c.achievement_points > 0')
        .getRawOne<CharacterAverages>();

      metrics.push({
        category: 'characters',
        metricType: 'averages',
        value: {
          achievementPoints: averages ? parseFloat(averages.avgAchievement || '0') : 0,
          mounts: averages ? parseFloat(averages.avgMounts || '0') : 0,
          pets: averages ? parseFloat(averages.avgPets || '0') : 0,
          itemLevel: averages ? parseFloat(averages.avgItemLevel || '0') : 0,
        },
        snapshotDate,
      });

      this.logger.debug({
        logTag,
        message: 'Character metrics computed',
        metricsCount: metrics.length,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error computing character metrics',
        errorOrException,
      });
      throw errorOrException;
    }

    return metrics;
  }

  private async computeGuildMetrics(snapshotDate: Date): Promise<AnalyticsMetric[]> {
    const logTag = 'computeGuildMetrics';
    const metrics: AnalyticsMetric[] = [];

    try {
      // Total count
      const totalCount = await this.guildsRepository.count();
      const totalMembers = await this.guildsRepository
        .createQueryBuilder('g')
        .select('SUM(g.members_count)', 'sum')
        .getRawOne<GuildTotalMetrics>();

      const avgMembers = totalCount > 0 ? parseInt(totalMembers?.sum || '0', 10) / totalCount : 0;

      metrics.push({
        category: 'guilds',
        metricType: 'total',
        value: {
          count: totalCount,
          totalMembers: parseInt(totalMembers?.sum || '0', 10),
          avgMembers: avgMembers,
        },
        snapshotDate,
      });

      // By Faction (global)
      const byFaction = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.faction', 'faction')
        .addSelect('COUNT(*)', 'count')
        .where('g.faction IS NOT NULL')
        .groupBy('g.faction')
        .getRawMany<GuildCountAggregation>();

      const factionMap = byFaction.reduce(
        (acc, row) => {
          acc[row.faction] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      metrics.push({
        category: 'guilds',
        metricType: 'byFaction',
        value: factionMap,
        snapshotDate,
      });

      // By Realm (with member counts)
      const byRealm = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.realm_id', 'realmId')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(g.members_count)', 'totalMembers')
        .groupBy('g.realm_id')
        .getRawMany<GuildRealmAggregation>();

      for (const realmData of byRealm) {
        metrics.push({
          category: 'guilds',
          metricType: 'total',
          realmId: realmData.realmId,
          value: {
            count: parseInt(realmData.count, 10),
            totalMembers: parseInt(realmData.totalMembers || '0', 10),
          },
          snapshotDate,
        });
      }

      // By Realm + Faction
      const byRealmFaction = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.realm_id', 'realmId')
        .addSelect('g.faction', 'faction')
        .addSelect('COUNT(*)', 'count')
        .where('g.faction IS NOT NULL')
        .groupBy('g.realm_id, g.faction')
        .getRawMany<GuildRealmFactionAggregation>();

      const byRealmFactionMap = byRealmFaction.reduce(
        (acc, row) => {
          if (!acc[row.realmId]) acc[row.realmId] = {};
          acc[row.realmId][row.faction] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<number, Record<string, number>>,
      );

      for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
        metrics.push({
          category: 'guilds',
          metricType: 'byFaction',
          realmId: parseInt(realmId, 10),
          value: factionCounts,
          snapshotDate,
        });
      }

      // Size distribution
      const sizeDistribution = await this.guildsRepository
        .createQueryBuilder('g')
        .select(
          `SUM(CASE WHEN g.members_count BETWEEN 1 AND 10 THEN 1 ELSE 0 END)`,
          'tiny',
        )
        .addSelect(
          `SUM(CASE WHEN g.members_count BETWEEN 11 AND 30 THEN 1 ELSE 0 END)`,
          'small',
        )
        .addSelect(
          `SUM(CASE WHEN g.members_count BETWEEN 31 AND 100 THEN 1 ELSE 0 END)`,
          'medium',
        )
        .addSelect(
          `SUM(CASE WHEN g.members_count BETWEEN 101 AND 300 THEN 1 ELSE 0 END)`,
          'large',
        )
        .addSelect(`SUM(CASE WHEN g.members_count > 300 THEN 1 ELSE 0 END)`, 'massive')
        .getRawOne<GuildSizeDistribution>();

      metrics.push({
        category: 'guilds',
        metricType: 'sizeDistribution',
        value: {
          tiny: parseInt(sizeDistribution?.tiny || '0', 10),
          small: parseInt(sizeDistribution?.small || '0', 10),
          medium: parseInt(sizeDistribution?.medium || '0', 10),
          large: parseInt(sizeDistribution?.large || '0', 10),
          massive: parseInt(sizeDistribution?.massive || '0', 10),
        },
        snapshotDate,
      });

      // Top guilds by members
      const topByMembers = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.guid', 'guid')
        .addSelect('g.name', 'name')
        .addSelect('g.realm', 'realm')
        .addSelect('g.members_count', 'value')
        .orderBy('g.members_count', 'DESC')
        .limit(10)
        .getRawMany<GuildTopByMembers>();

      metrics.push({
        category: 'guilds',
        metricType: 'topByMembers',
        value: topByMembers,
        snapshotDate,
      });

      // Top guilds by achievements
      const topByAchievements = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.guid', 'guid')
        .addSelect('g.name', 'name')
        .addSelect('g.realm', 'realm')
        .addSelect('g.achievement_points', 'value')
        .where('g.achievement_points > 0')
        .orderBy('g.achievement_points', 'DESC')
        .limit(10)
        .getRawMany<GuildTopByMembers>();

      metrics.push({
        category: 'guilds',
        metricType: 'topByAchievements',
        value: topByAchievements,
        snapshotDate,
      });

      this.logger.debug({
        logTag,
        message: 'Guild metrics computed',
        metricsCount: metrics.length,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error computing guild metrics',
        errorOrException,
      });
      throw errorOrException;
    }

    return metrics;
  }

  private async computeMarketMetrics(snapshotDate: Date): Promise<AnalyticsMetric[]> {
    const logTag = 'computeMarketMetrics';
    const metrics: AnalyticsMetric[] = [];

    try {
      // Calculate 24h threshold
      const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

      // Total metrics (last 24h)
      const totalCount = await this.marketRepository.count({
        where: { timestamp: MoreThan(threshold24h) },
      });

      const totalVolume = await this.marketRepository
        .createQueryBuilder('m')
        .select('SUM(m.value)', 'sum')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<MarketTotalMetrics>();

      const uniqueItems = await this.marketRepository
        .createQueryBuilder('m')
        .select('COUNT(DISTINCT m.item_id)', 'count')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<MarketAggregateCount>();

      const uniqueTraders = await this.marketRepository
        .createQueryBuilder('m')
        .select('COUNT(DISTINCT m.counterparty)', 'count')
        .where('m.timestamp > :threshold AND m.counterparty IS NOT NULL', {
          threshold: threshold24h,
        })
        .getRawOne<MarketAggregateCount>();

      const avgPrice = await this.marketRepository
        .createQueryBuilder('m')
        .select('AVG(m.price)', 'avg')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<MarketAggregatePrice>();

      metrics.push({
        category: 'market',
        metricType: 'total',
        value: {
          auctions: totalCount,
          volume: parseFloat(totalVolume?.sum || '0'),
          uniqueItems: parseInt(uniqueItems?.count || '0', 10),
          uniqueTraders: parseInt(uniqueTraders?.count || '0', 10),
          avgPrice: parseFloat(avgPrice?.avg || '0'),
        },
        snapshotDate,
      });

      // By Connected Realm
      const byConnectedRealm = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.connected_realm_id', 'connectedRealmId')
        .addSelect('COUNT(*)', 'auctions')
        .addSelect('SUM(m.value)', 'volume')
        .addSelect('COUNT(DISTINCT m.item_id)', 'uniqueItems')
        .addSelect('AVG(m.price)', 'avgPrice')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('m.connected_realm_id')
        .getRawMany<MarketByConnectedRealm>();

      for (const realm of byConnectedRealm) {
        metrics.push({
          category: 'market',
          metricType: 'byConnectedRealm',
          realmId: realm.connectedRealmId,
          value: {
            auctions: parseInt(realm.auctions, 10),
            volume: parseFloat(realm.volume || '0'),
            uniqueItems: parseInt(realm.uniqueItems, 10),
            avgPrice: parseFloat(realm.avgPrice || '0'),
          },
          snapshotDate,
        });
      }

      // By Faction (global)
      const byFaction = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.faction', 'faction')
        .addSelect('COUNT(*)', 'auctions')
        .addSelect('SUM(m.value)', 'volume')
        .where('m.timestamp > :threshold AND m.faction IS NOT NULL', {
          threshold: threshold24h,
        })
        .groupBy('m.faction')
        .getRawMany<MarketByFaction>();

      const factionMap = byFaction.reduce(
        (acc, row) => {
          acc[row.faction] = {
            auctions: parseInt(row.auctions, 10),
            volume: parseFloat(row.volume || '0'),
          };
          return acc;
        },
        {} as Record<string, { auctions: number; volume: number }>,
      );

      metrics.push({
        category: 'market',
        metricType: 'byFaction',
        value: factionMap,
        snapshotDate,
      });

      // Price ranges
      const priceRanges = await this.marketRepository
        .createQueryBuilder('m')
        .select(`SUM(CASE WHEN m.price < 1000 THEN 1 ELSE 0 END)`, 'under1k')
        .addSelect(
          `SUM(CASE WHEN m.price >= 1000 AND m.price < 10000 THEN 1 ELSE 0 END)`,
          'range1k10k',
        )
        .addSelect(
          `SUM(CASE WHEN m.price >= 10000 AND m.price < 100000 THEN 1 ELSE 0 END)`,
          'range10k100k',
        )
        .addSelect(
          `SUM(CASE WHEN m.price >= 100000 AND m.price < 1000000 THEN 1 ELSE 0 END)`,
          'range100k1m',
        )
        .addSelect(`SUM(CASE WHEN m.price >= 1000000 THEN 1 ELSE 0 END)`, 'over1m')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<MarketPriceRanges>();

      metrics.push({
        category: 'market',
        metricType: 'priceRanges',
        value: {
          under1k: parseInt(priceRanges?.under1k || '0', 10),
          '1k-10k': parseInt(priceRanges?.range1k10k || '0', 10),
          '10k-100k': parseInt(priceRanges?.range10k100k || '0', 10),
          '100k-1m': parseInt(priceRanges?.range100k1m || '0', 10),
          over1m: parseInt(priceRanges?.over1m || '0', 10),
        },
        snapshotDate,
      });

      // Top items by volume
      const topByVolume = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.item_id', 'itemId')
        .addSelect('SUM(m.value)', 'volume')
        .addSelect('COUNT(*)', 'auctions')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('m.item_id')
        .orderBy('volume', 'DESC')
        .limit(10)
        .getRawMany<MarketTopByVolume>();

      metrics.push({
        category: 'market',
        metricType: 'topByVolume',
        value: topByVolume.map((item) => ({
          itemId: item.itemId,
          volume: parseFloat(item.volume),
          auctions: parseInt(item.auctions, 10),
        })),
        snapshotDate,
      });

      // Top items by auction count
      const topByAuctions = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.item_id', 'itemId')
        .addSelect('COUNT(*)', 'auctions')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('m.item_id')
        .orderBy('auctions', 'DESC')
        .limit(10)
        .getRawMany<MarketTopByAuctions>();

      metrics.push({
        category: 'market',
        metricType: 'topByAuctions',
        value: topByAuctions.map((item) => ({
          itemId: item.itemId,
          auctions: parseInt(item.auctions, 10),
        })),
        snapshotDate,
      });

      this.logger.debug({
        logTag,
        message: 'Market metrics computed',
        metricsCount: metrics.length,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error computing market metrics',
        errorOrException,
      });
      throw errorOrException;
    }

    return metrics;
  }

  private async computeContractMetrics(snapshotDate: Date): Promise<AnalyticsMetric[]> {
    const logTag = 'computeContractMetrics';
    const metrics: AnalyticsMetric[] = [];

    try {
      // Calculate 24h threshold
      const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

      // Total metrics
      const totalCount = await this.contractRepository.count({
        where: { timestamp: MoreThan(threshold24h) },
      });

      const totals = await this.contractRepository
        .createQueryBuilder('c')
        .select('SUM(c.quantity)', 'totalQuantity')
        .addSelect('SUM(c.oi)', 'totalOpenInterest')
        .addSelect('COUNT(DISTINCT c.item_id)', 'uniqueItems')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<ContractTotalMetrics>();

      metrics.push({
        category: 'contracts',
        metricType: 'total',
        value: {
          count: totalCount,
          totalQuantity: parseInt(totals?.totalQuantity || '0', 10),
          totalOpenInterest: parseFloat(totals?.totalOpenInterest || '0'),
          uniqueItems: parseInt(totals?.uniqueItems || '0', 10),
        },
        snapshotDate,
      });

      // Commodities (connectedRealmId = 1)
      const commoditiesData = await this.contractRepository
        .createQueryBuilder('c')
        .select('COUNT(*)', 'count')
        .addSelect('SUM(c.quantity)', 'totalQuantity')
        .addSelect('SUM(c.oi)', 'totalOpenInterest')
        .where('c.timestamp > :threshold AND c.connected_realm_id = 1', {
          threshold: threshold24h,
        })
        .getRawOne<ContractCommoditiesData>();

      metrics.push({
        category: 'contracts',
        metricType: 'byCommodities',
        value: {
          count: parseInt(commoditiesData?.count || '0', 10),
          totalQuantity: parseInt(commoditiesData?.totalQuantity || '0', 10),
          totalOpenInterest: parseFloat(commoditiesData?.totalOpenInterest || '0'),
        },
        snapshotDate,
      });

      // By Connected Realm
      const byConnectedRealm = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.connected_realm_id', 'connectedRealmId')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(c.quantity)', 'totalQuantity')
        .addSelect('SUM(c.oi)', 'totalOpenInterest')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.connected_realm_id')
        .getRawMany<ContractByConnectedRealm>();

      for (const realm of byConnectedRealm) {
        metrics.push({
          category: 'contracts',
          metricType: 'byConnectedRealm',
          realmId: realm.connectedRealmId,
          value: {
            count: parseInt(realm.count, 10),
            totalQuantity: parseInt(realm.totalQuantity || '0', 10),
            totalOpenInterest: parseFloat(realm.totalOpenInterest || '0'),
          },
          snapshotDate,
        });
      }

      // Top items by quantity
      const topByQuantity = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.item_id', 'itemId')
        .addSelect('SUM(c.quantity)', 'quantity')
        .addSelect('SUM(c.oi)', 'openInterest')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.item_id')
        .orderBy('quantity', 'DESC')
        .limit(10)
        .getRawMany<ContractTopByQuantity>();

      metrics.push({
        category: 'contracts',
        metricType: 'topByQuantity',
        value: topByQuantity.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity, 10),
          openInterest: parseFloat(item.openInterest),
        })),
        snapshotDate,
      });

      // Top items by open interest
      const topByOpenInterest = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.item_id', 'itemId')
        .addSelect('SUM(c.oi)', 'openInterest')
        .addSelect('SUM(c.quantity)', 'quantity')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.item_id')
        .orderBy('openInterest', 'DESC')
        .limit(10)
        .getRawMany<ContractTopByOpenInterest>();

      metrics.push({
        category: 'contracts',
        metricType: 'topByOpenInterest',
        value: topByOpenInterest.map((item) => ({
          itemId: item.itemId,
          openInterest: parseFloat(item.openInterest),
          quantity: parseInt(item.quantity, 10),
        })),
        snapshotDate,
      });

      // Price volatility
      const volatility = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.item_id', 'itemId')
        .addSelect('STDDEV(c.price)', 'stdDev')
        .addSelect('AVG(c.price)', 'avgPrice')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.item_id')
        .having('COUNT(*) > :count', { count: 10 })
        .orderBy('stdDev', 'DESC')
        .limit(10)
        .getRawMany<ContractPriceVolatility>();

      metrics.push({
        category: 'contracts',
        metricType: 'priceVolatility',
        value: volatility.map((item) => ({
          itemId: item.itemId,
          stdDev: parseFloat(item.stdDev || '0'),
          avgPrice: parseFloat(item.avgPrice || '0'),
        })),
        snapshotDate,
      });

      this.logger.debug({
        logTag,
        message: 'Contract metrics computed',
        metricsCount: metrics.length,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error computing contract metrics',
        errorOrException,
      });
      throw errorOrException;
    }

    return metrics;
  }

  private async saveMetrics(metrics: AnalyticsMetric[]): Promise<void> {
    const logTag = 'saveMetrics';
    try {
      const entitiesToSave = metrics.map((metric) =>
        this.analyticsMetricRepository.create({
          category: metric.category,
          metricType: metric.metricType,
          realmId: metric.realmId,
          value: metric.value,
          snapshotDate: metric.snapshotDate,
        }),
      );

      await this.analyticsMetricRepository.upsert(entitiesToSave, [
        'category',
        'metricType',
        'realmId',
        'snapshotDate',
      ]);

      this.logger.log({
        logTag,
        message: 'Metrics saved to database',
        metricsCount: entitiesToSave.length,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        message: 'Error saving metrics to database',
        errorOrException,
      });
      throw errorOrException;
    }
  }

  private async cacheSnapshot(metrics: AnalyticsMetric[]): Promise<void> {
    const logTag = 'cacheSnapshot';
    try {
      const groupedByCategory = metrics.reduce(
        (acc, metric) => {
          if (!acc[metric.category]) {
            acc[metric.category] = [];
          }
          acc[metric.category].push(metric);
          return acc;
        },
        {} as Record<string, AnalyticsMetric[]>,
      );

      const ttl = 25 * 60 * 60; // 25 hours

      for (const [category, categoryMetrics] of Object.entries(groupedByCategory)) {
        const key = `analytics:latest:${category}`;
        await this.redis.setex(key, ttl, JSON.stringify(categoryMetrics));
      }

      this.logger.log({
        logTag,
        message: 'Metrics cached to Redis',
        categories: Object.keys(groupedByCategory).length,
      });
    } catch (errorOrException) {
      this.logger.warn({
        logTag,
        message: 'Failed to cache metrics to Redis (non-critical)',
        errorOrException,
      });
    }
  }

  async getLatestMetric(
    category: string,
    metricType: string,
    realmId?: number,
  ): Promise<AnalyticsMetricEntity | null> {
    const query = this.analyticsMetricRepository
      .createQueryBuilder()
      .where('category = :category', { category })
      .andWhere('metric_type = :metricType', { metricType });

    if (realmId === undefined) {
      query.andWhere('realm_id IS NULL');
    } else {
      query.andWhere('realm_id = :realmId', { realmId });
    }

    return query.orderBy('snapshot_date', 'DESC').limit(1).getOne();
  }

  async getMetricHistory(
    category: string,
    metricType: string,
    realmId?: number,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<AnalyticsMetricEntity[]> {
    const query = this.analyticsMetricRepository
      .createQueryBuilder()
      .where('category = :category', { category })
      .andWhere('metric_type = :metricType', { metricType });

    if (realmId === undefined) {
      query.andWhere('realm_id IS NULL');
    } else {
      query.andWhere('realm_id = :realmId', { realmId });
    }

    if (fromDate) {
      query.andWhere('snapshot_date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('snapshot_date <= :toDate', { toDate });
    }

    return query.orderBy('snapshot_date', 'ASC').getMany();
  }
}
