export interface ILokiConfig {
  readonly lokiUrl: string;
  readonly logToLoki: boolean;
  readonly logToConsole: boolean;
  readonly gzip: boolean;
}
