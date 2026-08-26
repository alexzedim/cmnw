import { AnalyticsEntity } from '@app/pg';
import { findExistingAnalyticsKeys } from '@app/resources/dao';
import type { Logger } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

/**
 * A single named metrics collector. Collectors only accumulate rows; the
 * runner owns the transaction and the save.
 */
export type MetricsCollector = (
  manager: EntityManager,
  rows: AnalyticsEntity[],
  existingKeys: Set<string>,
) => Promise<void>;

/**
 * Runs one collector in its own short transaction and commits only its rows.
 *
 * Isolation is the point: a slow or failing query pins (or rolls back) a
 * single collector instead of the whole snapshot, so one bad metric can no
 * longer starve every other metric of its daily row. Collector failures are
 * logged and swallowed — the snapshot continues with the remaining collectors.
 */
export const runMetricsCollector = async (
  dataSource: DataSource,
  logger: Logger,
  name: string,
  snapshotDate: Date,
  collector: MetricsCollector,
): Promise<number> => {
  const startTime = Date.now();

  try {
    const savedCount = await dataSource.transaction(async (manager) => {
      const existingKeys = await findExistingAnalyticsKeys(manager, snapshotDate);
      const rows: AnalyticsEntity[] = [];

      await collector(manager, rows, existingKeys);

      if (rows.length > 0) {
        await manager.save(AnalyticsEntity, rows);
      }

      return rows.length;
    });

    const duration = Date.now() - startTime;
    logger.log(`Collector committed - collector: ${name}, rows: ${savedCount}, durationMs: ${duration}`);
    return savedCount;
  } catch (errorOrException) {
    const duration = Date.now() - startTime;
    logger.error({
      collector: name,
      message: 'Collector failed, continuing with remaining collectors',
      errorOrException,
      durationMs: duration,
    });
    return 0;
  }
};
