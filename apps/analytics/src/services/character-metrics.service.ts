import { AnalyticsEntity, CharactersEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import { analyticsKeyOf } from '@app/resources/dao';
import type {
  AchievementsDistributionRow,
  CharacterAverages,
  CharacterDimensionAggregateRow,
  CharacterExtreme,
  CharacterGlobalAggregationRow,
  CharacterRealmAggregateRow,
  CharacterRealmDimensionAggregateRow,
  GuildAgeDistributionRow,
  GuildTopByMembers,
} from '@app/resources/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import {
  addAchievementsDistributionSelect,
  toAchievementsDistributionValue,
  withAchievementsAnchors,
} from './achievement-distribution.util';
import { type MetricsCollector, runMetricsCollector } from './collector-runner';

@Injectable()
export class CharacterMetricsService {
  private readonly logger = new Logger(CharacterMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    _analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(CharactersEntity)
    _charactersRepository: Repository<CharactersEntity>,
  ) {}

  private getRaceKey(value: string | null | undefined): string | null {
    if (!value || value.toLowerCase() === 'unknown') {
      return 'unknown';
    }
    return value;
  }

  async snapshotCharacterMetrics(snapshotDate: Date): Promise<number> {
    const startTime = Date.now();

    // The collectors below used to run ~20 separate scans of characters. They
    // now consume aggregates from three shared GROUPING SETS passes (global
    // dimensions, realm totals/unique/faction/class, realm max-level
    // faction/class); extremes, averages and the distribution collectors keep
    // their own queries. Per-metric skip logic and per-collector transactions
    // are unchanged.
    const maxLevel = await this.getCharacterMaxLevel(this.dataSource.manager);

    const globalDimensionRows = await this.loadGlobalDimensionAggregates();
    const maxLevelDimensionRows = maxLevel > 0 ? await this.loadGlobalDimensionAggregates(maxLevel) : [];
    const realmRows = await this.loadRealmAggregates();
    const maxLevelRealmRows = maxLevel > 0 ? await this.loadRealmMaxLevelAggregates(maxLevel) : [];

    const collectors: Array<[string, MetricsCollector]> = [
      [
        'characterTotal',
        (manager, rows, existingKeys) =>
          this.collectCharacterTotal(manager, rows, existingKeys, snapshotDate, realmRows),
      ],
      // Global dimension aggregations: faction / class / race / level.
      [
        'characterGlobalDimensions',
        async (manager, rows, existingKeys) => {
          const globalAggregations = this.decodeGlobalDimensionRows(globalDimensionRows);
          this.pushGlobalDimensionRows(rows, manager, existingKeys, snapshotDate, globalAggregations);
        },
      ],
      // Realm totals + unique players + realm/faction + realm/class.
      [
        'characterRealmAggregations',
        (manager, rows, existingKeys) =>
          this.collectRealmAggregations(manager, rows, existingKeys, snapshotDate, realmRows),
      ],
      [
        'characterMaxLevelDimensions',
        async (manager, rows, existingKeys) => {
          if (maxLevel <= 0) return;

          // Max-level dimension aggregations: faction / class / race / level.
          const maxLevelAggregations = this.decodeGlobalDimensionRows(maxLevelDimensionRows);
          this.pushMaxLevelDimensionRows(rows, manager, existingKeys, snapshotDate, maxLevelAggregations, maxLevel);

          // Realm + faction max-level and realm + class max-level.
          this.pushRealmMaxLevelRows(rows, manager, existingKeys, snapshotDate, maxLevelRealmRows);
        },
      ],
      [
        'characterExtremes',
        (manager, rows, existingKeys) =>
          this.collectCharacterExtremes(manager, rows, existingKeys, snapshotDate, maxLevel),
      ],
      [
        'characterAverages',
        (manager, rows, existingKeys) =>
          this.collectCharacterAverages(manager, rows, existingKeys, snapshotDate, maxLevel),
      ],
      [
        'characterAchievementsDistribution',
        (manager, rows, existingKeys) => {
          if (maxLevel <= 0) return Promise.resolve();

          return this.collectCharacterAchievementsDistribution(manager, rows, existingKeys, snapshotDate, maxLevel);
        },
      ],
      [
        'characterAgeDistribution',
        (manager, rows, existingKeys) => {
          if (maxLevel <= 0) return Promise.resolve();

          return this.collectCharacterAgeDistribution(manager, rows, existingKeys, snapshotDate, maxLevel);
        },
      ],
      [
        'characterTopByAge',
        (manager, rows, existingKeys) => this.collectCharacterTopByAge(manager, rows, existingKeys, snapshotDate),
      ],
    ];

    let savedCount = 0;
    for (const [name, collector] of collectors) {
      savedCount += await runMetricsCollector(this.dataSource, this.logger, name, snapshotDate, collector);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Character metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
    return savedCount;
  }

  private async getCharacterMaxLevel(manager: EntityManager): Promise<number> {
    const result = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('MAX(c.level)', 'max_level')
      .getRawOne<{ max_level: number }>();
    return result?.max_level || 0;
  }

  /**
   * One pass over characters grouped by GROUPING SETS ((faction),(class),
   * (race),(level)) — replaces the four-armed UNION ALL that scanned the
   * table once per dimension. grouping() flags identify the active set;
   * FILTER-ed counts exclude the NULL groups the old WHERE clauses dropped.
   */
  private async loadGlobalDimensionAggregates(maxLevel?: number): Promise<CharacterDimensionAggregateRow[]> {
    const levelClause = maxLevel !== undefined ? 'WHERE c.level = $1' : '';
    const params = maxLevel !== undefined ? [maxLevel] : [];

    return this.dataSource.query<Array<CharacterDimensionAggregateRow>>(
      `SELECT grouping(c.faction) AS gf,
              grouping(c.class) AS gc,
              grouping(c.race) AS gr,
              grouping(c.level) AS gl,
              c.faction AS faction,
              c.class AS class,
              c.race AS race,
              CAST(c.level AS VARCHAR) AS level,
              count(*) FILTER (WHERE c.faction IS NOT NULL) AS fc,
              count(*) FILTER (WHERE c.class IS NOT NULL) AS cc,
              count(*) FILTER (WHERE c.race IS NOT NULL) AS rc,
              count(*) AS lc
       FROM characters c
       ${levelClause}
       GROUP BY GROUPING SETS ((c.faction), (c.class), (c.race), (c.level))`,
      params,
    );
  }

  /** Decodes the GROUPING SETS rows back into the UNION ALL row shape. */
  private decodeGlobalDimensionRows(rows: CharacterDimensionAggregateRow[]): CharacterGlobalAggregationRow[] {
    const decoded: CharacterGlobalAggregationRow[] = [];
    for (const row of rows) {
      if (row.gf === 0 && row.faction !== null) {
        decoded.push({ dimension: 'faction', value: row.faction, count: row.fc });
      } else if (row.gc === 0 && row.class !== null) {
        decoded.push({ dimension: 'class', value: row.class, count: row.cc });
      } else if (row.gr === 0 && row.race !== null) {
        decoded.push({ dimension: 'race', value: row.race, count: row.rc });
      } else if (row.gl === 0 && row.level !== null) {
        decoded.push({ dimension: 'level', value: row.level, count: row.lc });
      }
    }
    return decoded;
  }

  /**
   * One pass over characters grouped by GROUPING SETS ((realm_id),
   * (realm_id,faction), (realm_id,class), ()) — replaces five queries:
   * realm totals + in-guilds, global/per-realm unique players, realm faction
   * and realm class breakdowns, plus the global totals the separate
   * characterTotal collector used to scan for on its own.
   */
  private async loadRealmAggregates(): Promise<CharacterRealmAggregateRow[]> {
    return this.dataSource.query<Array<CharacterRealmAggregateRow>>(
      `SELECT grouping(c.realm_id) AS gid,
              grouping(c.faction) AS gf,
              grouping(c.class) AS gc,
              c.realm_id AS realm_id,
              c.faction AS faction,
              c.class AS class,
              count(*) AS total,
              sum(CASE WHEN c.guild_guid IS NOT NULL THEN 1 ELSE 0 END) AS in_guilds,
              count(DISTINCT c.hash_a) AS unique_players,
              count(*) FILTER (WHERE c.faction IS NOT NULL) AS fc,
              count(*) FILTER (WHERE c.class IS NOT NULL) AS cc
       FROM characters c
       GROUP BY GROUPING SETS ((c.realm_id), (c.realm_id, c.faction), (c.realm_id, c.class), ())`,
    );
  }

  /** One pass for realm+faction and realm+class max-level breakdowns. */
  private async loadRealmMaxLevelAggregates(maxLevel: number): Promise<CharacterRealmDimensionAggregateRow[]> {
    return this.dataSource.query<Array<CharacterRealmDimensionAggregateRow>>(
      `SELECT grouping(c.faction) AS gf,
              grouping(c.class) AS gc,
              c.realm_id AS realm_id,
              c.faction AS faction,
              c.class AS class,
              count(*) FILTER (WHERE c.faction IS NOT NULL) AS fc,
              count(*) FILTER (WHERE c.class IS NOT NULL) AS cc
       FROM characters c
       WHERE c.level = $1
       GROUP BY GROUPING SETS ((c.realm_id, c.faction), (c.realm_id, c.class))`,
      [maxLevel],
    );
  }

  private buildDimensionValueMap(
    aggregations: CharacterGlobalAggregationRow[],
    dimension: string,
  ): Record<string, number> {
    const map: Record<string, number> = {};
    for (const row of aggregations) {
      if (row.dimension !== dimension || !row.value) continue;
      map[row.value] = (map[row.value] || 0) + parseInt(row.count, 10);
    }
    return map;
  }

  private collapseRaceMap(source: Record<string, number>): Record<string, number> {
    const collapsed: Record<string, number> = {};
    for (const [raceValue, count] of Object.entries(source)) {
      const raceKey = this.getRaceKey(raceValue);
      if (!raceKey) continue;
      collapsed[raceKey] = (collapsed[raceKey] || 0) + count;
    }
    return collapsed;
  }

  private pushGlobalDimensionRows(
    rows: AnalyticsEntity[],
    manager: EntityManager,
    existingKeys: Set<string>,
    snapshotDate: Date,
    aggregations: CharacterGlobalAggregationRow[],
  ): void {
    const dimensionMetricTypes: Array<[string, AnalyticsMetricType]> = [
      ['faction', AnalyticsMetricType.BY_FACTION],
      ['class', AnalyticsMetricType.BY_CLASS],
      ['race', AnalyticsMetricType.BY_RACE],
      ['level', AnalyticsMetricType.BY_LEVEL],
    ];

    for (const [dimension, metricType] of dimensionMetricTypes) {
      const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, metricType);
      if (existingKeys.has(key)) continue;

      const valueMap = this.buildDimensionValueMap(aggregations, dimension);
      const value = dimension === 'race' ? this.collapseRaceMap(valueMap) : valueMap;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType,
          value,
          snapshotDate,
        }),
      );
    }
  }

  private pushMaxLevelDimensionRows(
    rows: AnalyticsEntity[],
    manager: EntityManager,
    existingKeys: Set<string>,
    snapshotDate: Date,
    aggregations: CharacterGlobalAggregationRow[],
    maxLevel: number,
  ): void {
    const dimensionMetricTypes: Array<[string, AnalyticsMetricType]> = [
      ['faction', AnalyticsMetricType.BY_FACTION_MAX_LEVEL],
      ['class', AnalyticsMetricType.BY_CLASS_MAX_LEVEL],
      ['race', AnalyticsMetricType.BY_RACE_MAX_LEVEL],
      ['level', AnalyticsMetricType.BY_LEVEL_MAX_LEVEL],
    ];

    for (const [dimension, metricType] of dimensionMetricTypes) {
      const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, metricType);
      if (existingKeys.has(key)) continue;

      const valueMap = this.buildDimensionValueMap(aggregations, dimension);
      let value: Record<string, number> = valueMap;
      if (dimension === 'race') {
        value = this.collapseRaceMap(valueMap);
      } else if (dimension === 'level') {
        value = { [String(maxLevel)]: valueMap[String(maxLevel)] || 0 };
      }

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType,
          value,
          snapshotDate,
        }),
      );
    }
  }

  private async collectCharacterTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    realmRows: CharacterRealmAggregateRow[],
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.TOTAL);
    if (existingKeys.has(key)) return;

    const globalRow = realmRows.find((row) => row.gid === 1);
    if (!globalRow) return;

    const totalCount = parseInt(globalRow.total || '0', 10);
    const inGuildsCount = parseInt(globalRow.in_guilds || '0', 10);

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.TOTAL,
        value: {
          count: totalCount,
          inGuilds: inGuildsCount,
          notInGuilds: totalCount - inGuildsCount,
        },
        snapshotDate,
      }),
    );
  }

  /**
   * Emits per-realm TOTAL + UNIQUE_PLAYERS + BY_FACTION + BY_CLASS and the
   * global TOTAL + UNIQUE_PLAYERS rows from the decoded GROUPING SETS pass
   * (see loadRealmAggregates) — previously five separate scans.
   */
  private async collectRealmAggregations(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    realmRows: CharacterRealmAggregateRow[],
  ): Promise<void> {
    const globalRow = realmRows.find((row) => row.gid === 1);

    // Per-realm totals (count + in-guilds): the (realm_id) set alone —
    // grouping flags isolate it from the (realm_id, faction/class) sets.
    for (const realmData of realmRows) {
      const isRealmSet = realmData.gid === 0 && realmData.gf === 1 && realmData.gc === 1;
      if (!isRealmSet || realmData.realm_id === null) continue;

      const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.TOTAL, realmData.realm_id);
      if (existingKeys.has(key)) continue;

      const total = parseInt(realmData.total, 10);
      const inGuilds = parseInt(realmData.in_guilds || '0', 10);
      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.TOTAL,
          realmId: realmData.realm_id,
          value: { count: total, inGuilds, notInGuilds: total - inGuilds },
          snapshotDate,
        }),
      );
    }

    // Global unique players (COUNT(DISTINCT hash_a))
    const globalUniqueKey = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.UNIQUE_PLAYERS);
    if (!existingKeys.has(globalUniqueKey) && globalRow) {
      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
          value: { count: parseInt(globalRow.unique_players || '0', 10) },
          snapshotDate,
        }),
      );
    }

    // Per-realm unique players: same (realm_id) set isolation.
    for (const realmData of realmRows) {
      const isRealmSet = realmData.gid === 0 && realmData.gf === 1 && realmData.gc === 1;
      if (!isRealmSet || realmData.realm_id === null) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CHARACTERS,
        AnalyticsMetricType.UNIQUE_PLAYERS,
        realmData.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
          realmId: realmData.realm_id,
          value: { count: parseInt(realmData.unique_players, 10) },
          snapshotDate,
        }),
      );
    }

    // Per-realm faction breakdown
    const byRealmFaction = realmRows
      .filter((row) => row.gf === 0 && row.realm_id !== null && row.faction !== null)
      .map((row) => ({ realm_id: row.realm_id as number, faction: row.faction as string, count: row.fc }));

    const realmFactionMap = this.groupRealmBreakdown(byRealmFaction, 'faction');
    for (const [realmId, factionCounts] of Object.entries(realmFactionMap)) {
      const realmIdNum = parseInt(realmId, 10);
      const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.BY_FACTION, realmIdNum);
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_FACTION,
          realmId: realmIdNum,
          value: factionCounts,
          snapshotDate,
        }),
      );
    }

    // Per-realm class breakdown
    const byRealmClass = realmRows
      .filter((row) => row.gc === 0 && row.realm_id !== null && row.class !== null)
      .map((row) => ({ realm_id: row.realm_id as number, character_class: row.class as string, count: row.cc }));

    const realmClassMap = this.groupRealmBreakdown(byRealmClass, 'character_class');
    for (const [realmId, classCounts] of Object.entries(realmClassMap)) {
      const realmIdNum = parseInt(realmId, 10);
      const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.BY_CLASS, realmIdNum);
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_CLASS,
          realmId: realmIdNum,
          value: classCounts,
          snapshotDate,
        }),
      );
    }
  }

  private groupRealmBreakdown<K extends string>(
    rows: Array<{ realm_id: number; count: string } & Record<K, string>>,
    dimensionKey: K,
  ): Record<number, Record<string, number>> {
    return rows.reduce(
      (acc, row) => {
        const dimValue = row[dimensionKey];
        if (!dimValue) return acc;
        if (!acc[row.realm_id]) acc[row.realm_id] = {};
        acc[row.realm_id][dimValue] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<number, Record<string, number>>,
    );
  }

  /** Emits realm+faction and realm+class max-level rows from one decoded pass. */
  private pushRealmMaxLevelRows(
    rows: AnalyticsEntity[],
    manager: EntityManager,
    existingKeys: Set<string>,
    snapshotDate: Date,
    maxLevelRows: CharacterRealmDimensionAggregateRow[],
  ): void {
    const factionMap: Record<number, Record<string, number>> = {};
    const classMap: Record<number, Record<string, number>> = {};

    for (const row of maxLevelRows) {
      if (row.realm_id === null) continue;

      if (row.gf === 0 && row.faction !== null) {
        factionMap[row.realm_id] = factionMap[row.realm_id] || {};
        factionMap[row.realm_id][row.faction] = parseInt(row.fc, 10);
      }

      if (row.gc === 0 && row.class !== null) {
        classMap[row.realm_id] = classMap[row.realm_id] || {};
        classMap[row.realm_id][row.class] = parseInt(row.cc, 10);
      }
    }

    for (const [realmId, factionCounts] of Object.entries(factionMap)) {
      const realmIdNum = parseInt(realmId, 10);
      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CHARACTERS,
        AnalyticsMetricType.BY_FACTION_MAX_LEVEL,
        realmIdNum,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_FACTION_MAX_LEVEL,
          realmId: realmIdNum,
          value: factionCounts,
          snapshotDate,
        }),
      );
    }

    for (const [realmId, classCounts] of Object.entries(classMap)) {
      const realmIdNum = parseInt(realmId, 10);
      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CHARACTERS,
        AnalyticsMetricType.BY_CLASS_MAX_LEVEL,
        realmIdNum,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_CLASS_MAX_LEVEL,
          realmId: realmIdNum,
          value: classCounts,
          snapshotDate,
        }),
      );
    }
  }

  private async collectCharacterExtremes(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    maxLevel: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.EXTREMES);
    if (existingKeys.has(key)) return;

    const repo = manager.getRepository(CharactersEntity);
    const maxAchievement = await repo
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.achievement_points', 'value')
      .where('c.achievement_points > 0 AND c.level = :maxLevel', { maxLevel })
      .orderBy('c.achievement_points', 'DESC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const minAchievement = await repo
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.achievement_points', 'value')
      .where('c.achievement_points > 0 AND c.level = :maxLevel', { maxLevel })
      .orderBy('c.achievement_points', 'ASC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const maxMounts = await repo
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.mounts_number', 'value')
      .where('c.mounts_number > 0 AND c.level = :maxLevel', { maxLevel })
      .orderBy('c.mounts_number', 'DESC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const maxPets = await repo
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.pets_number', 'value')
      .where('c.pets_number > 0')
      .orderBy('c.pets_number', 'DESC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const maxItemLevel = await repo
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.avg_item_level', 'value')
      .where('c.avg_item_level > 0 AND c.level = :maxLevel', { maxLevel })
      .orderBy('c.avg_item_level', 'DESC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const value: Record<string, CharacterExtreme> = {};
    if (maxAchievement) value.maxAchievementPoints = maxAchievement;
    if (minAchievement) value.minAchievementPoints = minAchievement;
    if (maxMounts) value.maxMounts = maxMounts;
    if (maxPets) value.maxPets = maxPets;
    if (maxItemLevel) value.maxItemLevel = maxItemLevel;

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.EXTREMES,
        value,
        snapshotDate,
      }),
    );
  }

  private async collectCharacterAverages(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    maxLevel: number,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.AVERAGES);
    if (existingKeys.has(key)) return;

    const averages = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('AVG(c.achievement_points)', 'avg_achievement')
      .addSelect('AVG(c.mounts_number)', 'avg_mounts')
      .addSelect('AVG(c.pets_number)', 'avg_pets')
      .addSelect('AVG(c.avg_item_level)', 'avg_item_level')
      .where('c.achievement_points > 0 AND c.level = :maxLevel', { maxLevel })
      .getRawOne<CharacterAverages>();

    rows.push(
      manager.create(AnalyticsEntity, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.AVERAGES,
        value: {
          achievementPoints: averages ? Math.floor(parseFloat(averages.avg_achievement || '0')) : 0,
          mounts: averages ? Math.floor(parseFloat(averages.avg_mounts || '0')) : 0,
          pets: averages ? Math.floor(parseFloat(averages.avg_pets || '0')) : 0,
          itemLevel: averages ? Math.floor(parseFloat(averages.avg_item_level || '0')) : 0,
        },
        snapshotDate,
      }),
    );
  }

  /**
   * Achievements distribution for max-level characters: median-anchored
   * buckets over achievement_points (see achievement-distribution.util).
   * Global row plus one row per realm, each anchored on its own median/max.
   */
  private async collectCharacterAchievementsDistribution(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    maxLevel: number,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION);
    if (!existingKeys.has(globalKey)) {
      const globalRow = await withAchievementsAnchors(
        addAchievementsDistributionSelect(manager.getRepository(CharactersEntity).createQueryBuilder('c'), 'c'),
        'c',
        { table: 'characters', filter: 'p.level = :maxLevel AND p.achievement_points > 0' },
        false,
      )
        .where('c.level = :maxLevel')
        .andWhere('c.achievement_points > 0')
        .setParameter('maxLevel', maxLevel)
        .getRawOne<AchievementsDistributionRow>();

      if (globalRow) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.CHARACTERS,
            metricType: AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION,
            value: toAchievementsDistributionValue(globalRow),
            snapshotDate,
          }),
        );
      }
    }

    const byRealm = await withAchievementsAnchors(
      addAchievementsDistributionSelect(manager.getRepository(CharactersEntity).createQueryBuilder('c'), 'c'),
      'c',
      { table: 'characters', filter: 'p.level = :maxLevel AND p.achievement_points > 0' },
      true,
    )
      .addSelect('c.realm_id', 'realm_id')
      .where('c.level = :maxLevel')
      .andWhere('c.achievement_points > 0')
      .setParameter('maxLevel', maxLevel)
      .groupBy('c.realm_id')
      .getRawMany<AchievementsDistributionRow>();

    for (const realmRow of byRealm) {
      if (!realmRow?.realm_id) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CHARACTERS,
        AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION,
        realmRow.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.ACHIEVEMENTS_DISTRIBUTION,
          realmId: realmRow.realm_id,
          value: toAchievementsDistributionValue(realmRow),
          snapshotDate,
        }),
      );
    }
  }

  /**
   * Age distribution for max-level characters over created_approx, using the
   * same fixed year tiers as the guild distribution (<1y, 1-3y, 3-5y, 5-10y,
   * 10-15y, 15+y) so both render through the same frontend buckets.
   * created_approx is an approximate creation date backfilled by the OSINT
   * pipeline; dates before the game's release (epoch garbage) are skipped.
   * Global row plus one row per realm.
   */
  private async collectCharacterAgeDistribution(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    maxLevel: number,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.AGE_DISTRIBUTION);
    if (!existingKeys.has(globalKey)) {
      const globalRow = await this.withAgeDistributionSelect(
        manager.getRepository(CharactersEntity).createQueryBuilder('c'),
        maxLevel,
      ).getRawOne<GuildAgeDistributionRow>();

      if (globalRow) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.CHARACTERS,
            metricType: AnalyticsMetricType.AGE_DISTRIBUTION,
            value: this.toAgeDistributionValue(globalRow),
            snapshotDate,
          }),
        );
      }
    }

    const byRealm = await this.withAgeDistributionSelect(
      manager.getRepository(CharactersEntity).createQueryBuilder('c'),
      maxLevel,
    )
      .addSelect('c.realm_id', 'realm_id')
      .groupBy('c.realm_id')
      .getRawMany<GuildAgeDistributionRow>();

    for (const realmRow of byRealm) {
      if (!realmRow?.realm_id) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CHARACTERS,
        AnalyticsMetricType.AGE_DISTRIBUTION,
        realmRow.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.AGE_DISTRIBUTION,
          realmId: realmRow.realm_id,
          value: this.toAgeDistributionValue(realmRow),
          snapshotDate,
        }),
      );
    }
  }

  private withAgeDistributionSelect(
    qb: SelectQueryBuilder<CharactersEntity>,
    maxLevel: number,
  ): SelectQueryBuilder<CharactersEntity> {
    const age = 'now() - c.created_approx';

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
      .addSelect(`MAX(EXTRACT(EPOCH FROM ${age}) / 86400.0)`, 'oldest_days')
      .where('c.level = :maxLevel', { maxLevel })
      .andWhere('c.created_approx IS NOT NULL')
      .andWhere('c.created_approx > :wowRelease', { wowRelease: '2004-11-23' });
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
   * Oldest characters by created_approx: top 3 globally and the single oldest
   * per realm. `value` is the age in whole days. created_approx is populated
   * by the OSINT pipeline as an approximate creation date; dates before the
   * game's release (epoch garbage) are skipped. Produces no rows until the
   * column exists and is backfilled.
   */
  private async collectCharacterTopByAge(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const globalKey = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.TOP_BY_AGE);
    if (!existingKeys.has(globalKey)) {
      const oldest = await this.withOldestCharactersSelect(
        manager.getRepository(CharactersEntity).createQueryBuilder('c'),
      )
        .limit(3)
        .getRawMany<GuildTopByMembers>();

      const value = this.toOldestCharactersValue(oldest);

      if (Object.keys(value).length > 0) {
        rows.push(
          manager.create(AnalyticsEntity, {
            category: AnalyticsMetricCategory.CHARACTERS,
            metricType: AnalyticsMetricType.TOP_BY_AGE,
            value,
            snapshotDate,
          }),
        );
      }
    }

    // DISTINCT ON keeps one row per realm — the oldest, per ORDER BY.
    const byRealm = await this.withOldestCharactersSelect(
      manager.getRepository(CharactersEntity).createQueryBuilder('c'),
    )
      .distinctOn(['c.realm_id'])
      .addSelect('c.realm_id', 'realm_id')
      .orderBy('c.realm_id', 'ASC')
      .addOrderBy('c.created_approx', 'ASC')
      .getRawMany<GuildTopByMembers & { realm_id: number }>();

    for (const character of byRealm) {
      if (!character?.realm_id || !character.guid) continue;

      const key = analyticsKeyOf(
        AnalyticsMetricCategory.CHARACTERS,
        AnalyticsMetricType.TOP_BY_AGE,
        character.realm_id,
      );
      if (existingKeys.has(key)) continue;

      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.TOP_BY_AGE,
          realmId: character.realm_id,
          value: this.toOldestCharactersValue([character]),
          snapshotDate,
        }),
      );
    }
  }

  private withOldestCharactersSelect(qb: SelectQueryBuilder<CharactersEntity>): SelectQueryBuilder<CharactersEntity> {
    return qb
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect(`FLOOR(EXTRACT(EPOCH FROM (now() - c.created_approx)) / 86400.0)`, 'value')
      .where('c.created_approx IS NOT NULL')
      .andWhere('c.created_approx > :wowRelease', { wowRelease: '2004-11-23' })
      .orderBy('c.created_approx', 'ASC');
  }

  private toOldestCharactersValue(characters: GuildTopByMembers[]): Record<string, GuildTopByMembers> {
    const value: Record<string, GuildTopByMembers> = {};

    for (const character of characters) {
      if (character?.guid) {
        value[character.guid] = { ...character, value: Number(character.value ?? 0) };
      }
    }

    return value;
  }
}
