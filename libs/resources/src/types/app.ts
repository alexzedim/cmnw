export interface AppHealthPayload {
  status: 'ok';
  version: string;
  uptime: string;
  latestMarketTimestamp: number | null;
}
