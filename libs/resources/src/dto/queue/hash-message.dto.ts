import { Logger } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { hashQueue } from '../../queues/hash.queue';

export interface IHashMessageBase {
  characterGuid: string;
  scannedAt: string;
}

export class HashMessageDto {
  public readonly name: string;
  public readonly data: IHashMessageBase;
  public readonly opts?: JobsOptions;

  private static readonly hashLogger = new Logger(HashMessageDto.name);

  constructor(name: string, data: IHashMessageBase, opts?: JobsOptions) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  static create(data: IHashMessageBase, opts?: JobsOptions): HashMessageDto {
    const name = `hash-${data.characterGuid}`;

    const mergedOpts = {
      jobId: data.characterGuid,
      ...hashQueue.defaultJobOptions,
      ...opts,
    };

    const dto = new HashMessageDto(name, data, mergedOpts);
    dto.validate(false, 'HashMessageDto.create');
    return dto;
  }

  validate(strict: boolean = true, logTag: string = 'HashMessageDto.validate'): void {
    const isGuidValid = typeof this.data?.characterGuid === 'string' && this.data.characterGuid.length > 0;

    if (isGuidValid) return;

    const message = `${logTag}: invalid hash message — characterGuid is required`;
    if (strict) {
      throw new Error(message);
    }
    HashMessageDto.hashLogger.warn(message);
  }
}
