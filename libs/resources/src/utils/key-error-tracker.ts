import chalk from 'chalk';
import { Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';
import { trackApiKeyError } from '../dao/keys.dao';
import { ApiKeyErrorContext } from '../types/api';

/**
 * KeyErrorTracker - Utility class for tracking API key errors
 *
 * Tracks API key errors with contextual information. This class wraps
 * the keys DAO trackApiKeyError() function and adds enhanced logging with context.
 *
 * Usage pattern (no dependency injection):
 * ```typescript
 * private readonly keyErrorTracker = new KeyErrorTracker(keysRepository);
 *
 * // Track an error with context
 * const result = await this.keyErrorTracker.trackError(
 *   accessToken,
 *   429,
 *   {
 *     serviceName: 'CharacterService',
 *     methodName: 'getSummary',
 *     resourceId: 'Arthas',
 *     additionalInfo: { realmId: 123, attempt: 2 }
 *   }
 * );
 *
 * // Track an error without context
 * const result = await this.keyErrorTracker.trackError(accessToken, 403);
 * ```
 */
export class KeyErrorTracker {
  constructor(private readonly keysRepository: Repository<KeysEntity>) {}

  /**
   * Track an API key error with optional context information
   *
   * Calls the keys DAO trackApiKeyError() to track the error and logs
   * additional context information if provided.
   *
   * @param accessToken - The access token to identify the key
   * @param statusCode - The HTTP status code from the API response
   * @param context - Optional context information about the error
   * @returns The updated KeysEntity or null if key not found or error not tracked
   *
   * @example
   * // Track error with full context
   * const result = await tracker.trackError(token, 429, {
   *   serviceName: 'CharacterService',
   *   methodName: 'getSummary',
   *   resourceId: 'Arthas',
   *   additionalInfo: { realmId: 123 }
   * });
   *
   * @example
   * // Track error without context
   * const result = await tracker.trackError(token, 403);
   */
  async trackError(
    accessToken: string,
    statusCode: number,
    context?: ApiKeyErrorContext,
  ): Promise<KeysEntity | null> {
    try {
      // Track the error using the keys DAO
      const result = await trackApiKeyError(
        this.keysRepository,
        accessToken,
        statusCode,
      );

      // Log context information if provided and error was tracked
      if (context && result) {
        this.logContextInformation(statusCode, context);
      }

      return result;
    } catch (error) {
      console.error(
        `${chalk.red('✗')} Failed to track API key error (${statusCode}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Log context information about the API key error
   *
   * @private
   * @param statusCode - The HTTP status code
   * @param context - The context information to log
   */
  private logContextInformation(
    statusCode: number,
    context: ApiKeyErrorContext,
  ): void {
    const parts: string[] = [`${chalk.cyan('ℹ')} Error context (${statusCode})`];

    if (context.serviceName) {
      parts.push(`${chalk.dim('Service:')} ${chalk.bold(context.serviceName)}`);
    }

    if (context.methodName) {
      parts.push(`${chalk.dim('Method:')} ${chalk.bold(context.methodName)}`);
    }

    if (context.resourceId) {
      parts.push(`${chalk.dim('Resource:')} ${chalk.bold(context.resourceId)}`);
    }

    if (context.additionalInfo && Object.keys(context.additionalInfo).length > 0) {
      const infoStr = Object.entries(context.additionalInfo)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      parts.push(`${chalk.dim('Info:')} ${chalk.bold(infoStr)}`);
    }

    console.log(parts.join(' | '));
  }
}
