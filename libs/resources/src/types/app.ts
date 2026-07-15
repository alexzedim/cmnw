export interface AppHealthPayload {
  status: 'ok';
  version: string;
  uptime: string;
  latestMarketTimestamp: number | null;
}

export interface IRaidLogsStats {
  realmSlug: string | null;
  total: number;
  indexed: number;
  notIndexed: number;
}
