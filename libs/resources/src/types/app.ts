export interface AppHealthPayload {
  status: 'ok';
  version: string;
  timestamp: string;
  uptime: number;
}
