export interface ICmnwConfig {
  readonly port: number;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly callbackUrl: string;
  readonly cors: {
    readonly origins: string[];
    readonly allowCredentials: boolean;
  };
}
