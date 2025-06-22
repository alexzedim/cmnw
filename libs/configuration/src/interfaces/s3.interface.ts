export interface S3Config {
  readonly credentials: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  }
  readonly region: string;
  readonly endpoint: string;
  readonly forcePathStyle: boolean;
}
