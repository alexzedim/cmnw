import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
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
  PutBucketVersioningCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  S3FileMetadata,
  S3WriteFileOptions,
  S3WriteFileResult,
  S3BucketConfig,
  S3ModuleOptions,
} from './interfaces/s3.interface';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly defaultBucket: string;
  private buckets: Map<string, S3BucketConfig> = new Map();

  constructor(
    @InjectS3()
    private readonly s3: S3,
    @Inject('S3_MODULE_OPTIONS')
    private readonly _moduleOptions: S3ModuleOptions,
  ) {
    this.defaultBucket = this._moduleOptions.defaultBucket || 'cmnw';
    this.buckets = new Map();
    if (this._moduleOptions.buckets) {
      this._moduleOptions.buckets.forEach((_bucket) => {});
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      // Initialize all configured buckets
      if (this.buckets.size > 0) {
        for (const [bucketName, config] of this.buckets) {
          await this.ensureBucketExists(bucketName, config);
        }
      } else {
        // Initialize default bucket if no buckets configured
        await this.ensureBucketExists(this.defaultBucket);
      }
    } catch (error) {
      this.logger.error('Failed to initialize S3 buckets', error);
      throw error;
    }
  }

  async ensureBucketExists(
    bucketName: string = this.defaultBucket,
    config?: S3BucketConfig,
  ): Promise<boolean> {
    try {
      // Check if bucket exists
      await this.s3.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket '${bucketName}' already exists`);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Bucket '${bucketName}' does not exist. Creating...`);
        await this.createBucket(bucketName, config);
        return true;
      } else if (
        error.name === 'Forbidden' ||
        error.$metadata?.httpStatusCode === 403
      ) {
        this.logger.error(
          `Access denied to bucket '${bucketName}'. Check permissions.`,
        );
        return false;
      } else {
        this.logger.error(`Error checking bucket '${bucketName}':`, error);
        return false;
      }
    }
  }

  private async createBucket(
    bucketName: string,
    config?: S3BucketConfig,
  ): Promise<void> {
    try {
      const createParams: any = {
        Bucket: bucketName,
      };

      // Add region if specified in config
      if (config?.region && config.region !== 'us-east-1') {
        createParams.CreateBucketConfiguration = {
          LocationConstraint: config.region,
        };
      }

      await this.s3.send(new CreateBucketCommand(createParams));
      this.logger.log(`Successfully created bucket '${bucketName}'`);

      // Configure bucket settings
      await this.configureBucket(bucketName, config);
    } catch (error) {
      if (error instanceof BucketAlreadyOwnedByYou) {
        this.logger.log(`Bucket '${bucketName}' already owned by you`);
      } else if (error.name === 'BucketAlreadyExists') {
        this.logger.warn(
          `Bucket '${bucketName}' already exists (owned by someone else)`,
        );
        throw new Error(`Bucket name '${bucketName}' is already taken`);
      } else {
        this.logger.error(`Failed to create bucket '${bucketName}':`, error);
        throw error;
      }
    }
  }

  private async configureBucket(
    bucketName: string,
    config?: S3BucketConfig,
  ): Promise<void> {
    try {
      // Enable versioning if requested
      if (config?.enableVersioning !== false) {
        await this.s3.send(
          new PutBucketVersioningCommand({
            Bucket: bucketName,
            VersioningConfiguration: {
              Status: 'Enabled',
            },
          }),
        );
        this.logger.log(`Configured versioning for bucket '${bucketName}'`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to configure bucket settings for '${bucketName}': ${error.message}`,
      );
      // Don't throw here - bucket creation succeeded
    }
  }

  // Get default bucket name
  getDefaultBucketName(): string {
    return this.defaultBucket;
  }

  /**
   * Get bucket name for a specific context (app/service)
   * @param context - Context identifier (e.g., 'wow-progress')
   * @returns bucket name for the context or default bucket
   */
  getBucketName(context?: string): string {
    if (!context) {
      return this.defaultBucket;
    }

    // Only wow-progress has a separate bucket
    if (context === 'wow-progress') {
      return 'cmnw-wow-progress';
    }

    return this.defaultBucket;
  }

  // Get S3 client
  getS3Client(): S3 {
    return this.s3;
  }

  // Check if file exists in bucket
  async fileExists(
    key: string,
    bucketName: string = this.defaultBucket,
  ): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(
        `Error checking if file exists '${key}' in '${bucketName}':`,
        error,
      );
      throw error;
    }
  }

  // Get file metadata if it exists
  async getFileMetadata(
    key: string,
    bucketName: string = this.defaultBucket,
  ): Promise<S3FileMetadata> {
    try {
      const response = await this.s3.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

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
      this.logger.error(
        `Error getting file metadata '${key}' from '${bucketName}':`,
        error,
      );
      throw error;
    }
  }

  // Write file to S3 bucket
  async writeFile(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: S3WriteFileOptions,
  ): Promise<S3WriteFileResult> {
    try {
      const {
        contentType,
        metadata,
        overwrite = true,
        bucketName = this.defaultBucket,
      } = options || {};

      // Ensure bucket exists before writing
      await this.ensureBucketExists(bucketName);

      // Check if file exists and overwrite is false
      if (!overwrite) {
        const exists = await this.fileExists(key, bucketName);
        if (exists) {
          throw new Error(
            `File already exists: ${key}. Set overwrite: true to replace it.`,
          );
        }
      }

      // Convert string to buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      // Determine content type if not provided
      const finalContentType = contentType || this.getContentTypeFromKey(key);

      const command = new PutObjectCommand({
        Bucket: bucketName,
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

      this.logger.log(
        `Successfully uploaded file to S3: ${key} (${buffer.length} bytes) to bucket '${bucketName}'`,
      );

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

  // Read file from S3 bucket
  async readFile(
    key: string,
    bucketName: string = this.defaultBucket,
    encoding: BufferEncoding = 'utf8',
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
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

      const buffer = Buffer.concat(chunks);
      return buffer.toString(encoding);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found: ${key} in bucket '${bucketName}'`);
      }
      this.logger.error(`Failed to read file '${key}' from S3:`, error);
      throw error;
    }
  }

  // Read JSON file from S3 bucket
  async readJsonFile<T = any>(
    key: string,
    bucketName: string = this.defaultBucket,
  ): Promise<T> {
    try {
      const content = await this.readFile(key, bucketName);
      return JSON.parse(content);
    } catch (error) {
      if (error.message.includes('File not found')) {
        throw error;
      }
      throw new Error(`Failed to parse JSON file '${key}': ${error.message}`);
    }
  }

  // Write JSON file to S3 bucket
  async writeJsonFile(
    key: string,
    data: any,
    options?: Omit<S3WriteFileOptions, 'contentType'>,
  ): Promise<S3WriteFileResult> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      return await this.writeFile(key, jsonString, {
        ...options,
        contentType: 'application/json',
      });
    } catch (error) {
      this.logger.error(`Failed to write JSON file '${key}':`, error);
      throw error;
    }
  }

  // Helper method to determine content type from file key/extension
  private getContentTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      txt: 'text/plain',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      pdf: 'application/pdf',
      zip: 'application/zip',
      gz: 'application/gzip',
      tar: 'application/x-tar',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };

    return contentTypes[extension || ''] || 'application/octet-stream';
  }

  // Find files by extension
  async findFilesByExtension(
    extension: string,
    bucketName: string = this.defaultBucket,
    prefix?: string,
    maxKeys: number = 1000,
  ): Promise<string[]> {
    const files: string[] = [];
    let continuationToken: string | undefined;
    let requestCount = 0;

    try {
      do {
        const params: ListObjectsV2CommandInput = {
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: Math.min(maxKeys, 1000), // AWS max is 1000
        };

        const command = new ListObjectsV2Command(params);
        const response = await this.s3.send(command);
        requestCount++;

        if (response.Contents) {
          const matchingFiles = response.Contents.filter(
            (obj) => obj.Key && obj.Key.endsWith(`.${extension}`),
          ).map((obj) => obj.Key!);

          files.push(...matchingFiles);

          // Log progress for large buckets
          if (requestCount % 10 === 0) {
            this.logger.log(
              `Processed ${requestCount} batches, found ${files.length} .${extension} files so far`,
            );
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      this.logger.log(
        `Total requests: ${requestCount}, Total .${extension} files found: ${files.length}`,
      );
      return files;
    } catch (error) {
      throw new Error(
        `Failed to list .${extension} files from S3: ${error.message}`,
      );
    }
  }

  // Find .gz files (backward compatibility with existing implementation)
  async findGzFiles(
    bucketName: string = this.defaultBucket,
    prefix?: string,
    maxKeys: number = 1000,
  ): Promise<string[]> {
    return this.findFilesByExtension('gz', bucketName, prefix, maxKeys);
  }

  // Read and decompress .gz file
  async readAndDecompressGzFile<T = any>(
    fileName: string,
    bucketName: string = this.defaultBucket,
    encoding: BufferEncoding = 'utf8',
  ): Promise<T> {
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

      const gunzip = promisify(zlib.gunzip);
      const decompressedBuffer = await gunzip(compressedBuffer);

      return JSON.parse(decompressedBuffer.toString(encoding));
    } catch (error) {
      throw new Error(
        `Failed to read and decompress .gz file from S3: ${error.message}`,
      );
    }
  }
}
