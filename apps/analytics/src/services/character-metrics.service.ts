import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';
import { analyticsMetricExists } from '@app/resources/dao';
import {
  CharacterFactionAggregation,
  CharacterClassAggregation,
  CharacterRaceAggregation,
  CharacterLevelAggregation,
  CharacterRealmAggregation,
  CharacterRealmUniquePlayersAggregation,
  CharacterRealmFactionAggregation,
  CharacterRealmClassAggregation,
  CharacterExtreme,
  CharacterAverages,
  CharacterClassMaxLevelAggregation,
  CharacterFactionMaxLevelAggregation,
  CharacterRaceMaxLevelAggregation,
} from '@app/resources/types';
import { AnalyticsEntity, CharactersEntity } from '@app/pg';

@Injectable()
export class CharacterMetricsService {
  private readonly logger = new Logger(CharacterMetricsService.name, {
    timestamp: true,
  });

  constructor(
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
    let savedCount = 0;
    const startTime = Date.now();

    try {
      const maxLevel = await this.getCharacterMaxLevel();

      // Total count
      const totalCount = await this.charactersRepository.count();
      const inGuildsCount = await this.charactersRepository.count({
        where: { guildGuid: Not(IsNull()) },
      });
      const notInGuildsCount = totalCount - inGuildsCount;

      // Check if total metric exists
      const isTotalExists = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.TOTAL,
        snapshotDate,
      });

      if (!isTotalExists) {
        const characterTotalMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.TOTAL,
          value: {
            count: totalCount,
            inGuilds: inGuildsCount,
            notInGuilds: notInGuildsCount,
          },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterTotalMetric);
        savedCount++;
      }

      // By Faction (global)
      savedCount += await this.snapshotCharacterByFaction(snapshotDate, null);

      // By Class (global)
      savedCount += await this.snapshotCharacterByClass(snapshotDate, null);

      // By Race (global)
      savedCount += await this.snapshotCharacterByRace(snapshotDate, null);

      // By Level (global)
      savedCount += await this.snapshotCharacterByLevel(snapshotDate, null);

      // By Realm (with guild counts)
      const byRealm = await this.getCharacterRealmAggregations();

      for (const realmData of byRealm) {
        // Check if realm total metric exists
        const isRealmTotalExists = await analyticsMetricExists(this.analyticsMetricRepository, {
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.TOTAL,
          snapshotDate,
          realmId: realmData.realm_id,
        });

        if (!isRealmTotalExists) {
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
          savedCount++;
        }
      }

      // Unique players (distinct hash_a) — global + per-realm
      savedCount += await this.snapshotCharacterUniquePlayers(snapshotDate);

      // By Realm + Faction
      savedCount += await this.snapshotCharacterByRealmFaction(snapshotDate);

      // By Realm + Class
      savedCount += await this.snapshotCharacterByRealmClass(snapshotDate);

      // Max Level Metrics (global)
      if (maxLevel > 0) {
        savedCount += await this.snapshotCharacterByClassMaxLevel(snapshotDate, null, maxLevel);
        savedCount += await this.snapshotCharacterByFactionMaxLevel(snapshotDate, null, maxLevel);
        savedCount += await this.snapshotCharacterByRaceMaxLevel(snapshotDate, null, maxLevel);
        savedCount += await this.snapshotCharacterByLevelMaxLevel(snapshotDate, null, maxLevel);

        // By Realm + Class Max Level
        savedCount += await this.snapshotCharacterByRealmClassMaxLevel(snapshotDate, maxLevel);

        // By Realm + Faction Max Level
        savedCount += await this.snapshotCharacterByRealmFactionMaxLevel(snapshotDate, maxLevel);
      }

      // Extremes (global)
      savedCount += await this.snapshotCharacterExtremes(snapshotDate, maxLevel);

      // Averages (global)
      savedCount += await this.snapshotCharacterAverages(snapshotDate, maxLevel);

      const duration = Date.now() - startTime;
      this.logger.log(`Character metrics snapshotted - metricsCount: ${savedCount}, durationMs: ${duration}`);
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

    return savedCount;
  }

  private async getCharacterMaxLevel(): Promise<number> {
    const result = await this.charactersRepository
      .createQueryBuilder('c')
      .select('MAX(c.level)', 'max_level')
      .getRawOne<{ max_level: number }>();

    return result?.max_level || 0;
  }

  private async getCharacterRealmAggregations(): Promise<CharacterRealmAggregation[]> {
    return this.charactersRepository
      .createQueryBuilder('c')
      .select('c.realm_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN c.guild_guid IS NOT NULL THEN 1 ELSE 0 END)`, 'in_guilds')
      .groupBy('c.realm_id')
      .getRawMany<CharacterRealmAggregation>();
  }

  private async snapshotCharacterByFaction(snapshotDate: Date, realmId: number | null): Promise<number> {
    // Check if metric exists
    const isByFactionExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_FACTION,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByFactionExists) {
      return 0;
    }

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

    const characterByFactionMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_FACTION,
      realmId: realmId || undefined,
      value: factionMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByFactionMetric);
    this.logger.debug({
      logTag: 'snapshotCharacterByFaction',
      message: 'Inserted metric',
      metric: {
        category: characterByFactionMetric.category,
        metricType: characterByFactionMetric.metricType,
        realmId: characterByFactionMetric.realmId,
        value: characterByFactionMetric.value,
      },
    });
    return 1;
  }

  private async snapshotCharacterByClass(snapshotDate: Date, realmId: number | null): Promise<number> {
    // Check if metric exists
    const isByClassExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_CLASS,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByClassExists) {
      return 0;
    }

    const byClass = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.class', 'character_class')
      .addSelect('COUNT(*)', 'count')
      .where('c.class IS NOT NULL')
      .groupBy('c.class')
      .getRawMany<CharacterClassAggregation>();

    const classMap = byClass.reduce(
      (acc, row) => {
        acc[row.character_class] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const characterByClassMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_CLASS,
      realmId: realmId || undefined,
      value: classMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByClassMetric);
    this.logger.debug({
      logTag: 'snapshotCharacterByClass',
      message: 'Inserted metric',
      metric: {
        category: characterByClassMetric.category,
        metricType: characterByClassMetric.metricType,
        realmId: characterByClassMetric.realmId,
        value: characterByClassMetric.value,
      },
    });
    return 1;
  }

  private async snapshotCharacterByRace(snapshotDate: Date, realmId: number | null): Promise<number> {
    // Check if metric exists
    const isByRaceExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_RACE,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByRaceExists) {
      return 0;
    }

    const byRace = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.race')
      .addSelect('COUNT(*)', 'count')
      .where('c.race IS NOT NULL')
      .groupBy('c.race')
      .getRawMany<CharacterRaceAggregation>();

    const raceMap = byRace.reduce(
      (acc, row) => {
        const raceKey = this.getRaceKey(row.race);

        if (!raceKey) {
          return acc;
        }

        acc[raceKey] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const characterByRaceMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_RACE,
      realmId: realmId || undefined,
      value: raceMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByRaceMetric);
    this.logger.debug({
      logTag: 'snapshotCharacterByRace',
      message: 'Inserted metric',
      metric: {
        category: characterByRaceMetric.category,
        metricType: characterByRaceMetric.metricType,
        realmId: characterByRaceMetric.realmId,
        value: characterByRaceMetric.value,
      },
    });
    return 1;
  }

  private async snapshotCharacterByLevel(snapshotDate: Date, realmId: number | null): Promise<number> {
    // Check if metric exists
    const isByLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_LEVEL,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByLevelExists) {
      return 0;
    }

    const byLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('c.level IS NOT NULL')
      .groupBy('c.level')
      .getRawMany<CharacterLevelAggregation>();

    const levelMap = byLevel.reduce(
      (acc, row) => {
        acc[String(row.level)] =
          parseInt(<string>(<unknown>acc[String(row.level)]) || '0', 10) + parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const characterByLevelMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_LEVEL,
      realmId: realmId || undefined,
      value: levelMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByLevelMetric);
    return 1;
  }

  private async snapshotCharacterUniquePlayers(snapshotDate: Date): Promise<number> {
    let savedCount = 0;

    // Global distinct count
    const isGlobalExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
      snapshotDate,
    });

    if (!isGlobalExists) {
      const global = await this.charactersRepository
        .createQueryBuilder('c')
        .select('COUNT(DISTINCT c.hash_a)', 'unique_players')
        .where('c.hash_a IS NOT NULL')
        .getRawOne<{ unique_players: string }>();

      const globalMetric = this.analyticsMetricRepository.create({
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
        value: { count: parseInt(global?.unique_players || '0', 10) },
        snapshotDate,
      });
      await this.analyticsMetricRepository.save(globalMetric);
      savedCount++;
    }

    // Per-realm distinct counts (single grouped query)
    const byRealm = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.realm_id')
      .addSelect('COUNT(DISTINCT c.hash_a)', 'unique_players')
      .where('c.hash_a IS NOT NULL')
      .groupBy('c.realm_id')
      .getRawMany<CharacterRealmUniquePlayersAggregation>();

    for (const realmData of byRealm) {
      const isRealmExists = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
        snapshotDate,
        realmId: realmData.realm_id,
      });

      if (!isRealmExists) {
        const realmMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.UNIQUE_PLAYERS,
          realmId: realmData.realm_id,
          value: { count: parseInt(realmData.unique_players, 10) },
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(realmMetric);
        savedCount++;
      }
    }

    return savedCount;
  }

  private async snapshotCharacterByRealmFaction(snapshotDate: Date): Promise<number> {
    const byRealmFaction = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.realm_id')
      .addSelect('c.faction', 'faction')
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

    let savedCount = 0;
    for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
      // Check if metric exists
      const isRealmFactionExists = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_FACTION,
        snapshotDate,
        realmId: parseInt(realmId, 10),
      });

      if (!isRealmFactionExists) {
        const characterRealmFactionMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_FACTION,
          realmId: parseInt(realmId, 10),
          value: factionCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmFactionMetric);
        savedCount++;
      }
    }
    return savedCount;
  }

  private async snapshotCharacterByRealmClass(snapshotDate: Date): Promise<number> {
    const byRealmClass = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.realm_id')
      .addSelect('c.class', 'character_class')
      .addSelect('COUNT(*)', 'count')
      .where('c.class IS NOT NULL')
      .groupBy('c.realm_id, c.class')
      .getRawMany<CharacterRealmClassAggregation>();

    const byRealmClassMap = byRealmClass.reduce(
      (acc, row) => {
        if (!acc[row.realm_id]) acc[row.realm_id] = {};
        acc[row.realm_id][row.character_class] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<number, Record<string, number>>,
    );

    let savedCount = 0;
    for (const [realmId, classCounts] of Object.entries(byRealmClassMap)) {
      // Check if metric exists
      const isRealmClassExists = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_CLASS,
        snapshotDate,
        realmId: parseInt(realmId, 10),
      });

      if (!isRealmClassExists) {
        const characterRealmClassMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_CLASS,
          realmId: parseInt(realmId, 10),
          value: classCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmClassMetric);
        savedCount++;
      }
    }
    return savedCount;
  }

  private async snapshotCharacterByClassMaxLevel(
    snapshotDate: Date,
    realmId: number | null,
    maxLevel: number,
  ): Promise<number> {
    // Check if metric exists
    const isByClassMaxLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_CLASS_MAX_LEVEL,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByClassMaxLevelExists) {
      return 0;
    }

    const byClassMaxLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.class', 'character_class')
      .addSelect('COUNT(*)', 'count')
      .where('c.class IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.class')
      .getRawMany<CharacterClassMaxLevelAggregation>();

    const classMap = byClassMaxLevel.reduce(
      (acc, row) => {
        acc[row.character_class] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const characterByClassMaxLevelMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_CLASS_MAX_LEVEL,
      realmId: realmId || undefined,
      value: classMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByClassMaxLevelMetric);
    return 1;
  }

  private async snapshotCharacterByFactionMaxLevel(
    snapshotDate: Date,
    realmId: number | null,
    maxLevel: number,
  ): Promise<number> {
    // Check if metric exists
    const isByFactionMaxLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_FACTION_MAX_LEVEL,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByFactionMaxLevelExists) {
      return 0;
    }

    const byFactionMaxLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.faction', 'faction')
      .addSelect('COUNT(*)', 'count')
      .where('c.faction IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.faction')
      .getRawMany<CharacterFactionMaxLevelAggregation>();

    const factionMap = byFactionMaxLevel.reduce(
      (acc, row) => {
        acc[row.faction] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const characterByFactionMaxLevelMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_FACTION_MAX_LEVEL,
      realmId: realmId || undefined,
      value: factionMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByFactionMaxLevelMetric);
    return 1;
  }

  private async snapshotCharacterByRaceMaxLevel(
    snapshotDate: Date,
    realmId: number | null,
    maxLevel: number,
  ): Promise<number> {
    // Check if metric exists
    const isByRaceMaxLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_RACE_MAX_LEVEL,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByRaceMaxLevelExists) {
      return 0;
    }

    const byRaceMaxLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.race')
      .addSelect('COUNT(*)', 'count')
      .where('c.race IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.race')
      .getRawMany<CharacterRaceMaxLevelAggregation>();

    const raceMap = byRaceMaxLevel.reduce(
      (acc, row) => {
        const raceKey = this.getRaceKey(row.race);

        if (!raceKey) {
          return acc;
        }

        acc[raceKey] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const characterByRaceMaxLevelMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_RACE_MAX_LEVEL,
      realmId: realmId || undefined,
      value: raceMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByRaceMaxLevelMetric);
    return 1;
  }

  private async snapshotCharacterByLevelMaxLevel(
    snapshotDate: Date,
    realmId: number | null,
    maxLevel: number,
  ): Promise<number> {
    // Check if metric exists
    const isByLevelMaxLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_LEVEL_MAX_LEVEL,
      snapshotDate,
      realmId: realmId || undefined,
    });

    if (isByLevelMaxLevelExists) {
      return 0;
    }

    const byLevelMaxLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.level = :maxLevel', { maxLevel })
      .getRawOne<{ count: string }>();

    const levelMap = {
      [String(maxLevel)]: parseInt(byLevelMaxLevel?.count || '0', 10),
    };

    const characterByLevelMaxLevelMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.BY_LEVEL_MAX_LEVEL,
      realmId: realmId || undefined,
      value: levelMap,
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterByLevelMaxLevelMetric);
    return 1;
  }

  private async snapshotCharacterByRealmClassMaxLevel(snapshotDate: Date, maxLevel: number): Promise<number> {
    const byRealmClassMaxLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.realm_id')
      .addSelect('c.class', 'character_class')
      .addSelect('COUNT(*)', 'count')
      .where('c.class IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.realm_id, c.class')
      .getRawMany<CharacterRealmClassAggregation>();

    const byRealmClassMap = byRealmClassMaxLevel.reduce(
      (acc, row) => {
        if (!acc[row.realm_id]) acc[row.realm_id] = {};
        acc[row.realm_id][row.character_class] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<number, Record<string, number>>,
    );

    let savedCount = 0;
    for (const [realmId, classCounts] of Object.entries(byRealmClassMap)) {
      // Check if metric exists
      const isRealmClassMaxLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_CLASS_MAX_LEVEL,
        snapshotDate,
        realmId: parseInt(realmId, 10),
      });

      if (!isRealmClassMaxLevelExists) {
        const characterRealmClassMaxLevelMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_CLASS_MAX_LEVEL,
          realmId: parseInt(realmId, 10),
          value: classCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmClassMaxLevelMetric);
        savedCount++;
      }
    }
    return savedCount;
  }

  private async snapshotCharacterByRealmFactionMaxLevel(snapshotDate: Date, maxLevel: number): Promise<number> {
    const byRealmFactionMaxLevel = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.realm_id')
      .addSelect('c.faction', 'faction')
      .addSelect('COUNT(*)', 'count')
      .where('c.faction IS NOT NULL AND c.level = :maxLevel', { maxLevel })
      .groupBy('c.realm_id, c.faction')
      .getRawMany<CharacterRealmFactionAggregation>();

    const byRealmFactionMap = byRealmFactionMaxLevel.reduce(
      (acc, row) => {
        if (!acc[row.realm_id]) acc[row.realm_id] = {};
        acc[row.realm_id][row.faction] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<number, Record<string, number>>,
    );

    let savedCount = 0;
    for (const [realmId, factionCounts] of Object.entries(byRealmFactionMap)) {
      // Check if metric exists
      const isRealmFactionMaxLevelExists = await analyticsMetricExists(this.analyticsMetricRepository, {
        category: AnalyticsMetricCategory.CHARACTERS,
        metricType: AnalyticsMetricType.BY_FACTION_MAX_LEVEL,
        snapshotDate,
        realmId: parseInt(realmId, 10),
      });

      if (!isRealmFactionMaxLevelExists) {
        const characterRealmFactionMaxLevelMetric = this.analyticsMetricRepository.create({
          category: AnalyticsMetricCategory.CHARACTERS,
          metricType: AnalyticsMetricType.BY_FACTION_MAX_LEVEL,
          realmId: parseInt(realmId, 10),
          value: factionCounts,
          snapshotDate,
        });
        await this.analyticsMetricRepository.save(characterRealmFactionMaxLevelMetric);
        savedCount++;
      }
    }
    return savedCount;
  }

  private async snapshotCharacterExtremes(snapshotDate: Date, maxLevel: number): Promise<number> {
    // Check if metric exists
    const isExtremesExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.EXTREMES,
      snapshotDate,
    });

    if (isExtremesExists) {
      return 0;
    }

    const maxAchievement = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.achievement_points', 'value')
      .where('c.achievement_points > 0 AND c.level = :maxLevel', { maxLevel })
      .orderBy('c.achievement_points', 'DESC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const minAchievement = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.achievement_points', 'value')
      .where('c.achievement_points > 0 AND c.level = :maxLevel', { maxLevel })
      .orderBy('c.achievement_points', 'ASC')
      .limit(1)
      .getRawOne<CharacterExtreme>();

    const maxMounts = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.guid', 'guid')
      .addSelect('c.name', 'name')
      .addSelect('c.realm', 'realm')
      .addSelect('c.mounts_number', 'value')
      .where('c.mounts_number > 0 AND c.level = :maxLevel', { maxLevel })
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
      .where('c.avg_item_level > 0 AND c.level = :maxLevel', { maxLevel })
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
    return 1;
  }

  private async snapshotCharacterAverages(snapshotDate: Date, maxLevel: number): Promise<number> {
    // Check if metric exists
    const isAveragesExists = await analyticsMetricExists(this.analyticsMetricRepository, {
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.AVERAGES,
      snapshotDate,
    });

    if (isAveragesExists) {
      return 0;
    }

    const averages = await this.charactersRepository
      .createQueryBuilder('c')
      .select('AVG(c.achievement_points)', 'avg_achievement')
      .addSelect('AVG(c.mounts_number)', 'avg_mounts')
      .addSelect('AVG(c.pets_number)', 'avg_pets')
      .addSelect('AVG(c.avg_item_level)', 'avg_item_level')
      .where('c.achievement_points > 0 AND c.level = :maxLevel', { maxLevel })
      .getRawOne<CharacterAverages>();

    const characterAveragesMetric = this.analyticsMetricRepository.create({
      category: AnalyticsMetricCategory.CHARACTERS,
      metricType: AnalyticsMetricType.AVERAGES,
      value: {
        achievementPoints: averages ? Math.floor(parseFloat(averages.avg_achievement || '0')) : 0,
        mounts: averages ? Math.floor(parseFloat(averages.avg_mounts || '0')) : 0,
        pets: averages ? Math.floor(parseFloat(averages.avg_pets || '0')) : 0,
        itemLevel: averages ? Math.floor(parseFloat(averages.avg_item_level || '0')) : 0,
      },
      snapshotDate,
    });
    await this.analyticsMetricRepository.save(characterAveragesMetric);
    return 1;
  }
}
