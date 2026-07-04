import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AnalyticsEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources';

interface RankRecord {
  guid?: string;
  itemId?: number | string;
  [key: string]: unknown;
}

/**
 * One-off, idempotent normalizer that converts legacy `analytics.value`
 * payloads into the standardized object format.
 *
 * Standardized contract: every metric `value` is a JSONB **object** keyed by
 * entity identifier (guild `guid` or `String(itemId)`), never an array.
 *
 * Legacy shapes handled here:
 *  - arrays of records (topByMembers/Achievements/Volume/Auctions, and the
 *    newer array rows of the contract metrics)
 *  - single bare record objects for the contract metrics
 *    (topByQuantity/topByOpenInterest/priceVolatility) where the record fields
 *    sit at the top level instead of being keyed by itemId.
 */
@Injectable()
export class AnalyticsMigrationService {
  private readonly logger = new Logger(AnalyticsMigrationService.name, {
    timestamp: true,
  });

  private static readonly ARRAY_METRIC_TYPES = [
    AnalyticsMetricType.TOP_BY_MEMBERS,
    AnalyticsMetricType.TOP_BY_ACHIEVEMENTS,
    AnalyticsMetricType.TOP_BY_VOLUME,
    AnalyticsMetricType.TOP_BY_AUCTIONS,
    AnalyticsMetricType.TOP_BY_QUANTITY,
    AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
    AnalyticsMetricType.PRICE_VOLATILITY,
  ] as const;

  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly analyticsRepository: Repository<AnalyticsEntity>,
  ) {}

  async migrate(): Promise<{ migratedRows: number; byMetricType: Record<string, number> }> {
    const logTag = 'migrateAnalyticsValues';
    const byMetricType: Record<string, number> = {};
    let migratedRows = 0;

    const legacyRows = await this.analyticsRepository.find({
      where: {
        metricType: In([...AnalyticsMigrationService.ARRAY_METRIC_TYPES]),
      },
    });

    const pending = legacyRows.filter((row) => this.needsMigration(row));

    if (pending.length === 0) {
      this.logger.log({ logTag, message: 'No legacy analytics values to migrate' });

      return { migratedRows: 0, byMetricType };
    }

    for (const row of pending) {
      const normalized = this.normalize(
        row.category as AnalyticsMetricCategory,
        row.metricType as AnalyticsMetricType,
        row.value,
      );

      if (!normalized) {
        continue;
      }

      await this.analyticsRepository.update({ id: row.id }, { value: normalized as Record<string, any> });
      migratedRows += 1;
      byMetricType[row.metricType] = (byMetricType[row.metricType] ?? 0) + 1;
    }

    this.logger.log({
      logTag,
      message: 'Analytics values migrated to standardized object format',
      migratedRows,
      byMetricType,
    });

    return { migratedRows, byMetricType };
  }

  private needsMigration(row: AnalyticsEntity): boolean {
    return this.isArrayValue(row.value) || this.isBareContractRecord(row.metricType, row.value);
  }

  private isArrayValue(value: AnalyticsEntity['value']): boolean {
    return Array.isArray(value);
  }

  /**
   * Contract metrics (topByQuantity / topByOpenInterest / priceVolatility)
   * were historically stored as a single bare record: `{ itemId, ... }`.
   * The standardized form keys it: `{ [itemId]: { itemId, ... } }`.
   */
  private isBareContractRecord(metricType: string, value: AnalyticsEntity['value']): boolean {
    if (
      metricType !== AnalyticsMetricType.TOP_BY_QUANTITY &&
      metricType !== AnalyticsMetricType.TOP_BY_OPEN_INTEREST &&
      metricType !== AnalyticsMetricType.PRICE_VOLATILITY
    ) {
      return false;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(value, 'itemId');
  }

  private normalize(
    category: AnalyticsMetricCategory,
    metricType: AnalyticsMetricType,
    value: AnalyticsEntity['value'],
  ): Record<string, unknown> | null {
    if (this.isArrayValue(value)) {
      return this.normalizeArray(category, metricType, value as unknown as RankRecord[]);
    }

    if (this.isBareContractRecord(metricType, value)) {
      return this.normalizeBareRecord(value as RankRecord);
    }

    return null;
  }

  private normalizeArray(
    category: AnalyticsMetricCategory,
    metricType: AnalyticsMetricType,
    records: RankRecord[],
  ): Record<string, unknown> | null {
    const keyed: Record<string, unknown> = {};

    for (const record of records) {
      if (!record || typeof record !== 'object') {
        continue;
      }

      const key = this.recordKey(category, metricType, record);
      if (!key) {
        continue;
      }

      keyed[key] = record;
    }

    return keyed;
  }

  private normalizeBareRecord(record: RankRecord): Record<string, unknown> | null {
    if (!record || record.itemId == null) {
      return null;
    }
    const key = String(record.itemId);

    return { [key]: record };
  }

  private recordKey(
    category: AnalyticsMetricCategory,
    metricType: AnalyticsMetricType,
    record: RankRecord,
  ): string | null {
    if (category === AnalyticsMetricCategory.GUILDS) {
      return record.guid ?? null;
    }

    if (
      metricType === AnalyticsMetricType.TOP_BY_VOLUME ||
      metricType === AnalyticsMetricType.TOP_BY_AUCTIONS ||
      metricType === AnalyticsMetricType.TOP_BY_QUANTITY ||
      metricType === AnalyticsMetricType.TOP_BY_OPEN_INTEREST ||
      metricType === AnalyticsMetricType.PRICE_VOLATILITY ||
      category === AnalyticsMetricCategory.MARKET ||
      category === AnalyticsMetricCategory.CONTRACTS
    ) {
      return record.itemId != null ? String(record.itemId) : null;
    }

    return null;
  }
}
