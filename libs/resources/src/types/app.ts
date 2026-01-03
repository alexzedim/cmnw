export interface AppHealthMetricSnapshot {
  snapshotDate: string;
  value: Record<string, any>;
}

export interface AppHealthPayload {
  status: 'ok';
  version: string;
  uptime: string;
  metrics: {
    characters: AppHealthMetricSnapshot | null;
    guilds: AppHealthMetricSnapshot | null;
    market: AppHealthMetricSnapshot | null;
    latestMarketTimestamp: number | null;
  };
}
