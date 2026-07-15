import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AnalyticsEntity } from '@app/pg';
import { AnalyticsMetricCategory, AnalyticsMetricType, ARRAY_METRIC_TYPES } from '@app/resources';
import { RankRecord } from '@app/resources/types';

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
        metricType: In([...ARRAY_METRIC_TYPES]),
      },
    });

    const pending = legacyRows.filter((row) => this.needsMigration(row));

    if (pending.length === 0) {
      this.logger.log({ logTag, message: 'No legacy analytics values to migrate' });
    } else {
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
    }

    // Second pass: rename the legacy SUM-based field names on the contract
    // top metrics to the new MAX/MIN shape. Runs on every startup but only
    // touches rows that still carry the old keys, so it is idempotent.
    const fieldMigration = await this.migrateContractTopMetricFields();
    migratedRows += fieldMigration.migratedRows;
    for (const [type, count] of Object.entries(fieldMigration.byMetricType)) {
      byMetricType[type] = (byMetricType[type] ?? 0) + count;
    }

    return { migratedRows, byMetricType };
  }

  /**
   * Renames the legacy SUM-based fields on topByQuantity / topByOpenInterest
   * snapshots to the MAX/MIN shape now emitted by ContractMetricsService.
   *
   * The values were originally aggregated as `SUM` over 24h snapshots
   * (`quantity` / `openInterest`); the live job now emits intraday
   * `MAX`/`MIN` (`maxQuantity` / `minQuantity` / `maxOpenInterest` /
   * `minOpenInterest`). Without this, pre-existing rows render blank in the
   * frontend, which only knows the new field names.
   *
   * The true intraday MIN is not recoverable from a stored SUM, so it is set
   * to the same value as MAX (an honest lower-bound placeholder). New daily
   * rows will carry the correct MIN once recomputed by the live job.
   *
   * Idempotent: a record is only rewritten while it still has a legacy key
   * and lacks the replacement, so already-migrated rows are skipped. Handles
   * both the standardized keyed form (`{ [itemId]: {...} }`) and the bare
   * record form (`{ itemId, ... }`), which the first pass normalizes.
   */
  private async migrateContractTopMetricFields(): Promise<{
    migratedRows: number;
    byMetricType: Record<string, number>;
  }> {
    const logTag = 'migrateContractTopMetricFields';
    const byMetricType: Record<string, number> = {};
    let migratedRows = 0;

    const contractTopTypes = [
      AnalyticsMetricType.TOP_BY_QUANTITY,
      AnalyticsMetricType.TOP_BY_OPEN_INTEREST,
    ];

    const rows = await this.analyticsRepository.find({
      where: { metricType: In(contractTopTypes) },
    });

    for (const row of rows) {
      const records = this.collectContractTopRecords(row.value);
      let changed = false;

      for (const record of records) {
        if (this.renameTopMetricFields(record)) {
          changed = true;
        }
      }

      if (changed) {
        await this.analyticsRepository.update({ id: row.id }, { value: row.value });
        migratedRows += 1;
        byMetricType[row.metricType] = (byMetricType[row.metricType] ?? 0) + 1;
      }
    }

    if (migratedRows > 0) {
      this.logger.log({
        logTag,
        message: 'Renamed contract top-metric SUM fields to MAX/MIN shape',
        migratedRows,
        byMetricType,
      });
    }

    return { migratedRows, byMetricType };
  }

  /**
   * Collects the per-item records to migrate from a contract top-metric value.
   * Supports the standardized keyed form (`{ [itemId]: {...} }`) and the bare
   * record form (`{ itemId, ... }`).
   */
  private collectContractTopRecords(value: AnalyticsEntity['value']): Record<string, unknown>[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    // Bare record form: the value itself is the record.
    if (Object.prototype.hasOwnProperty.call(value, 'itemId')) {
      return [value as Record<string, unknown>];
    }

    // Standardized keyed form: each entry is a record.
    return Object.values(value as Record<string, unknown>).filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    );
  }

  /**
   * Renames legacy SUM fields to the MAX/MIN shape on a single record, in place.
   * Returns whether any field changed.
   */
  private renameTopMetricFields(record: Record<string, unknown>): boolean {
    let changed = false;

    if (
      Object.prototype.hasOwnProperty.call(record, 'quantity') &&
      !Object.prototype.hasOwnProperty.call(record, 'maxQuantity')
    ) {
      const sum = record.quantity;
      record.maxQuantity = sum;
      record.minQuantity = sum;
      delete record.quantity;
      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(record, 'openInterest') &&
      !Object.prototype.hasOwnProperty.call(record, 'maxOpenInterest')
    ) {
      const sum = record.openInterest;
      record.maxOpenInterest = sum;
      record.minOpenInterest = sum;
      delete record.openInterest;
      changed = true;
    }

    return changed;
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
