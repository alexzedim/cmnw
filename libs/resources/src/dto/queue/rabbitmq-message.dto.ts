import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base RabbitMQ Message DTO
 *
 * Provides validation, transformation, and metadata management for all RabbitMQ messages.
 * Wraps the existing job queue DTOs with RabbitMQ-specific metadata.
 */
export interface IRabbitMQMessageBase<T> {
  /** Unique message ID (auto-generated if not provided) */
  messageId?: string;
  /** Message payload (validated DTO) */
  data: T;
  /** Message priority (0-10, default: 5) */
  priority?: number;
  /** Source service/component */
  source?: string;
  /** Routing key for topic exchanges */
  routingKey?: string;
  /** Message persistence */
  persistent?: boolean;
  /** Message expiration in milliseconds */
  expiration?: number;
  /** Optional message metadata that will be forwarded to headers */
  metadata?: Record<string, any>;
}

export class RabbitMQMessageDto<T> {
  private static readonly logger = new Logger(RabbitMQMessageDto.name);

  readonly messageId: string;
  readonly data: T;
  readonly timestamp: number;
  readonly attempts: number;
  readonly source: string;
  readonly priority: number;
  readonly routingKey?: string;
  readonly persistent: boolean;
  readonly expiration?: number;
  readonly metadata: {
    createdBy?: string;
    updatedBy?: string;
    forceUpdate?: number;
    createOnlyUnique?: boolean;
    [key: string]: any;
  };

  /**
   * Constructor - creates a validated RabbitMQ message wrapper
   * @param params - Message parameters
   */
  constructor(params: IRabbitMQMessageBase<T> & { metadata?: Record<string, any> }) {
    this.messageId = params.messageId || uuidv4();
    this.data = params.data;
    this.timestamp = Date.now();
    this.attempts = 0;
    this.source = params.source || 'unknown';
    this.priority = params.priority ?? 5;
    this.routingKey = params.routingKey;
    this.persistent = params.persistent ?? true;
    this.expiration = params.expiration;
    this.metadata = params.metadata || {};

    // Extract metadata from data if it's a DTO with these fields
    if (this.data && typeof this.data === 'object') {
      const dto = this.data as any;
      if (dto.createdBy) this.metadata.createdBy = dto.createdBy;
      if (dto.updatedBy) this.metadata.updatedBy = dto.updatedBy;
      if (dto.forceUpdate !== undefined) this.metadata.forceUpdate = dto.forceUpdate;
      if (dto.createOnlyUnique !== undefined)
        this.metadata.createOnlyUnique = dto.createOnlyUnique;
    }
  }

  /**
   * Create a message with validation
   * @param params - Message parameters
   * @returns Validated RabbitMQMessageDto instance
   */
  static create<T>(params: IRabbitMQMessageBase<T>): RabbitMQMessageDto<T> {
    const message = new RabbitMQMessageDto(params);
    message.validate();
    return message;
  }

  /**
   * Validate message structure
   * @param strict - If true, throws errors; if false, logs warnings
   * @throws Error if validation fails and strict is true
   */
  validate(strict: boolean = true): void {
    const requiredFields = ['messageId', 'data', 'timestamp', 'source'];

    for (const field of requiredFields) {
      if (this[field] === undefined || this[field] === null) {
        const message = `Validation failed: missing required field '${field}' for message '${this.messageId || 'unknown'}'`;
        if (strict) {
          throw new Error(message);
        } else {
          RabbitMQMessageDto.logger.warn({
            logTag: 'RabbitMQMessageDto.validate',
            message,
            messageId: this.messageId,
          });
        }
      }
    }

    // Validate priority range
    if (this.priority < 0 || this.priority > 10) {
      const message = `Validation failed: priority must be between 0-10, got '${this.priority}' for message '${this.messageId}'`;
      if (strict) {
        throw new Error(message);
      } else {
        RabbitMQMessageDto.logger.warn({
          logTag: 'RabbitMQMessageDto.validate',
          message,
          messageId: this.messageId,
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
            RabbitMQMessageDto.logger.warn({
              logTag: 'RabbitMQMessageDto.validate',
              message,
              messageId: this.messageId,
              error: error.message,
            });
          }
        }
      }
    }
  }

  /**
   * Convert to AMQP message options
   * @returns AMQP publish options
   */
  toAMQPOptions(): {
    messageId: string;
    timestamp: number;
    priority: number;
    persistent: boolean;
    expiration?: string;
    headers: Record<string, any>;
  } {
    return {
      messageId: this.messageId,
      timestamp: this.timestamp,
      priority: this.priority,
      persistent: this.persistent,
      expiration: this.expiration ? this.expiration.toString() : undefined,
      headers: {
        source: this.source,
        attempts: this.attempts,
        ...this.metadata,
      },
    };
  }

  /**
   * Increment retry attempt counter
   * @returns New message instance with incremented attempts
   */
  incrementAttempts(): RabbitMQMessageDto<T> {
    return new RabbitMQMessageDto({
      messageId: this.messageId,
      data: this.data,
      priority: this.priority,
      source: this.source,
      routingKey: this.routingKey,
      persistent: this.persistent,
      expiration: this.expiration,
      metadata: {
        ...this.metadata,
        attempts: this.attempts + 1,
      },
    });
  }

  /**
   * Create from AMQP message
   * @param amqpMsg - AMQP ConsumeMessage
   * @returns RabbitMQMessageDto instance
   */
  static fromAMQPMessage<T>(amqpMsg: any): RabbitMQMessageDto<T> {
    const content = JSON.parse(amqpMsg.content.toString());
    const properties = amqpMsg.properties;
    const headers = properties.headers || {};

    return new RabbitMQMessageDto({
      messageId: properties.messageId || content.id,
      data: content.data || content,
      priority: properties.priority,
      source: headers.source || 'unknown',
      persistent: properties.deliveryMode === 2,
      expiration: properties.expiration
        ? parseInt(properties.expiration)
        : undefined,
      metadata: {
        ...headers,
        attempts: headers.attempts || 0,
      },
    });
  }
}
