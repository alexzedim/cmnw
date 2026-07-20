import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import { analyticsKeyOf, findExistingAnalyticsKeys } from '@app/resources/dao';
import {
  CharacterAverages,
  CharacterExtreme,
  CharacterRealmClassAggregation,
  CharacterRealmFactionAggregation,
  CharacterRealmUniquePlayersAggregation,
} from '@app/resources/types';
import { AnalyticsEntity, CharactersEntity } from '@app/pg';

interface CharacterGlobalAggregationRow {
  dimension: 'faction' | 'class' | 'race' | 'level';
  value: string;
  count: string;
}

@Injectable()
export class CharacterMetricsService {
  private readonly logger = new Logger(CharacterMetricsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsMetricRepository: Repository<AnalyticsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
  ) {}

  private getRaceKey(value: string | null | undefined): string | null {
    if (!value || value.toLowerCase() === 'unknown') {
      return 'unknown';
    }
    return value;
  }

  async snapshotCharacterMetrics(snapshotDate: Date): Promise<number> {
    const logTag = 'snapshotCharacterMetrics';
    const startTime = Date.now();

    try {
      const savedCount = await this.dataSource.transaction(async (manager) => {
        const existingKeys = await findExistingAnalyticsKeys(manager, snapshotDate);
        const rows: AnalyticsEntity[] = [];

        const maxLevel = await this.getCharacterMaxLevel(manager);

        await this.collectCharacterTotal(manager, rows, existingKeys, snapshotDate);

        // Global dimension aggregations: faction / class / race / level in one UNION ALL query.
        const globalAggregations = await this.getGlobalAggregations(manager);
        this.pushGlobalDimensionRows(rows, manager, existingKeys, snapshotDate, globalAggregations);

        // Realm totals + unique players + realm/faction + realm/class.
        await this.collectRealmAggregations(manager, rows, existingKeys, snapshotDate);

        if (maxLevel > 0) {
          // Max-level dimension aggregations: faction / class / race / level in one UNION ALL query.
          const maxLevelAggregations = await this.getGlobalAggregations(manager, maxLevel);
          this.pushMaxLevelDimensionRows(rows, manager, existingKeys, snapshotDate, maxLevelAggregations, maxLevel);

          // Realm + faction max-level and realm + class max-level.
          await this.collectRealmMaxLevelAggregations(manager, rows, existingKeys, snapshotDate, maxLevel);
        }

        await this.collectCharacterExtremes(manager, rows, existingKeys, snapshotDate, maxLevel);
        await this.collectCharacterAverages(manager, rows, existingKeys, snapshotDate, maxLevel);

        if (rows.length > 0) {
          await manager.save(AnalyticsEntity, rows);
        }
        return rows.length;
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Character metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
      return savedCount;
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      this.logger.error({
        logTag,
        message: 'Error snapshotting character metrics',
        errorOrException,
        durationMs: duration,
      });
      throw errorOrException;
    }
  }

  private async getCharacterMaxLevel(manager: EntityManager): Promise<number> {
    const result = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('MAX(c.level)', 'max_level')
      .getRawOne<{ max_level: number }>();
    return result?.max_level || 0;
  }

  private async collectCharacterTotal(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    const key = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.TOTAL);
    if (existingKeys.has(key)) return;

    const result = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN c.guild_guid IS NOT NULL THEN 1 ELSE 0 END)`, 'in_guilds')
      .getRawOne<{ total: string; in_guilds: string }>();

    const totalCount = parseInt(result?.total || '0', 10);
    const inGuildsCount = parseInt(result?.in_guilds || '0', 10);

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
   * Collapses 4 separate GROUP BY queries (faction / class / race / level) into a
   * single UNION ALL round-trip. Each row is tagged with its dimension so the
   * caller can split the result back into 4 metric payloads.
   */
  private async getGlobalAggregations(
    manager: EntityManager,
    maxLevel?: number,
  ): Promise<CharacterGlobalAggregationRow[]> {
    const levelClause = maxLevel !== undefined ? 'AND c.level = $1' : '';
    const params = maxLevel !== undefined ? [maxLevel] : [];

    const sql = `
      SELECT 'faction' AS dimension, c.faction AS value, COUNT(*) AS count
      FROM characters c
      WHERE c.faction IS NOT NULL ${levelClause}
      GROUP BY c.faction
      UNION ALL
      SELECT 'class' AS dimension, c.class AS value, COUNT(*) AS count
      FROM characters c
      WHERE c.class IS NOT NULL ${levelClause}
      GROUP BY c.class
      UNION ALL
      SELECT 'race' AS dimension, c.race AS value, COUNT(*) AS count
      FROM characters c
      WHERE c.race IS NOT NULL ${levelClause}
      GROUP BY c.race
      UNION ALL
      SELECT 'level' AS dimension, CAST(c.level AS VARCHAR) AS value, COUNT(*) AS count
      FROM characters c
      WHERE c.level IS NOT NULL ${levelClause}
      GROUP BY c.level
    `;

    return manager.query(sql, params);
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

  /**
   * Emits per-realm TOTAL + UNIQUE_PLAYERS + BY_FACTION + BY_CLASS metric rows.
   * Realm totals are aggregated in JS from a single GROUP BY realm_id query (with
   * a SUM(CASE WHEN guild_guid ...) for in-guild counts). UNIQUE_PLAYERS uses a
   * separate per-realm COUNT(DISTINCT hash_a) query (cannot be summed from the
   * grouped rows). Realm/faction and realm/class are each a single grouped query.
   */
  private async collectRealmAggregations(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
  ): Promise<void> {
    // Per-realm totals (count + in-guilds)
    const byRealm = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('c.realm_id', 'realm_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN c.guild_guid IS NOT NULL THEN 1 ELSE 0 END)`, 'in_guilds')
      .groupBy('c.realm_id')
      .getRawMany<{ realm_id: number; total: string; in_guilds: string }>();

    for (const realmData of byRealm) {
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

    // Global + per-realm unique players (COUNT(DISTINCT hash_a))
    const globalUniqueKey = analyticsKeyOf(AnalyticsMetricCategory.CHARACTERS, AnalyticsMetricType.UNIQUE_PLAYERS);
    if (!existingKeys.has(globalUniqueKey)) {
      const globalRow = await manager
        .getRepository(CharactersEntity)
        .createQueryBuilder('c')
        .select('COUNT(DISTINCT c.hash_a)', 'unique_players')
        .where('c.hash_a IS NOT NULL')
        .getRawOne<{ unique_players: string }>();
      rows.push(
        manager.create(AnalyticsEntity, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
          value: { count: parseInt(globalRow?.unique_players || '0', 10) },
          snapshotDate,
        }),
      );
    }

    const uniqueByRealm = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('c.realm_id', 'realm_id')
      .addSelect('COUNT(DISTINCT c.hash_a)', 'unique_players')
      .where('c.hash_a IS NOT NULL')
      .groupBy('c.realm_id')
      .getRawMany<CharacterRealmUniquePlayersAggregation>();

    for (const realmData of uniqueByRealm) {
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
    const byRealmFaction = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('c.realm_id', 'realm_id')
      .addSelect('c.faction', 'faction')
      .addSelect('COUNT(*)', 'count')
      .where('c.faction IS NOT NULL')
      .groupBy('c.realm_id, c.faction')
      .getRawMany<CharacterRealmFactionAggregation>();

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
    const byRealmClass = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('c.realm_id', 'realm_id')
      .addSelect('c.class', 'character_class')
      .addSelect('COUNT(*)', 'count')
      .where('c.class IS NOT NULL')
      .groupBy('c.realm_id, c.class')
      .getRawMany<CharacterRealmClassAggregation>();

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

  private async collectRealmMaxLevelAggregations(
    manager: EntityManager,
    rows: AnalyticsEntity[],
    existingKeys: Set<string>,
    snapshotDate: Date,
    maxLevel: number,
  ): Promise<void> {
    const byRealmFactionMaxLevel = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('c.realm_id', 'realm_id')
      .addSelect('c.faction', 'faction')
      .addSelect('COUNT(*)', 'count')
      .where('c.faction IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.realm_id, c.faction')
      .getRawMany<CharacterRealmFactionAggregation>();

    const realmFactionMap = this.groupRealmBreakdown(byRealmFactionMaxLevel, 'faction');
    for (const [realmId, factionCounts] of Object.entries(realmFactionMap)) {
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

    const byRealmClassMaxLevel = await manager
      .getRepository(CharactersEntity)
      .createQueryBuilder('c')
      .select('c.realm_id', 'realm_id')
      .addSelect('c.class', 'character_class')
      .addSelect('COUNT(*)', 'count')
      .where('c.class IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.realm_id, c.class')
      .getRawMany<CharacterRealmClassAggregation>();

    const realmClassMap = this.groupRealmBreakdown(byRealmClassMaxLevel, 'character_class');
    for (const [realmId, classCounts] of Object.entries(realmClassMap)) {
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
}
