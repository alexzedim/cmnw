import { AnalyticsEntity, GuildsEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import { analyticsKeyOf, findExistingAnalyticsKeys } from '@app/resources/dao';
import type {
  AchievementsDistributionRow,
  GuildAgeDistributionRow,
  GuildCountAggregation,
  GuildMembersDistributionRow,
  GuildRealmAggregation,
  GuildRealmFactionAggregation,
  GuildTopByMembers,
  GuildTotalMetrics,
} from '@app/resources/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { addAchievementsDistributionSelect, toAchievementsDistributionValue } from './achievement-distribution.util';

@Injectable()
export class GuildMetricsService {
  private readonly logger = new Logger(GuildMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    _analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(GuildsEntity)
    _guildsRepository: Repository<GuildsEntity>,
  ) {}

  async snapshotGuildMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'snapshotGuildMetrics';
    const startTime = Date.now();

    try {
      const savedCount = await this.dataSource.transaction(async (manager) => {
        const existingKeys = await findExistingAnalyticsKeys(manager, snapshotDate);
        const rows: AnalyticsEntity[] = [];

        await this.collectGuildTotal(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildByFaction(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildByRealm(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildByRealmFaction(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildMembersDistribution(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildAchievementsDistribution(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildAgeDistribution(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildTopByAge(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildTopByAchievements(manager, rows, existingKeys, snapshotDate);

        if (rows.length > 0) {
          await manager.save(AnalyticsEntity, rows);
        }
        return rows.length;
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Guild metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
      return savedCount;
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error snapshotting guild metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }
  }

  private async collectGuildTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.TOTAL);
    if (existingKeys.has(key)) return;

    const guildsRepo = manager.getRepository(GuildsEntity);
    const totalCount = await guildsRepo.count();
    const totalMembers = await guildsRepo
      .createQueryBuilder('g')
      .select('SUM(g.members_count)', 'sum')
      .getRawOne<GuildTotalMetrics>();

    const avgMembers = totalCount > 0 ? parseInt(totalMembers?.sum || '0', 10) / totalCount : 0;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          count: totalCount,
          totalMembers: parseInt(totalMembers?.sum || '0', 10),
          avgMembers,
        },
        snapshotDate,
      }),
    );
  }

  private async collectGuildByFaction(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.BY_FACTION);
    if (existingKeys.has(key)) return;

    const byFaction = await manager
      .getRepository(GuildsEntity)
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

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.BY_FACTION,
        value: factionMap,
        snapshotDate,
      }),
    );
  }

  private async collectGuildByRealm(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const byRealm = await manager
      .getRepository(GuildsEntity)
      .createQueryBuilder('g')
      .select('g.realm_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(g.members_count)', 'total_members')
      .groupBy('g.realm_id')
      .getRawMany<GuildRealmAggregation>();

    for (const realmData of byRealm) {
      const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.TOTAL, realmData.realm_id);
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.TOTAL,
          realmId: realmData.realm_id,
          value: {
            count: parseInt(realmData.count, 10),
            totalMembers: parseInt(realmData.total_members || '0', 10),
          },
          snapshotDate,
        }),
      );
    }
  }

  private async collectGuildByRealmFaction(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const byRealmFaction = await manager
      .getRepository(GuildsEntity)
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

    for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
      const realmIdNum = parseInt(realmId, 10);
      const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.BY_FACTION, realmIdNum);
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.BY_FACTION,
          realmId: realmIdNum,
          value: factionCounts,
          snapshotDate,
        }),
      );
    }
  }

  private async collectGuildMembersDistribution(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.MEMBERS_DISTRIBUTION);
    if (!existingKeys.has(globalKey)) {
      const globalRow = await this.withMembersDistributionSelect(
        manager.getRepository(GuildsEntity).createQueryBuilder('g'),
      )
        .where('g.faction IS NOT NULL')
        .andWhere('g.members_count > 0')
        .getRawOne<GuildMembersDistributionRow>();

      if (globalRow) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.GUILDS,
            metricType: AnalyticsMetricType.MEMBERS_DISTRIBUTION,
            value: this.toMembersDistributionValue(globalRow),
            snapshotDate,
          }),
        );
      }
    }

    const byRealm = await this.withMembersDistributionSelect(
      manager.getRepository(GuildsEntity).createQueryBuilder('g'),
    )
      .addSelect('g.realm_id', 'realm_id')
      .where('g.faction IS NOT NULL')
      .andWhere('g.members_count > 0')
      .groupBy('g.realm_id')
      .getRawMany<GuildMembersDistributionRow>();

    for (const realmRow of byRealm) {
      if (!realmRow?.realm_id) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.GUILDS,
        AnalyticsMetricType.MEMBERS_DISTRIBUTION,
        realmRow.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.MEMBERS_DISTRIBUTION,
          realmId: realmRow.realm_id,
          value: this.toMembersDistributionValue(realmRow),
          snapshotDate,
        }),
      );
    }
  }

  private withMembersDistributionSelect(qb: SelectQueryBuilder<GuildsEntity>): SelectQueryBuilder<GuildsEntity> {
    return qb
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 1 AND 10 THEN 1 ELSE 0 END)`, 'range_1_10')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 11 AND 50 THEN 1 ELSE 0 END)`, 'range_11_50')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 51 AND 100 THEN 1 ELSE 0 END)`, 'range_51_100')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 101 AND 250 THEN 1 ELSE 0 END)`, 'range_101_250')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 251 AND 500 THEN 1 ELSE 0 END)`, 'range_251_500')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 501 AND 750 THEN 1 ELSE 0 END)`, 'range_501_750')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 751 AND 999 THEN 1 ELSE 0 END)`, 'range_751_999')
      .addSelect(`SUM(CASE WHEN g.members_count >= 1000 THEN 1 ELSE 0 END)`, 'capped')
      .addSelect('AVG(g.members_count)', 'avg_members')
      .addSelect('STDDEV_POP(g.members_count)', 'stddev_members')
      .addSelect('MIN(g.members_count)', 'min_members')
      .addSelect('MAX(g.members_count)', 'max_members')
      .addSelect('PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY g.members_count)', 'p50')
      .addSelect('PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY g.members_count)', 'p90')
      .addSelect('PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY g.members_count)', 'p99');
  }

  private toMembersDistributionValue(row: GuildMembersDistributionRow): Record<string, any> {
    return {
      total: parseInt(row.total || '0', 10),
      capped: parseInt(row.capped || '0', 10),
      ranges: {
        '1-10': parseInt(row.range_1_10 || '0', 10),
        '11-50': parseInt(row.range_11_50 || '0', 10),
        '51-100': parseInt(row.range_51_100 || '0', 10),
        '101-250': parseInt(row.range_101_250 || '0', 10),
        '251-500': parseInt(row.range_251_500 || '0', 10),
        '501-750': parseInt(row.range_501_750 || '0', 10),
        '751-999': parseInt(row.range_751_999 || '0', 10),
      },
      stats: {
        min: parseInt(String(row.min_members ?? 0), 10),
        max: parseInt(String(row.max_members ?? 0), 10),
        avg: Math.round(Number(row.avg_members || 0) * 100) / 100,
        stddev: Math.round(Number(row.stddev_members || 0) * 100) / 100,
        p50: Math.round(Number(row.p50 || 0) * 100) / 100,
        p90: Math.round(Number(row.p90 || 0) * 100) / 100,
        p99: Math.round(Number(row.p99 || 0) * 100) / 100,
      },
    };
  }

  private async collectGuildAchievementsDistribution(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION);
    if (!existingKeys.has(globalKey)) {
      const globalRow = await addAchievementsDistributionSelect(
        manager.getRepository(GuildsEntity).createQueryBuilder('g'),
        'g',
        { table: 'guilds', filter: 'p.faction IS NOT NULL AND p.achievement_points > 0' },
      )
        .where('g.faction IS NOT NULL')
        .andWhere('g.achievement_points > 0')
        .getRawOne<AchievementsDistributionRow>();

      if (globalRow) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.GUILDS,
            metricType: AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION,
            value: toAchievementsDistributionValue(globalRow),
            snapshotDate,
          }),
        );
      }
    }

    const byRealm = await addAchievementsDistributionSelect(
      manager.getRepository(GuildsEntity).createQueryBuilder('g'),
      'g',
      {
        table: 'guilds',
        filter: 'p.realm_id = g.realm_id AND p.faction IS NOT NULL AND p.achievement_points > 0',
      },
    )
      .addSelect('g.realm_id', 'realm_id')
      .where('g.faction IS NOT NULL')
      .andWhere('g.achievement_points > 0')
      .groupBy('g.realm_id')
      .getRawMany<AchievementsDistributionRow>();

    for (const realmRow of byRealm) {
      if (!realmRow?.realm_id) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.GUILDS,
        AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION,
        realmRow.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION,
          realmId: realmRow.realm_id,
          value: toAchievementsDistributionValue(realmRow),
          snapshotDate,
        }),
      );
    }
  }

  /**
   * Age distribution over created_timestamp with fixed year tiers
   * (<1y, 1-3y, 3-5y, 5-10y, 10-15y, 15+y). Fixed boundaries keep the
   * buckets stable across days (guilds age uniformly, so anchored/dynamic
   * bounds would shift daily). Global row plus one row per realm.
   */
  private async collectGuildAgeDistribution(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.AGE_DISTRIBUTION);
    if (!existingKeys.has(globalKey)) {
      const globalRow = await this.withAgeDistributionSelect(
        manager.getRepository(GuildsEntity).createQueryBuilder('g'),
      )
        .where('g.faction IS NOT NULL')
        .andWhere('g.members_count > 0')
        .andWhere('g.created_timestamp IS NOT NULL')
        .getRawOne<GuildAgeDistributionRow>();

      if (globalRow) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.GUILDS,
            metricType: AnalyticsMetricType.AGE_DISTRIBUTION,
            value: this.toAgeDistributionValue(globalRow),
            snapshotDate,
          }),
        );
      }
    }

    const byRealm = await this.withAgeDistributionSelect(manager.getRepository(GuildsEntity).createQueryBuilder('g'))
      .addSelect('g.realm_id', 'realm_id')
      .where('g.faction IS NOT NULL')
      .andWhere('g.members_count > 0')
      .andWhere('g.created_timestamp IS NOT NULL')
      .groupBy('g.realm_id')
      .getRawMany<GuildAgeDistributionRow>();

    for (const realmRow of byRealm) {
      if (!realmRow?.realm_id) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.GUILDS,
        AnalyticsMetricType.AGE_DISTRIBUTION,
        realmRow.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.AGE_DISTRIBUTION,
          realmId: realmRow.realm_id,
          value: this.toAgeDistributionValue(realmRow),
          snapshotDate,
        }),
      );
    }
  }

  private withAgeDistributionSelect(qb: SelectQueryBuilder<GuildsEntity>): SelectQueryBuilder<GuildsEntity> {
    const age = 'now() - g.created_timestamp';

    return qb
      .select(`SUM(CASE WHEN ${age} < INTERVAL '1 year' THEN 1 ELSE 0 END)`, 'under1y')
      .addSelect(
        `SUM(CASE WHEN ${age} >= INTERVAL '1 year' AND ${age} < INTERVAL '3 years' THEN 1 ELSE 0 END)`,
        'range1y3y',
      )
      .addSelect(
        `SUM(CASE WHEN ${age} >= INTERVAL '3 years' AND ${age} < INTERVAL '5 years' THEN 1 ELSE 0 END)`,
        'range3y5y',
      )
      .addSelect(
        `SUM(CASE WHEN ${age} >= INTERVAL '5 years' AND ${age} < INTERVAL '10 years' THEN 1 ELSE 0 END)`,
        'range5y10y',
      )
      .addSelect(
        `SUM(CASE WHEN ${age} >= INTERVAL '10 years' AND ${age} < INTERVAL '15 years' THEN 1 ELSE 0 END)`,
        'range10y15y',
      )
      .addSelect(`SUM(CASE WHEN ${age} >= INTERVAL '15 years' THEN 1 ELSE 0 END)`, 'over15y')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`AVG(EXTRACT(EPOCH FROM ${age}) / 31557600.0)`, 'avg_age_years')
      .addSelect(
        `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ${age}) / 31557600.0)`,
        'median_age_years',
      )
      .addSelect(`MIN(EXTRACT(EPOCH FROM ${age}) / 86400.0)`, 'newest_days')
      .addSelect(`MAX(EXTRACT(EPOCH FROM ${age}) / 86400.0)`, 'oldest_days');
  }

  private toAgeDistributionValue(row: GuildAgeDistributionRow): Record<string, any> {
    return {
      total: parseInt(row.total || '0', 10),
      ranges: {
        under1y: parseInt(row.under1y || '0', 10),
        '1y-3y': parseInt(row.range1y3y || '0', 10),
        '3y-5y': parseInt(row.range3y5y || '0', 10),
        '5y-10y': parseInt(row.range5y10y || '0', 10),
        '10y-15y': parseInt(row.range10y15y || '0', 10),
        over15y: parseInt(row.over15y || '0', 10),
      },
      stats: {
        avgYears: Math.round(Number(row.avg_age_years || 0) * 100) / 100,
        medianYears: Math.round(Number(row.median_age_years || 0) * 100) / 100,
        oldestDays: Math.round(Number(row.oldest_days || 0)),
        newestDays: Math.round(Number(row.newest_days || 0)),
      },
    };
  }

  /**
   * Oldest guilds by created_timestamp: top 3 globally and the single oldest
   * per realm, from the live-guild slice. `value` is the age in whole days.
   */
  private async collectGuildTopByAge(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.TOP_BY_AGE);
    if (!existingKeys.has(globalKey)) {
      const oldest = await this.withOldestGuildsSelect(manager.getRepository(GuildsEntity).createQueryBuilder('g'))
        .limit(3)
        .getRawMany<GuildTopByMembers>();

      const value = this.toOldestGuildsValue(oldest);

      if (Object.keys(value).length > 0) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.GUILDS,
            metricType: AnalyticsMetricType.TOP_BY_AGE,
            value,
            snapshotDate,
          }),
        );
      }
    }

    // DISTINCT ON keeps one row per realm — the oldest, per ORDER BY.
    const byRealm = await this.withOldestGuildsSelect(manager.getRepository(GuildsEntity).createQueryBuilder('g'))
      .distinctOn(['g.realm_id'])
      .addSelect('g.realm_id', 'realm_id')
      .orderBy('g.realm_id', 'ASC')
      .addOrderBy('g.created_timestamp', 'ASC')
      .getRawMany<GuildTopByMembers & { realm_id: number }>();

    for (const guild of byRealm) {
      if (!guild?.realm_id || !guild.guid) continue;

      const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.TOP_BY_AGE, guild.realm_id);
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.GUILDS,
          metricType: AnalyticsMetricType.TOP_BY_AGE,
          realmId: guild.realm_id,
          value: this.toOldestGuildsValue([guild]),
          snapshotDate,
        }),
      );
    }
  }

  private withOldestGuildsSelect(qb: SelectQueryBuilder<GuildsEntity>): SelectQueryBuilder<GuildsEntity> {
    return qb
      .select('g.guid', 'guid')
      .addSelect('g.name', 'name')
      .addSelect('g.realm', 'realm')
      .addSelect(`FLOOR(EXTRACT(EPOCH FROM (now() - g.created_timestamp)) / 86400.0)`, 'value')
      .where('g.faction IS NOT NULL')
      .andWhere('g.members_count > 0')
      .andWhere('g.created_timestamp IS NOT NULL')
      .orderBy('g.created_timestamp', 'ASC');
  }

  private toOldestGuildsValue(guilds: GuildTopByMembers[]): Record<string, GuildTopByMembers> {
    const value: Record<string, GuildTopByMembers> = {};

    for (const guild of guilds) {
      if (guild?.guid) {
        value[guild.guid] = { ...guild, value: Number(guild.value ?? 0) };
      }
    }

    return value;
  }

  private async collectGuildTopByAchievements(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.TOP_BY_ACHIEVEMENTS);
    if (existingKeys.has(key)) return;

    const topByAchievements = await manager
      .getRepository(GuildsEntity)
      .createQueryBuilder('g')
      .select('g.guid', 'guid')
      .addSelect('g.name', 'name')
      .addSelect('g.realm', 'realm')
      .addSelect('g.achievement_points', 'value')
      .where('g.achievement_points > 0')
      .orderBy('g.achievement_points', 'DESC')
      .limit(10)
      .getRawMany<GuildTopByMembers>();

    const value: Record<string, GuildTopByMembers> = {};
    for (const guild of topByAchievements) {
      if (guild?.guid) {
        value[guild.guid] = guild;
      }
    }

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.TOP_BY_ACHIEVEMENTS,
        value,
        snapshotDate,
      }),
    );
  }
}
