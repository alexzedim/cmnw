import { Injectable, ConsoleLogger, Scope } from '@nestjs/common';
import { lokiConfig } from '@app/configuration';
import axios from 'axios';
import {
  StandardizedErrorInfo,
  LogInput,
  LogLevel,
  LokiRequestPayload,
} from './logger.type';
import { isAxiosError, isStandardError, isPlainObject } from './logger.guard';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  private lokiUrl = `http://${lokiConfig.lokiUrl}/loki/api/v1/push`;
  private logsToLoki = lokiConfig.logToLoki;
  private logsToConsole = lokiConfig.logToConsole;
  private gzip = false;

  private readonly onLokiError: (error: any) => void = () => {};
  private readonly defaultLabels: Record<string, string> = {
    app: process.env.APP_NAME || 'not-set',
    env: process.env.NODE_ENV || 'dev',
  };

  constructor(appLabel?: string) {
    super();
    if (appLabel) {
      this.defaultLabels = {
        app: appLabel,
        env: process.env.NODE_ENV || 'dev',
      };
      this.setContext(appLabel);
    }
  }

  private sendLokiRequest = (
    labels: Record<string, string>,
    message: string,
    retryCount: number = 0,
  ): void => {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s

    const payload: LokiRequestPayload = {
      streams: [
        {
          stream: labels,
          values: [[(Date.now() * 1_000_000).toString(), message]],
        },
      ],
    };

    const data = JSON.stringify(payload);

    const requestConfig = {
      method: 'POST' as const,
      url: this.lokiUrl,
      headers: this.gzip
        ? {
            'Content-Type': 'application/json',
            'Content-Encoding': 'application/gzip',
          }
        : {
            'Content-Type': 'application/json',
            // Authorization: `Bearer ${this.lokiToken}`,
          },
      data: data,
      timeout: 10000, // 10 second timeout
    };

    axios
      .request(requestConfig)
      .then(() => {
        // Successfully sent to Loki
      })
      .catch((error) => {
        const shouldRetry =
          retryCount < maxRetries &&
          (error.code === 'ECONNABORTED' || // Timeout
            error.code === 'ECONNREFUSED' || // Connection refused
            error.code === 'ENETUNREACH' || // Network unreachable
            error.response?.status >= 500); // Server errors

        if (shouldRetry) {
          setTimeout(() => {
            this.sendLokiRequest(labels, message, retryCount + 1);
          }, retryDelay);
        } else {
          // Handle the final error
          const errorInfo = {
            message: 'Failed to send log to Loki',
            error: error.message,
            url: this.lokiUrl,
            status: error.response?.status,
            data: error.response?.data,
            retryCount,
            originalLabels: labels,
            timestamp: new Date().toISOString(),
          };

          if (this.onLokiError) {
            this.onLokiError(errorInfo);
          } else {
            // Fallback to console error if no custom error handler
            console.error('[Logger] Loki Error:', errorInfo);
          }
        }
      });
  };

  /**
   * Universal method to parse any type of input into standardized error information
   * @param input - Any input: string, Error, AxiosError, object, or unknown
   * @param logTag - Context tag for logging
   * @param level - Log level (error, warn, info, etc.)
   * @param additionalInfo - Additional context information
   * @returns Standardized error information object
   */
  private parseLogInput(
    input: LogInput,
    logTag?: string,
    level: string = 'info',
    additionalInfo?: Record<string, any>,
  ): StandardizedErrorInfo {
    const timestamp = new Date().toISOString();
    const baseInfo: StandardizedErrorInfo = {
      logTag,
      level,
      timestamp,
      message: '',
      ...additionalInfo,
    };

    // Handle Axios errors
    if (isAxiosError(input)) {
      return {
        ...baseInfo,
        message: input.message,
        errorType: 'axios',
        status: input.response?.status,
        statusText: input.response?.statusText,
        url: input.config?.url,
        method: input.config?.method?.toUpperCase(),
        responseData: input.response?.data,
        requestData: input.config?.data,
        code: input.code,
        headers: input.response?.headers,
        timeout: input.config?.timeout,
        name: input.name,
        stack: input.stack,
        cause: input.cause,
        originalError: input,
      };
    }

    // Handle standard Node.js errors
    if (isStandardError(input)) {
      return {
        ...baseInfo,
        message: input.message,
        errorType: 'standard',
        name: input.name,
        stack: input.stack,
        cause: (input as any).cause, // Some errors have cause property
        originalError: input,
      };
    }

    // Handle plain objects with special handling for logTag and errorOrException/error properties
    if (isPlainObject(input)) {
      // Check if object has logTag and errorOrException (for error cases)
      if (input.logTag && input.errorOrException) {
        // Extract the actual error and recursively parse it
        const actualError = input.errorOrException;
        const parsedError = this.parseLogInput(
          actualError,
          input.logTag,
          level,
          additionalInfo,
        );

        return {
          ...parsedError,
          logTag: input.logTag, // Ensure logTag is preserved
          originalInput: input, // Keep reference to original input object
        };
      }

      // Check if object has logTag and error (alternative property name)
      if (input.logTag && input.error) {
        const actualError = input.error;
        const parsedError = this.parseLogInput(
          actualError,
          input.logTag,
          level,
          additionalInfo,
        );

        return {
          ...parsedError,
          logTag: input.logTag,
          originalInput: input,
        };
      }

      // Check if object has logTag and some other content
      if (input.logTag) {
        const { logTag, ...restOfObject } = input;
        return {
          ...baseInfo,
          logTag: logTag,
          message: input.message || `Object with logTag: ${logTag}`,
          errorType: 'object',
          originalError: input,
          ...restOfObject, // Include all other properties
        };
      }

      // Standard object handling (no special logTag handling)
      return {
        ...baseInfo,
        message: input.message || input.error || 'Object logged',
        errorType: 'object',
        originalError: input,
        ...input, // Merge all object properties
      };
    }

    // Handle strings
    if (typeof input === 'string') {
      return {
        ...baseInfo,
        message: input,
        errorType: 'string',
      };
    }

    // Handle primitives and unknown types
    return {
      ...baseInfo,
      message: String(input),
      errorType: 'unknown',
      originalError: input,
    };
  }

  /**
   * Format standardized error info for console output
   * @param errorInfo - Standardized error information
   * @returns Formatted string for console
   */
  private formatForConsole(errorInfo: StandardizedErrorInfo): string {
    // For object types, return the full JSON representation
    if (errorInfo.errorType === 'object' || errorInfo.errorType === 'unknown') {
      try {
        // Create a clean copy without internal fields
        const {
          errorType,
          originalError,
          originalInput,
          timestamp,
          level,
          ...cleanInfo
        } = errorInfo;
        return JSON.stringify(cleanInfo, null, 2);
      } catch (error) {
        // Fallback if JSON.stringify fails
        return `[${errorInfo.logTag}] ${errorInfo.message}`;
      }
    }

    // For other types (string, axios, standard errors), use formatted output
    const parts = [];

    if (errorInfo.logTag) {
      parts.push(`[${errorInfo.logTag}]`);
    }

    parts.push(errorInfo.message);

    // Add additional context for different error types
    if (errorInfo.errorType === 'axios' && errorInfo.status) {
      parts.push(`HTTP ${errorInfo.status}`);
      if (errorInfo.method && errorInfo.url) {
        parts.push(`${errorInfo.method} ${errorInfo.url}`);
      }
    }

    return parts.join(' | ');
  }

  /**
   * Format message for Loki - ensures proper JSON serialization
   * @param input - Original input
   * @param parsedInfo - Parsed standardized information
   * @param level - Log level to determine which fields to include
   * @returns Properly formatted message for Loki
   */
  private formatForLoki(
    input: LogInput,
    parsedInfo: StandardizedErrorInfo,
    level: LogLevel,
  ): string {
    // For simple strings without additional context, send as-is to Loki
    if (
      typeof input === 'string' &&
      !parsedInfo.logTag &&
      parsedInfo.errorType === 'string'
    ) {
      return input;
    }

    // For everything else, send the structured data
    try {
      // For non-error levels (log, debug, info, verbose, warn), exclude error-specific fields
      const isErrorLevel = level === 'error';

      if (!isErrorLevel) {
        // Create a clean copy without error-specific fields for non-error logs
        const {
          originalError,
          errorType,
          stack,
          cause,
          originalInput,
          ...cleanInfo
        } = parsedInfo;

        // Only include stack trace if it's explicitly part of the message context
        // and not just from error parsing
        return JSON.stringify(cleanInfo, null, 0);
      }

      // For error level, include all fields
      return JSON.stringify(parsedInfo, null, 0); // Compact JSON for Loki
    } catch (error) {
      // Fallback if JSON.stringify fails (circular references, etc.)
      return JSON.stringify({
        logTag: parsedInfo.logTag,
        message: parsedInfo.message,
        level: parsedInfo.level,
        timestamp: parsedInfo.timestamp,
        serializationError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Universal logging method that handles all log levels consistently
   * @param level - Log level (error, warn, info, debug, verbose)
   * @param input - String, Error, AxiosError, object, or any unknown type
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   * @param trace - Stack trace (for error level only)
   */
  private universalLog(
    level: LogLevel,
    input: LogInput,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
    trace?: string,
  ): void {
    const parsedInfo = this.parseLogInput(
      input,
      logTag,
      level === 'log' ? 'info' : level,
      additionalInfo,
    );
    const consoleMessage = this.formatForConsole(parsedInfo);
    const lokiMessage = this.formatForLoki(input, parsedInfo, level);

    // Send to Loki if enabled
    if (this.logsToLoki) {
      this.sendLokiRequest(
        {
          ...this.defaultLabels,
          ...labels,
          context: context ?? this.context,
          level: level === 'log' ? 'info' : level,
        },
        lokiMessage,
      );
    }

    // Send to console if enabled
    if (this.logsToConsole) {
      const finalContext = context ?? this.context;
      switch (level) {
        case 'error':
          super.error(consoleMessage, trace || parsedInfo.stack, finalContext);
          break;
        case 'warn':
          super.warn(consoleMessage, finalContext);
          break;
        case 'info':
        case 'log':
          super.log(consoleMessage, finalContext);
          break;
        case 'debug':
          super.debug(consoleMessage, finalContext);
          break;
        case 'verbose':
          super.verbose(consoleMessage, finalContext);
          break;
      }
    }
  }

  /**
   * Enhanced error method that can handle any type of input
   * @param input - String, Error, AxiosError, object, or any unknown type
   * @param trace - Stack trace (optional)
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   */
  error(
    input: LogInput,
    trace?: string,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
  ): void {
    this.universalLog(
      'error',
      input,
      context,
      labels,
      logTag,
      additionalInfo,
      trace,
    );
  }

  /**
   * Specialized method for handling Axios errors with detailed information extraction
   * @param error - The error to handle (AxiosError or any other error)
   * @param logTag - Context tag for logging
   * @param additionalInfo - Additional context information
   * @param context - Logger context (defaults to current context)
   * @param labels - Additional Loki labels
   */
  errorAxios(
    error: unknown,
    logTag?: string,
    additionalInfo?: Record<string, any>,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    this.error(error, undefined, context, labels, logTag, additionalInfo);
  }

  /**
   * Info method for informational messages that can handle any type of input
   * @param input - String, object, or any type to log
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   */
  info(
    input: LogInput,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
  ): void {
    this.universalLog('info', input, context, labels, logTag, additionalInfo);
  }

  /**
   * Enhanced log method that can handle any type of input
   * @param input - String, object, or any type to log
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   */
  log(
    input: LogInput,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
  ): void {
    this.universalLog('log', input, context, labels, logTag, additionalInfo);
  }

  /**
   * Enhanced warn method that can handle any type of input
   * @param input - String, object, or any type to log
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   */
  warn(
    input: LogInput,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
  ): void {
    this.universalLog('warn', input, context, labels, logTag, additionalInfo);
  }

  /**
   * Enhanced debug method that can handle any type of input
   * @param input - String, object, or any type to log
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   */
  debug(
    input: LogInput,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
  ): void {
    this.universalLog('debug', input, context, labels, logTag, additionalInfo);
  }

  /**
   * Enhanced verbose method that can handle any type of input
   * @param input - String, object, or any type to log
   * @param context - Logger context (optional)
   * @param labels - Additional Loki labels (optional)
   * @param logTag - Context tag for structured logging (optional)
   * @param additionalInfo - Additional context information (optional)
   */
  verbose(
    input: LogInput,
    context?: string,
    labels?: Record<string, string>,
    logTag?: string,
    additionalInfo?: Record<string, any>,
  ): void {
    this.universalLog('verbose', input, context, labels, logTag, additionalInfo);
  }
}
