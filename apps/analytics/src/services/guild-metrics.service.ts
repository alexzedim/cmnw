import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import {
  GuildTotalMetrics,
  GuildCountAggregation,
  GuildRealmAggregation,
  GuildRealmFactionAggregation,
  GuildSizeDistribution,
  GuildTopByMembers,
} from '@app/resources/types';
import { AnalyticsEntity, GuildsEntity } from '@app/pg';

@Injectable()
export class GuildMetricsService {
  private readonly logger = new Logger(GuildMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
  ) {}

  async computeGuildMetrics(snapshotDate: Date): Promise<number> {
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
      savedCount++;

      // By Faction (global)
      savedCount += await this.computeGuildByFaction(snapshotDate);

      // By Realm (with member counts)
      savedCount += await this.computeGuildByRealm(snapshotDate);

      // By Realm + Faction
      savedCount += await this.computeGuildByRealmFaction(snapshotDate);

      // Size distribution
      savedCount += await this.computeGuildSizeDistribution(snapshotDate);

      // Top guilds by members
      savedCount += await this.computeGuildTopByMembers(snapshotDate);

      // Top guilds by achievements
      savedCount += await this.computeGuildTopByAchievements(snapshotDate);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Guild metrics computed - metricsCount: ${savedCount}, durationMs: ${duration}`,
      );
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

  private async computeGuildByFaction(snapshotDate: Date): Promise<number> {
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

    const guildByFactionMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.GUILDS,
      metricType: AnalyticsMetricType.BY_FACTION,
      value: factionMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(guildByFactionMetric);
    return 1;
  }

  private async computeGuildByRealm(snapshotDate: Date): Promise<number> {
    const byRealm = await this.guildsRepository
      .createQueryBuilder('g')
      .select('g.realm_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(g.members_count)', 'total_members')
      .groupBy('g.realm_id')
      .getRawMany<GuildRealmAggregation>();

    let savedCount = 0;
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
      savedCount++;
    }
    return savedCount;
  }

  private async computeGuildByRealmFaction(snapshotDate: Date): Promise<number> {
    const byRealmFaction = await this.guildsRepository
      .createQueryBuilder('g')
      .select('g.realm_id')
      .addSelect('g.faction', 'faction')
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

    let savedCount = 0;
    for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
      const guildRealmFactionMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.BY_FACTION,
        realmId: parseInt(realmId, 10),
        value: factionCounts,
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(guildRealmFactionMetric);
      savedCount++;
    }
    return savedCount;
  }

  private async computeGuildSizeDistribution(snapshotDate: Date): Promise<number> {
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
    return 1;
  }

  private async computeGuildTopByMembers(snapshotDate: Date): Promise<number> {
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
    return 1;
  }

  private async computeGuildTopByAchievements(snapshotDate: Date): Promise<number> {
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
    return 1;
  }
}
