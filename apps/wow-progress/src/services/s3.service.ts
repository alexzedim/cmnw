import { Injectable, Logger } from '@nestjs/common';
import { InjectS3, S3 } from 'nestjs-s3';
import { promisify } from 'util';
import zlib from 'zlib';
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  PutBucketEncryptionCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';


@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucketName = 'cmnw-wow-progress';

  constructor(
    @InjectS3()
    private readonly s3: S3,
  ) { }

  async ensureBucketExists(): Promise<boolean> {
    try {
      // Check if bucket exists
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket '${this.bucketName}' already exists`);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Bucket '${this.bucketName}' does not exist. Creating...`);
        await this.createBucket();
        return true;
      } else if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
        this.logger.error(`Access denied to bucket '${this.bucketName}'. Check permissions.`);
        return false
      } else {
        this.logger.error(`Error checking bucket '${this.bucketName}':`, error);
        return false;
      }
    }
  }

  private async createBucket(): Promise<void> {
    try {
      const createParams: any = {
        Bucket: this.bucketName,
      };

      await this.s3.send(new CreateBucketCommand(createParams));
      this.logger.log(`Successfully created bucket '${this.bucketName}'`);

      // Optional: Configure bucket settings
      await this.configureBucket();

    } catch (error) {
      if (error instanceof BucketAlreadyOwnedByYou) {
        this.logger.log(`Bucket '${this.bucketName}' already owned by you`);
      } else if (error.name === 'BucketAlreadyExists') {
        this.logger.warn(`Bucket '${this.bucketName}' already exists (owned by someone else)`);
        throw new Error(`Bucket name '${this.bucketName}' is already taken`);
      } else {
        this.logger.error(`Failed to create bucket '${this.bucketName}':`, error);
        throw error;
      }
    }
  }

  private async configureBucket(): Promise<void> {
    try {
      // Enable versioning
      await this.s3.send(new PutBucketVersioningCommand({
        Bucket: this.bucketName,
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      }));

      // Enable server-side encryption
      await this.s3.send(new PutBucketEncryptionCommand({
        Bucket: this.bucketName,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      }));

      this.logger.log(`Configured versioning and encryption for bucket '${this.bucketName}'`);
    } catch (error) {
      this.logger.warn(`Failed to configure bucket settings: ${error.message}`);
      // Don't throw here - bucket creation succeeded
    }
  }

  // Initialize method to call during app startup
  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  // Getter for bucket name
  getBucketName(): string {
    return this.bucketName;
  }

  // Getter for S3 client
  getS3Client(): S3 {
    return this.s3;
  }

  // Check if file exists in bucket
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`Error checking if file exists '${key}':`, error);
      throw error;
    }
  }

  // Get file metadata if it exists
  async getFileMetadata(key: string): Promise<any | null> {
    try {
      const response = await this.s3.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      return {
        exists: true,
        size: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return {
          exists: false,
        };
      }
      this.logger.error(`Error getting file metadata '${key}':`, error);
      throw error;
    }
  }

  // Write file to S3 bucket
  async writeFile(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      overwrite?: boolean;
    }
  ): Promise<{ success: boolean; key: string; size: number; etag?: string }> {
    try {
      const { contentType, metadata, overwrite = true } = options || {};

      // Check if file exists and overwrite is false
      if (!overwrite) {
        const exists = await this.fileExists(key);
        if (exists) {
          throw new Error(`File already exists: ${key}. Set overwrite: true to replace it.`);
        }
      }

      // Convert string to buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      // Determine content type if not provided
      const finalContentType = contentType || this.getContentTypeFromKey(key);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: finalContentType,
        ContentLength: buffer.length,
        Metadata: {
          'upload-date': new Date().toISOString(),
          ...metadata,
        },
      });

      const response = await this.s3.send(command);

      this.logger.log(`Successfully uploaded file to S3: ${key} (${buffer.length} bytes)`);

      return {
        success: true,
        key,
        size: buffer.length,
        etag: response.ETag,
      };

    } catch (error) {
      this.logger.error(`Failed to write file '${key}' to S3:`, error);
      throw error;
    }
  }

  // Helper method to determine content type from file key/extension
  private getContentTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'xml': 'application/xml',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'gz': 'application/gzip',
      'tar': 'application/x-tar',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
    };

    return contentTypes[extension || ''] || 'application/octet-stream';
  }

  async findGzFiles(
    bucketName: string,
    prefix?: string,
    maxKeys: number = 1000
  ): Promise<string[]> {
    const gzFiles: string[] = [];
    let continuationToken: string | undefined;
    let requestCount = 0;

    try {
      do {
        const params: ListObjectsV2CommandInput = {
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: Math.min(maxKeys, 1000), // AWS max is 1000
        };

        const command = new ListObjectsV2Command(params);
        const response = await this.s3.send(command);
        requestCount++;

        if (response.Contents) {
          const gzFilesInBatch = response.Contents
            .filter(obj => obj.Key && obj.Key.endsWith('.gz'))
            .map(obj => obj.Key!);

          gzFiles.push(...gzFilesInBatch);

          // Log progress for large buckets
          if (requestCount % 10 === 0) {
            this.logger.log(`Processed ${requestCount} batches, found ${gzFiles.length} .gz files so far`);
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken); // This loop continues until ALL files are retrieved

      this.logger.log(`Total requests: ${requestCount}, Total .gz files found: ${gzFiles.length}`);
      return gzFiles;
    } catch (error) {
      throw new Error(`Failed to list .gz files from S3: ${error.message}`);
    }
  }

  async readAndDecompressGzFile(
    bucketName: string,
    fileName: string,
    encoding: BufferEncoding = 'utf8'
  ): Promise<unknown> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      });

      const response = await this.s3.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as any;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const compressedBuffer = Buffer.concat(chunks);

      const gunzip = promisify(zlib.gunzip)
      const decompressedBuffer = await gunzip(compressedBuffer);

      return JSON.parse(decompressedBuffer.toString(encoding));
    } catch (error) {
      throw new Error(`Failed to read and decompress .gz file from S3: ${error.message}`);
    }
  }
}
