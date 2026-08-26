import { AnalyticsEntity, GuildHallOfFameEntity, RealmsEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType, isUnchanged } from '@app/resources';
import { analyticsMetricLatest } from '@app/resources/dao';
import type { HallOfFameRaidAggregation, HallOfFameRealmMetricRow } from '@app/resources/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import { type MetricsCollector, runMetricsCollector } from './collector-runner';

@Injectable()
export class HallOfFameMetricsService {
  private readonly logger = new Logger(HallOfFameMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    _analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(GuildHallOfFameEntity)
    _guildHallOfFameRepository: Repository<GuildHallOfFameEntity>,
    @InjectRepository(RealmsEntity)
    _realmsRepository: Repository<RealmsEntity>,
  ) {}

  async snapshotHallOfFameMetrics(snapshotDate: Date): Promise<number> {
    const startTime = Date.now();

    // Every collector commits in its own transaction, so one failing or
    // slow metric cannot roll back or pin the rest of the Hall of Fame
    // snapshot. These collectors dedupe via analyticsMetricLatest + isUnchanged
    // instead of the snapshot-key set.
    const collectors: Array<[string, MetricsCollector]> = [
      ['hallOfFameTotal', (manager, rows) => this.collectHallOfFameTotal(manager, rows, snapshotDate)],
      ['hallOfFameByRaid', (manager, rows) => this.collectHallOfFameByRaid(manager, rows, snapshotDate)],
      ['hallOfFamePerRealm', (manager, rows) => this.collectHallOfFamePerRealm(manager, rows, snapshotDate)],
    ];

    let savedCount = 0;
    for (const [name, collector] of collectors) {
      savedCount += await runMetricsCollector(this.dataSource, this.logger, name, snapshotDate, collector);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Hall of Fame metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
    return savedCount;
  }

  private async collectHallOfFameTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    snapshotDate: Date,
  ): Promise<void> {
    const hofRepo = manager.getRepository(GuildHallOfFameEntity);
    const realmsRepo = manager.getRepository(RealmsEntity);

    const totalAchievements = await hofRepo.count();
    const totalGuilds = await hofRepo
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.guild_guid)', 'count')
      .getRawOne<{ count: string }>();
    const realmsWithHof = await hofRepo
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.realm_slug)', 'count')
      .getRawOne<{ count: string }>();
    const totalEuRealms = await realmsRepo.count({
      where: { region: 'Europe' },
    });

    const realmsCount = parseInt(realmsWithHof?.count || '0', 10);
    const coveragePercent = totalEuRealms > 0 ? (realmsCount / totalEuRealms) * 100 : 0;

    const value = {
      totalGuilds: parseInt(totalGuilds?.count || '0', 10),
      totalAchievements,
      realmsWithHof: realmsCount,
      totalEuRealms,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
    };

    const latest = await analyticsMetricLatest(manager, {
      category: AnalyticsMetricCategory.HALL_OF_FAME,
      metricType: AnalyticsMetricType.TOTAL,
    });
    if (latest && isUnchanged(latest.value, value)) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.HALL_OF_FAME,
        metricType: AnalyticsMetricType.TOTAL,
        value,
        snapshotDate,
      }),
    );
  }

  private async collectHallOfFameByRaid(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    snapshotDate: Date,
  ): Promise<void> {
    const byRaid = await manager
      .getRepository(GuildHallOfFameEntity)
      .createQueryBuilder('h')
      .select('h.raid_slug', 'raid_slug')
      .addSelect('MAX(h.raid_name)', 'raid_name')
      .addSelect('COUNT(*)', 'guild_count')
      .addSelect('COUNT(DISTINCT h.realm_slug)', 'realm_count')
      .groupBy('h.raid_slug')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<HallOfFameRaidAggregation>();

    const value = byRaid.reduce(
      (acc, row) => {
        acc[row.raid_slug] = {
          raidName: row.raid_name,
          guildCount: parseInt(row.guild_count, 10),
          realmCount: parseInt(row.realm_count, 10),
        };
        return acc;
      },
      {} as Record<string, { raidName: string; guildCount: number; realmCount: number }>,
    );

    const latest = await analyticsMetricLatest(manager, {
      category: AnalyticsMetricCategory.HALL_OF_FAME,
      metricType: AnalyticsMetricType.BY_RAID,
    });
    if (latest && isUnchanged(latest.value, value)) return;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.HALL_OF_FAME,
        metricType: AnalyticsMetricType.BY_RAID,
        value,
        snapshotDate,
      }),
    );
  }

  private async collectHallOfFamePerRealm(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    snapshotDate: Date,
  ): Promise<void> {
    const byRealm = await manager
      .getRepository(GuildHallOfFameEntity)
      .createQueryBuilder('h')
      .leftJoin('realms', 'r', 'r.slug = h.realm_slug')
      .select('r.id', 'realm_id')
      .addSelect('COUNT(DISTINCT h.guild_guid)', 'guild_count')
      .addSelect('COUNT(DISTINCT h.raid_slug)', 'raid_count')
      .where('r.id IS NOT NULL')
      .groupBy('r.id')
      .getRawMany<HallOfFameRealmMetricRow>();

    for (const realmData of byRealm) {
      const realmId = realmData.realm_id;
      if (!realmId) continue;

      const value = {
        guildCount: parseInt(realmData.guild_count, 10),
        raidCount: parseInt(realmData.raid_count, 10),
      };

      const latest = await analyticsMetricLatest(manager, {
        category: AnalyticsMetricCategory.HALL_OF_FAME,
        metricType: AnalyticsMetricType.TOTAL,
        realmId,
      });
      if (latest && isUnchanged(latest.value, value)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.HALL_OF_FAME,
          metricType: AnalyticsMetricType.TOTAL,
          realmId,
          value,
          snapshotDate,
        }),
      );
    }
  }
}
