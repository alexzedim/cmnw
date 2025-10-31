export interface S3BucketConfig {
  readonly bucketName: string;
  readonly region?: string;
  readonly enableVersioning?: boolean;
  readonly enableEncryption?: boolean;
  readonly encryptionAlgorithm?: 'AES256' | 'aws:kms';
}

export interface S3ModuleOptions {
  readonly defaultBucket?: string;
  readonly buckets?: S3BucketConfig[];
}

export interface S3Config {
  readonly credentials: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
  readonly region: string;
  readonly endpoint: string;
  readonly forcePathStyle: boolean;
  readonly moduleOptions?: S3ModuleOptions;
}
