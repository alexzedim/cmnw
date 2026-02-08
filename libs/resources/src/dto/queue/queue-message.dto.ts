/**
 * Base DTO for BullMQ Queue Messages
 *
 * Provides a standardized structure for all BullMQ queue messages.
 * Implements strict output structure: { name: NameType, data: DataType, opts?: JobsOptions }.
 */
import { Logger } from '@nestjs/common';
import type { JobsOptions } from '@nestjs/bullmq';

/**
 * Base interface for BullMQ job data
 * Contains all job-specific data that travels in job.data field
 */
export interface IQueueMessageBase<T> {
  /** Job payload (validated DTO) */
  data: T;
  /** Job priority (0-10, default: 5) */
  priority?: number;
  /** Source service/component */
  source?: string;
  /** Number of retry attempts */
  attempts?: number;
  /** Additional job metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Base Queue Message DTO for BullMQ
 *
 * Provides validation and transformation for all BullMQ jobs.
 * Implements strict structure: { name: NameType, data: DataType, opts?: JobsOptions }.
 */
export class QueueMessageDto<T, NameType extends string> {
  private static readonly logger = new Logger(QueueMessageDto.name);

  /**
   * The queue name for the job
   */
  readonly name: NameType;

  /**
   * The data payload for queue job
   */
  readonly data: T;

  /**
   * BullMQ job options
   */
  readonly opts?: JobsOptions;

  /**
   * Creates a new QueueMessageDto instance with strict structure
   *
   * @param name - The queue name
   * @param data - The message data
   * @param opts - Optional BullMQ job options
   */
  constructor(
    name: NameType,
    data: T,
    opts?: JobsOptions,
  ) {
    this.name = name;
    this.data = data;
    this.opts = opts;
  }

  /**
   * Creates a message with validation (backward compatibility)
   *
   * @param name - The queue name
   * @param data - The message data
   * @param opts - Optional BullMQ job options
   * @returns Validated QueueMessageDto instance
   */
  static create<T, NameType extends string>(
    name: NameType,
    data: T,
    opts?: JobsOptions,
  ): QueueMessageDto<T, NameType> {
    const message = new QueueMessageDto(name, data, opts);
    message.validate();
    return message;
  }

  /**
   * Validate message structure
   *
   * @param strict - If true, throws errors; if false, logs warnings
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true): void {
    const requiredFields = ['name', 'data'];

    for (const field of requiredFields) {
      if (this[field] === undefined || this[field] === null) {
        const message = `Validation failed: missing required field '${field}'`;
        if (strict) {
          throw new Error(message);
        } else {
          QueueMessageDto.logger.warn({
            logTag: 'QueueMessageDto.validate',
            message,
          });
        }
      }
    }

    // Validate priority range in opts
    if (this.opts?.priority !== undefined) {
      if (this.opts.priority < 0 || this.opts.priority > 10) {
        const message = `Validation failed: priority must be between 0-10, got '${this.opts.priority}'`;
        if (strict) {
          throw new Error(message);
        } else {
          QueueMessageDto.logger.warn({
            logTag: 'QueueMessageDto.validate',
            message,
            priority: this.opts.priority,
          });
        }
      }
    }

    // Validate data payload
    if (this.data && typeof this.data === 'object') {
      const dto = this.data as any;
      // If data has a validate method (like our DTOs), call it
      if (typeof dto.validate === 'function') {
        try {
          dto.validate(strict);
        } catch (error) {
          const message = `Validation failed for message data: ${error.message}`;
          if (strict) {
            throw new Error(message);
          } else {
            QueueMessageDto.logger.warn({
              logTag: 'QueueMessageDto.validate',
              message,
              error: error.message,
            });
          }
        }
      }
    }
  }

  /**
   * Get current attempt count from opts
   *
   * @returns The number of attempts made
   */
  getAttempts(): number {
    return this.opts?.attempts ?? 0;
  }

  /**
   * Get priority from opts
   *
   * @returns The priority level (0-10)
   */
  getPriority(): number {
    return this.opts?.priority ?? 5;
  }

  /**
   * Get source from metadata
   *
   * @returns The source string
   */
  getSource(): string {
    return (this.opts?.metadata as Record<string, unknown> | undefined)?.source as string ?? 'unknown';
  }

  /**
   * Increment retry attempt counter in opts
   *
   * @returns New message instance with incremented attempts
   */
  incrementAttempts(): QueueMessageDto<T, NameType> {
    return new QueueMessageDto(this.name, this.data, {
      ...this.opts,
      attempts: (this.opts?.attempts ?? 0) + 1,
    });
  }

  /**
   * Convert to BullMQ job options
   *
   * @returns BullMQ job options
   */
  toBullMQOptions(): JobsOptions {
    return this.opts ?? {};
  }
}
