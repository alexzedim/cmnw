export interface S3FileMetadata {
  exists: boolean;
  size?: number;
  lastModified?: Date;
  etag?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface S3WriteFileOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  overwrite?: boolean;
  bucketName?: string;
}

export interface S3WriteFileResult {
  success: boolean;
  key: string;
  size: number;
  etag?: string;
}

export interface S3BucketConfig {
  bucketName: string;
  region?: string;
  enableVersioning?: boolean;
  enableEncryption?: boolean;
  encryptionAlgorithm?: 'AES256' | 'aws:kms';
}

export interface S3ModuleOptions {
  defaultBucket?: string;
  buckets?: S3BucketConfig[];
}