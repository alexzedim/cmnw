export const WCL_BASE_URL = 'https://www.warcraftlogs.com';

export const WCL_ZONE_REPORTS_URL = `${WCL_BASE_URL}/zone/reports`;

export const WCL_FIGHTS_PARTICIPANTS_URL = (logId: string): string =>
  `${WCL_BASE_URL}/reports/fights-and-participants/${logId}/0`;

export const WCL_GRAPHQL_URL = `${WCL_BASE_URL}/api/v2/client`;

export const WCL_ZONE_REPORTS_URL_BUILDER = (serverId: number, page: number): string =>
  `${WCL_ZONE_REPORTS_URL}?server=${serverId}&page=${page}`;

export const WCL_REPORT_QUERY = (logId: string): string => `
  query {
    reportData {
      report (code: "${logId}") {
        startTime
        rankedCharacters {
          id
          name
          guildRank
          server {
            id
            name
            normalizedName
            slug
          }
        }
        masterData {
          actors {
            type
            name
            server
          }
        }
      }
    }
  }`;

export const WCL_CF_CHALLENGE_MARKER = 'Just a moment';

export const WCL_HUMAN_CHALLENGE_MARKER = '/human-challenge';

export const WCL_ZONE_REPORTS_SELECTORS = {
  ROW: 'tbody > tr',
  TIMESTAMP: 'td > span.moment-format',
  REPORT_LINK: 'td.description-cell > a',
} as const;

export const WCL_LOG_ID_LENGTH = 16;

export const WCL_GRAPHQL_REQUEST_DELAY_MS = 1_100;

export enum WCL_RAID_LOG_STATUS {
  DISCOVERED = 'discovered',
  DOWNLOADED = 'downloaded',
  PARSED = 'parsed',
  NOT_FOUND = 'not_found',
  FAILED = 'failed',
}

export enum WCL_PAYLOAD_SOURCE {
  FIGHTS = 'fights',
  GRAPHQL = 'graphql',
}

export const WCL_BROWSER_STATE_KEY = 'wcl:browser:storage-state';

export const WCL_BROWSER_COOLDOWN_KEY = 'wcl:browser:cooldown';

export const WCL_DISCOVERY_CURSOR_KEY = 'wcl:discovery:cursor';

export const WCL_HISTORY_CURSOR_KEY = 'wcl:history:cursor';

export const WCL_HISTORY_LOCK_KEY = 'wcl:history:lock';
