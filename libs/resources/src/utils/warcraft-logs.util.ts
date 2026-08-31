import { parse } from 'node-html-parser';
import { WCL_LOG_ID_LENGTH, WCL_ZONE_REPORTS_SELECTORS } from '../constants';
import type { WclZoneReportsRow } from '../types';

/**
 * Extracts raid log entries from a warcraftlogs.com /zone/reports page.
 * Selectors are the long-proven ones from the legacy scraper; only the
 * transport changed in the pipeline redesign.
 */
export const extractZoneReportsRows = (html: string): Array<WclZoneReportsRow> => {
  const rows: Array<WclZoneReportsRow> = [];

  parse(html)
    .querySelectorAll(WCL_ZONE_REPORTS_SELECTORS.ROW)
    .forEach((element) => {
      const timestamp = element.querySelector(WCL_ZONE_REPORTS_SELECTORS.TIMESTAMP)?.getAttribute('data-timestamp');
      const href = element.querySelector(WCL_ZONE_REPORTS_SELECTORS.REPORT_LINK)?.getAttribute('href');
      if (!href?.includes('reports') || !timestamp) return;

      const logId = href.slice(-WCL_LOG_ID_LENGTH);
      if (logId.length !== WCL_LOG_ID_LENGTH) return;

      const unixSeconds = Number(timestamp);
      rows.push({
        logId,
        startedAt: Number.isFinite(unixSeconds) ? new Date(unixSeconds * 1000) : null,
      });
    });

  return rows;
};
