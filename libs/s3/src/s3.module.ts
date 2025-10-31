import { Module, DynamicModule } from '@nestjs/common';
import { S3Module as NestS3Module } from 'nestjs-s3';
import { S3Service } from './s3.service';
import { S3ModuleOptions } from './interfaces/s3.interface';

@Module({})
export class S3Module {
  /**
   * Configure S3Module with a configuration object that includes AWS S3 config and module options
   * @param config - Configuration object with AWS credentials and module options
   */
  static forRoot(config: {
    credentials: { accessKeyId: string; secretAccessKey: string };
    region: string;
    endpoint: string;
    forcePathStyle: boolean;
    moduleOptions?: S3ModuleOptions;
  }): DynamicModule {
    const { moduleOptions, ...awsConfig } = config;

    return {
      module: S3Module,
      imports: [
        NestS3Module.forRoot({
          config: awsConfig,
        }),
      ],
      providers: [
        {
          provide: 'S3_MODULE_OPTIONS',
          useValue: moduleOptions || {},
        },
        S3Service,
      ],
      exports: [S3Service],
      global: true,
    };
  }

  /**
   * Legacy method for backward compatibility - supports separate AWS config and module options
   * @deprecated Use forRoot with merged config instead
   */
  static forRootLegacy(
    s3Config: any,
    options?: S3ModuleOptions,
  ): DynamicModule {
    return {
      module: S3Module,
      imports: [
        NestS3Module.forRoot({
          config: s3Config,
        }),
      ],
      providers: [
        {
          provide: 'S3_MODULE_OPTIONS',
          useValue: options || {},
        },
        S3Service,
      ],
      exports: [S3Service],
      global: true,
    };
  }

  static forRootAsync(configFactory: {
    useFactory: (...args: any[]) => {
      s3Config: any;
      options?: S3ModuleOptions;
    };
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: S3Module,
      imports: [
        ...(configFactory.imports || []),
        NestS3Module.forRootAsync({
          useFactory: async (...args: any[]) => {
            const { s3Config } = await configFactory.useFactory(...args);
            return { config: s3Config };
          },
          inject: configFactory.inject,
        }),
      ],
      providers: [
        {
          provide: 'S3_MODULE_OPTIONS',
          useFactory: async (...args: any[]) => {
            const { options } = await configFactory.useFactory(...args);
            return options || {};
          },
          inject: configFactory.inject,
        },
        S3Service,
      ],
      exports: [S3Service],
      global: true,
    };
  }
}
