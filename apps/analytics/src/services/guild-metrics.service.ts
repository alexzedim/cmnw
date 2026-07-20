import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import { analyticsKeyOf, findExistingAnalyticsKeys } from '@app/resources/dao';
import {
  GuildCountAggregation,
  GuildRealmAggregation,
  GuildRealmFactionAggregation,
  GuildSizeDistribution,
  GuildTopByMembers,
  GuildTotalMetrics,
} from '@app/resources/types';
import { AnalyticsEntity, GuildsEntity } from '@app/pg';

@Injectable()
export class GuildMetricsService {
  private readonly logger = new Logger(GuildMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
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
        await this.collectGuildSizeDistribution(manager, rows, existingKeys, snapshotDate);
        await this.collectGuildTopByMembers(manager, rows, existingKeys, snapshotDate);
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

  private async collectGuildSizeDistribution(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.SIZE_DISTRIBUTION);
    if (existingKeys.has(key)) return;

    const sizeDistribution = await manager
      .getRepository(GuildsEntity)
      .createQueryBuilder('g')
      .select(`SUM(CASE WHEN g.members_count BETWEEN 1 AND 10 THEN 1 ELSE 0 END)`, 'tiny')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 11 AND 30 THEN 1 ELSE 0 END)`, 'small')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 31 AND 100 THEN 1 ELSE 0 END)`, 'medium')
      .addSelect(`SUM(CASE WHEN g.members_count BETWEEN 101 AND 300 THEN 1 ELSE 0 END)`, 'large')
      .addSelect(`SUM(CASE WHEN g.members_count > 300 THEN 1 ELSE 0 END)`, 'massive')
      .getRawOne<GuildSizeDistribution>();

    rows.push(
      manager.create(AnalyticsEntity, {
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
      }),
    );
  }

  private async collectGuildTopByMembers(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.GUILDS, AnalyticsMetricType.TOP_BY_MEMBERS);
    if (existingKeys.has(key)) return;

    const topByMembers = await manager
      .getRepository(GuildsEntity)
      .createQueryBuilder('g')
      .select('g.guid', 'guid')
      .addSelect('g.name', 'name')
      .addSelect('g.realm', 'realm')
      .addSelect('g.members_count', 'value')
      .orderBy('g.members_count', 'DESC')
      .limit(10)
      .getRawMany<GuildTopByMembers>();

    const value: Record<string, GuildTopByMembers> = {};
    for (const guild of topByMembers) {
      if (guild?.guid) {
        value[guild.guid] = guild;
      }
    }

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.GUILDS,
        metricType: AnalyticsMetricType.TOP_BY_MEMBERS,
        value,
        snapshotDate,
      }),
    );
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
