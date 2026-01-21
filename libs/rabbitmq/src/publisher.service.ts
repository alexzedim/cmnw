import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQMessageDto } from '@app/resources';

/**
 * RabbitMQ Publisher Service
 *
 * Handles publishing messages to RabbitMQ exchanges with validation and error handling.
 */
@Injectable()
export class RabbitMQPublisherService {
  private readonly logger = new Logger(RabbitMQPublisherService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Publish a validated message to RabbitMQ
   * @param exchange - Exchange name
   * @param message - Validated RabbitMQMessageDto
   * @throws Error if message validation fails or publishing fails
   */
  async publishMessage<T>(
    exchange: string,
    message: RabbitMQMessageDto<T>,
  ): Promise<void> {
    try {
      // Validate message before publishing
      message.validate(false); // Non-strict validation with warnings

      const routingKey = message.routingKey || 'default';
      const options = message.toAMQPOptions();

      await this.amqpConnection.publish(exchange, routingKey, message, options);

      this.logger.debug({
        logTag: 'RabbitMQPublisherService.publishMessage',
        message: 'Message published successfully',
        messageId: message.messageId,
        exchange,
        routingKey,
        priority: message.priority,
      });
    } catch (error) {
      this.logger.error({
        logTag: 'RabbitMQPublisherService.publishMessage',
        message: 'Failed to publish message',
        messageId: message.messageId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Publish multiple messages in bulk
   * @param exchange - Exchange name
   * @param messages - Array of validated RabbitMQMessageDto
   * @returns Promise that resolves when all messages are published
   */
  async publishBulk<T>(
    exchange: string,
    messages: RabbitMQMessageDto<T>[],
  ): Promise<void> {
    const results = await Promise.allSettled(
      messages.map((message) => this.publishMessage(exchange, message)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn({
        logTag: 'RabbitMQPublisherService.publishBulk',
        message: `${failed.length} of ${messages.length} messages failed to publish`,
        totalMessages: messages.length,
        failedCount: failed.length,
      });

      // If any messages failed, throw an error with details
      if (failed.length === messages.length) {
        throw new Error(
          `All ${messages.length} messages failed to publish to ${exchange}`,
        );
      }
    }

    this.logger.log({
      logTag: 'RabbitMQPublisherService.publishBulk',
      message: `Successfully published ${messages.length - failed.length} of ${messages.length} messages`,
      exchange,
      totalMessages: messages.length,
      successCount: messages.length - failed.length,
      failedCount: failed.length,
    });
  }

  /**
   * Publish a message with retry logic
   * @param exchange - Exchange name
   * @param message - Validated RabbitMQMessageDto
   * @param maxRetries - Maximum number of retry attempts
   * @param delayMs - Delay between retries in milliseconds
   */
  async publishWithRetry<T>(
    exchange: string,
    message: RabbitMQMessageDto<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.publishMessage(exchange, message);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          this.logger.warn({
            logTag: 'RabbitMQPublisherService.publishWithRetry',
            message: `Publish attempt ${attempt + 1} failed, retrying in ${delayMs}ms`,
            messageId: message.messageId,
            attempt: attempt + 1,
            maxRetries,
            error: error.message,
          });
          await this.delay(delayMs);
        }
      }
    }

    this.logger.error({
      logTag: 'RabbitMQPublisherService.publishWithRetry',
      message: `Failed to publish message after ${maxRetries + 1} attempts`,
      messageId: message.messageId,
      maxRetries,
      error: lastError?.message,
    });

    throw lastError;
  }

  /**
   * Helper method to delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
