import { Logger } from '@nestjs/common';
import { IBullMQJobOptions } from '@app/resources/types/queue/queue.type';

/**
 * Base interface for BullMQ job data
 * Contains all job-specific data that travels in the job.data field
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
 * Wraps job queue DTOs with BullMQ-specific properties.
 */
export class QueueMessageDto<T> {
  private static readonly logger = new Logger(QueueMessageDto.name);

  readonly data: T;
  readonly priority: number;
  readonly source: string;
  readonly attempts: number;
  readonly metadata?: Record<string, unknown>;

  /**
   * Constructor - creates a validated Queue Message with BullMQ properties
   * @param params - Message parameters
   */
  constructor(params: IQueueMessageBase<T>) {
    this.data = params.data;
    this.priority = params.priority ?? 5;
    this.source = params.source ?? 'unknown';
    this.attempts = params.attempts ?? 0;
    this.metadata = params.metadata;
  }

  /**
   * Create a message with validation
   * @param params - Message parameters
   * @returns Validated QueueMessageDto instance
   */
  static create<T>(params: IQueueMessageBase<T>): QueueMessageDto<T> {
    const message = new QueueMessageDto(params);
    message.validate();
    return message;
  }

  /**
   * Validate message structure
   * @param strict - If true, throws errors; if false, logs warnings
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true): void {
    const requiredFields = ['data', 'source'];

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

    // Validate priority range
    if (this.priority < 0 || this.priority > 10) {
      const message = `Validation failed: priority must be between 0-10, got '${this.priority}'`;
      if (strict) {
        throw new Error(message);
      } else {
        QueueMessageDto.logger.warn({
          logTag: 'QueueMessageDto.validate',
          message,
          priority: this.priority,
        });
      }
    }

    // Validate data payload
    if (this.data && typeof this.data === 'object') {
      const dto = this.data as any;
      // If the data has a validate method (like our DTOs), call it
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
   * Convert to BullMQ job options
   * @returns BullMQ job options
   */
  toBullMQOptions(): IBullMQJobOptions {
    return {
      priority: this.priority,
      attempts: this.attempts,
      metadata: this.metadata,
    };
  }

  /**
   * Increment retry attempt counter
   * @returns New message instance with incremented attempts
   */
  incrementAttempts(): QueueMessageDto<T> {
    return new QueueMessageDto({
      data: this.data,
      priority: this.priority,
      source: this.source,
      attempts: this.attempts + 1,
      metadata: this.metadata,
    });
  }
}
