import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { DateTime } from 'luxon';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import {
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

import {
  AnalyticsEntity,
  CharactersEntity,
  GuildsEntity,
  MarketEntity,
  ContractEntity,
  RealmsEntity,
} from '@app/pg';

@Injectable()
export class AnalyticsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnalyticsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
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
      const [charCount, guildCount, marketCount, contractCount] = await Promise.all([
        this.computeCharacterMetrics(snapshotDate),
        this.computeGuildMetrics(snapshotDate),
        this.computeMarketMetrics(snapshotDate),
        this.computeContractMetrics(snapshotDate),
      ]);

      const totalMetrics = charCount + guildCount + marketCount + contractCount;

      const duration = Date.now() - startTime;
      this.logger.log({
        logTag,
        message: 'Daily analytics computation completed',
        metricsCount: totalMetrics,
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

  private async computeCharacterMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeCharacterMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      // Total count
      const totalCount = await this.charactersRepository.count();
      const inGuildsCount = await this.charactersRepository.count({
        where: { guildGuid: MoreThan('') },
      });
      const notInGuildsCount = totalCount - inGuildsCount;

      const characterTotalMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.TOTAL,
        value: { count: totalCount, inGuilds: inGuildsCount, notInGuilds: notInGuildsCount },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterTotalMetric);
      this.logMetricInsert(logTag, characterTotalMetric);
      savedCount++;

      // By Faction (global)
      const byFaction = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.faction')
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

      const characterByFactionMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_FACTION,
        value: factionMap,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterByFactionMetric);
      this.logger.debug({
        logTag,
        message: 'Inserted metric',
        metric: { category: characterByFactionMetric.category, metricType: characterByFactionMetric.metricType, realmId: characterByFactionMetric.realmId, value: characterByFactionMetric.value },
      });
      savedCount++;

      // By Class (global)
      const byClass = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.class')
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

      const characterByClassMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_CLASS,
        value: classMap,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterByClassMetric);
      this.logger.debug({
        logTag,
        message: 'Inserted metric',
        metric: { category: characterByClassMetric.category, metricType: characterByClassMetric.metricType, realmId: characterByClassMetric.realmId, value: characterByClassMetric.value },
      });
      savedCount++;

      // By Race (global)
      const byRace = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.race')
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

      const characterByRaceMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_RACE,
        value: raceMap,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterByRaceMetric);
      this.logger.debug({
        logTag,
        message: 'Inserted metric',
        metric: { category: characterByRaceMetric.category, metricType: characterByRaceMetric.metricType, realmId: characterByRaceMetric.realmId, value: characterByRaceMetric.value },
      });
      savedCount++;

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

      const characterByLevelMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_LEVEL,
        value: levelMap,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterByLevelMetric);
      this.logMetricInsert(logTag, characterByLevelMetric);
      savedCount++;

      // By Realm (with guild counts)
      const byRealm = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.realm_id')
        .addSelect('COUNT(*)', 'total')
        .addSelect(
          `SUM(CASE WHEN c.guild_guid IS NOT NULL THEN 1 ELSE 0 END)`,
          'in_guilds',
        )
        .groupBy('c.realm_id')
        .getRawMany<CharacterRealmAggregation>();

      for (const realmData of byRealm) {
        const characterRealmTotalMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.TOTAL,
          realmId: realmData.realm_id,
          value: {
            count: parseInt(realmData.total, 10),
            inGuilds: parseInt(realmData.in_guilds || '0', 10),
            notInGuilds: parseInt(realmData.total, 10) - parseInt(realmData.in_guilds || '0', 10),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmTotalMetric);
        this.logMetricInsert(logTag, characterRealmTotalMetric);
        savedCount++;
      }

      // By Realm + Faction
      const byRealmFaction = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.realm_id')
        .addSelect('c.faction')
        .addSelect('COUNT(*)', 'count')
        .where('c.faction IS NOT NULL')
        .groupBy('c.realm_id, c.faction')
        .getRawMany<CharacterRealmFactionAggregation>();

      const byRealmFactionMap = byRealmFaction.reduce(
        (acc, row) => {
          if (!acc[row.realm_id]) acc[row.realm_id] = {};
          acc[row.realm_id][row.faction] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<number, Record<string, number>>,
      );

      for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
        const characterRealmFactionMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_FACTION,
          realmId: parseInt(realmId, 10),
          value: factionCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmFactionMetric);
        this.logMetricInsert(logTag, characterRealmFactionMetric);
        savedCount++;
      }

      // By Realm + Class
      const byRealmClass = await this.charactersRepository
        .createQueryBuilder('c')
        .select('c.realm_id')
        .addSelect('c.class')
        .addSelect('COUNT(*)', 'count')
        .where('c.class IS NOT NULL')
        .groupBy('c.realm_id, c.class')
        .getRawMany<CharacterRealmClassAggregation>();

      const byRealmClassMap = byRealmClass.reduce(
        (acc, row) => {
          if (!acc[row.realm_id]) acc[row.realm_id] = {};
          acc[row.realm_id][row.class] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<number, Record<string, number>>,
      );

      for (const [realmId, classCounts] of Object.entries(byRealmClassMap)) {
        const characterRealmClassMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_CLASS,
          realmId: parseInt(realmId, 10),
          value: classCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmClassMetric);
        this.logMetricInsert(logTag, characterRealmClassMetric);
        savedCount++;
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

      const characterExtremesMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.EXTREMES,
        value: extremesValue,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterExtremesMetric);
      this.logMetricInsert(logTag, characterExtremesMetric);
      savedCount++;

      // Averages (global)
      const averages = await this.charactersRepository
        .createQueryBuilder('c')
        .select('AVG(c.achievement_points)', 'avg_achievement')
        .addSelect('AVG(c.mounts_number)', 'avg_mounts')
        .addSelect('AVG(c.pets_number)', 'avg_pets')
        .addSelect('AVG(c.avg_item_level)', 'avg_item_level')
        .where('c.achievement_points > 0')
        .getRawOne<CharacterAverages>();

      const characterAveragesMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.AVERAGES,
        value: {
          achievementPoints: averages ? parseFloat(averages.avg_achievement || '0') : 0,
          mounts: averages ? parseFloat(averages.avg_mounts || '0') : 0,
          pets: averages ? parseFloat(averages.avg_pets || '0') : 0,
          itemLevel: averages ? parseFloat(averages.avg_item_level || '0') : 0,
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(characterAveragesMetric);
      this.logMetricInsert(logTag, characterAveragesMetric);
      savedCount++;

      const duration = Date.now() - startTime;
      this.logger.debug({
        logTag,
        message: 'Character metrics computed',
        metricsCount: savedCount,
        durationMs: duration,
      });
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing character metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async computeGuildMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeGuildMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      // Total count
      const totalCount = await this.guildsRepository.count();
      const totalMembers = await this.guildsRepository
        .createQueryBuilder('g')
        .select('SUM(g.members_count)', 'sum')
        .getRawOne<GuildTotalMetrics>();

      const avgMembers = totalCount > 0 ? parseInt(totalMembers?.sum || '0', 10) / totalCount : 0;

      const guildTotalMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          count: totalCount,
          totalMembers: parseInt(totalMembers?.sum || '0', 10),
          avgMembers: avgMembers,
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(guildTotalMetric);
      this.logMetricInsert(logTag, guildTotalMetric);
      savedCount++;

      // By Faction (global)
      const byFaction = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.faction')
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

      const guildByFactionMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.BY_FACTION,
        value: factionMap,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(guildByFactionMetric);
      this.logMetricInsert(logTag, guildByFactionMetric);
      savedCount++;

      // By Realm (with member counts)
      const byRealm = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.realm_id')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(g.members_count)', 'total_members')
        .groupBy('g.realm_id')
        .getRawMany<GuildRealmAggregation>();

      for (const realmData of byRealm) {
        const guildRealmTotalMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.TOTAL,
          realmId: realmData.realm_id,
          value: {
            count: parseInt(realmData.count, 10),
            totalMembers: parseInt(realmData.total_members || '0', 10),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(guildRealmTotalMetric);
        this.logMetricInsert(logTag, guildRealmTotalMetric);
        savedCount++;
      }

      // By Realm + Faction
      const byRealmFaction = await this.guildsRepository
        .createQueryBuilder('g')
        .select('g.realm_id')
        .addSelect('g.faction')
        .addSelect('COUNT(*)', 'count')
        .where('g.faction IS NOT NULL')
        .groupBy('g.realm_id, g.faction')
        .getRawMany<GuildRealmFactionAggregation>();

      const byRealmFactionMap = byRealmFaction.reduce(
        (acc, row) => {
          if (!acc[row.realm_id]) acc[row.realm_id] = {};
          acc[row.realm_id][row.faction] = parseInt(row.count, 10);
          return acc;
        },
        {} as Record<number, Record<string, number>>,
      );

      for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
        const guildRealmFactionMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.BY_FACTION,
          realmId: parseInt(realmId, 10),
          value: factionCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(guildRealmFactionMetric);
        this.logMetricInsert(logTag, guildRealmFactionMetric);
        savedCount++;
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

      const guildSizeDistributionMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.SIZE_DISTRIBUTION,
        value: {
          tiny: parseInt(sizeDistribution?.tiny || '0', 10),
          small: parseInt(sizeDistribution?.small || '0', 10),
          medium: parseInt(sizeDistribution?.medium || '0', 10),
          large: parseInt(sizeDistribution?.large || '0', 10),
          massive: parseInt(sizeDistribution?.massive || '0', 10),
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(guildSizeDistributionMetric);
      this.logMetricInsert(logTag, guildSizeDistributionMetric);
      savedCount++;

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

      const guildTopByMembersMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.TOP_BY_MEMBERS,
        value: topByMembers,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(guildTopByMembersMetric);
      this.logMetricInsert(logTag, guildTopByMembersMetric);
      savedCount++;

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

      const guildTopByAchievementsMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.TOP_BY_ACHIEVEMENTS,
        value: topByAchievements,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(guildTopByAchievementsMetric);
      this.logMetricInsert(logTag, guildTopByAchievementsMetric);
      savedCount++;

      const duration = Date.now() - startTime;
      this.logger.debug({
        logTag,
        message: 'Guild metrics computed',
        metricsCount: savedCount,
        durationMs: duration,
      });
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing guild metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async computeMarketMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeMarketMetrics';
    let savedCount = 0;
    const startTime = Date.now();

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

      const marketTotalMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          auctions: totalCount,
          volume: parseFloat(totalVolume?.sum || '0'),
          uniqueItems: parseInt(uniqueItems?.count || '0', 10),
          uniqueTraders: parseInt(uniqueTraders?.count || '0', 10),
          avgPrice: parseFloat(avgPrice?.avg || '0'),
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(marketTotalMetric);
      this.logMetricInsert(logTag, marketTotalMetric);
      savedCount++;

      // By Connected Realm
      const byConnectedRealm = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.connected_realm_id')
        .addSelect('COUNT(*)', 'auctions')
        .addSelect('SUM(m.value)', 'volume')
        .addSelect('COUNT(DISTINCT m.item_id)', 'unique_items')
        .addSelect('AVG(m.price)', 'avg_price')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('m.connected_realm_id')
        .getRawMany<MarketByConnectedRealm>();

      for (const realm of byConnectedRealm) {
        const marketByConnectedRealmMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.MARKET,
          metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
          realmId: realm.connected_realm_id,
          value: {
            auctions: parseInt(realm.auctions, 10),
            volume: parseFloat(realm.volume || '0'),
            uniqueItems: parseInt(realm.unique_items, 10),
            avgPrice: parseFloat(realm.avg_price || '0'),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(marketByConnectedRealmMetric);
        this.logMetricInsert(logTag, marketByConnectedRealmMetric);
        savedCount++;
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

      const marketByFactionMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.BY_FACTION,
        value: factionMap,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(marketByFactionMetric);
      this.logMetricInsert(logTag, marketByFactionMetric);
      savedCount++;

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

      const marketPriceRangesMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.PRICE_RANGES,
        value: {
          under1k: parseInt(priceRanges?.under1k || '0', 10),
          '1k-10k': parseInt(priceRanges?.range1k10k || '0', 10),
          '10k-100k': parseInt(priceRanges?.range10k100k || '0', 10),
          '100k-1m': parseInt(priceRanges?.range100k1m || '0', 10),
          over1m: parseInt(priceRanges?.over1m || '0', 10),
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(marketPriceRangesMetric);
      this.logMetricInsert(logTag, marketPriceRangesMetric);
      savedCount++;

      // Top items by volume
      const topByVolume = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.item_id')
        .addSelect('SUM(m.value)', 'volume')
        .addSelect('COUNT(*)', 'auctions')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('m.item_id')
        .orderBy('volume', 'DESC')
        .limit(10)
        .getRawMany<MarketTopByVolume>();

      const marketTopByVolumeMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOP_BY_VOLUME,
        value: topByVolume.map((item) => ({
          itemId: item.item_id,
          volume: parseFloat(item.volume),
          auctions: parseInt(item.auctions, 10),
        })),
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(marketTopByVolumeMetric);
      this.logMetricInsert(logTag, marketTopByVolumeMetric);
      savedCount++;

      // Top items by auction count
      const topByAuctions = await this.marketRepository
        .createQueryBuilder('m')
        .select('m.item_id')
        .addSelect('COUNT(*)', 'auctions')
        .where('m.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('m.item_id')
        .orderBy('auctions', 'DESC')
        .limit(10)
        .getRawMany<MarketTopByAuctions>();

      const marketTopByAuctionsMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.MARKET,
        metricType: AnalyticsMetricType.TOP_BY_AUCTIONS,
        value: topByAuctions.map((item) => ({
          itemId: item.item_id,
          auctions: parseInt(item.auctions, 10),
        })),
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(marketTopByAuctionsMetric);
      this.logMetricInsert(logTag, marketTopByAuctionsMetric);
      savedCount++;

      const duration = Date.now() - startTime;
      this.logger.debug({
        logTag,
        message: 'Market metrics computed',
        metricsCount: savedCount,
        durationMs: duration,
      });
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing market metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async computeContractMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeContractMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      // Calculate 24h threshold
      const threshold24h = DateTime.now().minus({ hours: 24 }).toMillis();

      // Total metrics
      const totalCount = await this.contractRepository.count({
        where: { timestamp: MoreThan(threshold24h) },
      });

      const totals = await this.contractRepository
        .createQueryBuilder('c')
        .select('SUM(c.quantity)', 'total_quantity')
        .addSelect('SUM(c.oi)', 'total_open_interest')
        .addSelect('COUNT(DISTINCT c.item_id)', 'unique_items')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .getRawOne<ContractTotalMetrics>();

      const contractTotalMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          count: totalCount,
          totalQuantity: parseInt(totals?.total_quantity || '0', 10),
          totalOpenInterest: parseFloat(totals?.total_open_interest || '0'),
          uniqueItems: parseInt(totals?.unique_items || '0', 10),
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(contractTotalMetric);
      this.logMetricInsert(logTag, contractTotalMetric);
      savedCount++;

      // Commodities (connectedRealmId = 1)
      const commoditiesData = await this.contractRepository
        .createQueryBuilder('c')
        .select('COUNT(*)', 'count')
        .addSelect('SUM(c.quantity)', 'total_quantity')
        .addSelect('SUM(c.oi)', 'total_open_interest')
        .where('c.timestamp > :threshold AND c.connected_realm_id = 1', {
          threshold: threshold24h,
        })
        .getRawOne<ContractCommoditiesData>();

      const contractByCommoditiesMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.BY_COMMODITIES,
        value: {
          count: parseInt(commoditiesData?.count || '0', 10),
          totalQuantity: parseInt(commoditiesData?.total_quantity || '0', 10),
          totalOpenInterest: parseFloat(commoditiesData?.total_open_interest || '0'),
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(contractByCommoditiesMetric);
      this.logMetricInsert(logTag, contractByCommoditiesMetric);
      savedCount++;

      // By Connected Realm
      const byConnectedRealm = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.connected_realm_id')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(c.quantity)', 'total_quantity')
        .addSelect('SUM(c.openInterest)', 'total_open_interest')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.connected_realm_id')
        .getRawMany<ContractByConnectedRealm>();

      for (const realm of byConnectedRealm) {
        const contractByConnectedRealmMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CONTRACTS,
          metricType: AnalyticsMetricType.BY_CONNECTED_REALM,
          realmId: realm.connected_realm_id,
          value: {
            count: parseInt(realm.count, 10),
            totalQuantity: parseInt(realm.total_quantity || '0', 10),
            totalOpenInterest: parseFloat(realm.total_open_interest || '0'),
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(contractByConnectedRealmMetric);
        this.logMetricInsert(logTag, contractByConnectedRealmMetric);
        savedCount++;
      }

      // Top items by quantity
      const topByQuantity = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.item_id')
        .addSelect('SUM(c.quantity)', 'quantity')
        .addSelect('SUM(c.oi)', 'open_interest')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.item_id')
        .orderBy('quantity', 'DESC')
        .limit(10)
        .getRawMany<ContractTopByQuantity>();

      const contractTopByQuantityMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOP_BY_QUANTITY,
        value: topByQuantity.map((item) => ({
          itemId: item.item_id,
          quantity: parseInt(item.quantity, 10),
          openInterest: parseFloat(item.open_interest),
        })),
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(contractTopByQuantityMetric);
      this.logMetricInsert(logTag, contractTopByQuantityMetric);
      savedCount++;

      // Top items by open interest
      const topByOpenInterest = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.item_id')
        .addSelect('SUM(c.oi)', 'open_interest')
        .addSelect('SUM(c.quantity)', 'quantity')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.item_id')
        .orderBy('open_interest', 'DESC')
        .limit(10)
        .getRawMany<ContractTopByOpenInterest>();

      const contractTopByOpenInterestMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
        value: topByOpenInterest.map((item) => ({
          itemId: item.item_id,
          openInterest: parseFloat(item.open_interest),
          quantity: parseInt(item.quantity, 10),
        })),
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(contractTopByOpenInterestMetric);
      this.logMetricInsert(logTag, contractTopByOpenInterestMetric);
      savedCount++;

      // Price volatility
      const volatility = await this.contractRepository
        .createQueryBuilder('c')
        .select('c.item_id')
        .addSelect('STDDEV(c.price)', 'std_dev')
        .addSelect('AVG(c.price)', 'avg_price')
        .where('c.timestamp > :threshold', { threshold: threshold24h })
        .groupBy('c.item_id')
        .having('COUNT(*) > :count', { count: 10 })
        .orderBy('std_dev', 'DESC')
        .limit(10)
        .getRawMany<ContractPriceVolatility>();

      const contractPriceVolatilityMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CONTRACTS,
        metricType: AnalyticsMetricType.PRICE_VOLATILITY,
        value: volatility.map((item) => ({
          itemId: item.item_id,
          stdDev: parseFloat(item.std_dev || '0'),
          avgPrice: parseFloat(item.avg_price || '0'),
        })),
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(contractPriceVolatilityMetric);
      this.logMetricInsert(logTag, contractPriceVolatilityMetric);
      savedCount++;

      const duration = Date.now() - startTime;
      this.logger.debug({
        logTag,
        message: 'Contract metrics computed',
        metricsCount: savedCount,
        durationMs: duration,
      });
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing contract metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private logMetricInsert(logTag: string, metric: AnalyticsEntity): void {
    this.logger.debug({
      logTag,
      message: 'Inserted metric to database',
      category: metric.category,
      metricType: metric.metricType,
      realmId: metric.realmId,
      valueSize: JSON.stringify(metric.value).length,
      value: metric.value,
      snapshotDate: metric.snapshotDate?.toISOString(),
    });
  }

  async getLatestMetric(
    category: string,
    metricType: string,
    realmId?: number,
  ): Promise<AnalyticsEntity | null> {
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
  ): Promise<AnalyticsEntity[]> {
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

