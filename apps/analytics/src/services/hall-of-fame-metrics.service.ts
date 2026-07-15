import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import { analyticsMetricExists } from '@app/resources/dao';
import { AnalyticsEntity, GuildHallOfFameEntity, RealmsEntity } from '@app/pg';

interface HallOfFameRaidAggregation {
  raid_slug: string;
  raid_name: string;
  guild_count: string;
  realm_count: string;
}

interface HallOfFameRealmAggregation {
  realm_slug: string;
  guild_count: string;
  raid_count: string;
}

@Injectable()
export class HallOfFameMetricsService {
  private readonly logger = new Logger(HallOfFameMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(GuildHallOfFameEntity)
    private readonly guildHallOfFameRepository: Repository<GuildHallOfFameEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  private metricExists(
    category: AnalyticsMetricCategory,
    metricType: AnalyticsMetricType,
    snapshotDate: Date,
    realmId?: number | null,
  ): Promise<boolean> {
    return analyticsMetricExists(this.analyticsMetricRepository, {
      category,
      metricType,
      snapshotDate,
      realmId: realmId ?? undefined,
    });
  }

  async computeHallOfFameMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'computeHallOfFameMetrics';
    let savedCount = 0;
    const startTime = Date.now();

    try {
      savedCount += await this.computeTotal(snapshotDate);
      savedCount += await this.computeByRaid(snapshotDate);
      savedCount += await this.computePerRealm(snapshotDate);

      const duration = Date.now() - startTime;
      this.logger.log(`Hall of Fame metrics computed - metricsCount: ${savedCount}, durationMs: ${duration}`);
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error computing Hall of Fame metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }

    return savedCount;
  }

  private async computeTotal(snapshotDate: Date): Promise<number> {
    if (
      await this.metricExists(AnalyticsMetricCategory.HALL_OF_FAME, AnalyticsMetricType.TOTAL, snapshotDate)
    ) {
      return 0;
    }

    const totalAchievements = await this.guildHallOfFameRepository.count();
    const totalGuilds = await this.guildHallOfFameRepository
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.guild_guid)', 'count')
      .getRawOne<{ count: string }>();

    const realmsWithHof = await this.guildHallOfFameRepository
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.realm_slug)', 'count')
      .getRawOne<{ count: string }>();

    const totalEuRealms = await this.realmsRepository.count({
      where: { region: 'Europe' },
    });

    const realmsCount = parseInt(realmsWithHof?.count || '0', 10);
    const coveragePercent = totalEuRealms > 0 ? (realmsCount / totalEuRealms) * 100 : 0;

    const metric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.HALL_OF_FAME,
      metricType: AnalyticsMetricType.TOTAL,
      value: {
        totalGuilds: parseInt(totalGuilds?.count || '0', 10),
        totalAchievements,
        realmsWithHof: realmsCount,
        totalEuRealms,
        coveragePercent: Math.round(coveragePercent * 10) / 10,
      },
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(metric);
    return 1;
  }

  private async computeByRaid(snapshotDate: Date): Promise<number> {
    if (
      await this.metricExists(AnalyticsMetricCategory.HALL_OF_FAME, AnalyticsMetricType.BY_RAID, snapshotDate)
    ) {
      return 0;
    }

    const byRaid = await this.guildHallOfFameRepository
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

    const metric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.HALL_OF_FAME,
      metricType: AnalyticsMetricType.BY_RAID,
      value,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(metric);
    return 1;
  }

  private async computePerRealm(snapshotDate: Date): Promise<number> {
    const byRealm = await this.guildHallOfFameRepository
      .createQueryBuilder('h')
      .leftJoin('realms', 'r', 'r.slug = h.realm_slug')
      .select('r.id', 'realm_id')
      .addSelect('COUNT(DISTINCT h.guild_guid)', 'guild_count')
      .addSelect('COUNT(DISTINCT h.raid_slug)', 'raid_count')
      .where('r.id IS NOT NULL')
      .groupBy('r.id')
      .getRawMany<{ realm_id: number; guild_count: string; raid_count: string }>();

    let savedCount = 0;
    for (const realmData of byRealm) {
      const realmId = realmData.realm_id;
      if (!realmId) continue;

      if (
        await this.metricExists(
          AnalyticsMetricCategory.HALL_OF_FAME,
          AnalyticsMetricType.TOTAL,
          snapshotDate,
          realmId,
        )
      ) {
        continue;
      }

      const metric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.HALL_OF_FAME,
        metricType: AnalyticsMetricType.TOTAL,
        realmId,
        value: {
          guildCount: parseInt(realmData.guild_count, 10),
          raidCount: parseInt(realmData.raid_count, 10),
        },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(metric);
      savedCount++;
    }
    return savedCount;
  }
}
