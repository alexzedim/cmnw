export interface ICmnwConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly port: number;
  readonly origin: string[];
}
