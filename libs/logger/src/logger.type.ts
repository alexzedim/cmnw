import { AxiosError } from 'axios';

/**
 * Interface for standardized error information
 * Contains all possible fields that can be extracted from different error types
 */
export interface StandardizedErrorInfo {
  logTag?: string;
  message: string;
  level?: string;
  timestamp?: string;
  // Axios-specific fields
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  responseData?: any;
  requestData?: any;
  code?: string;
  headers?: Record<string, any>;
  timeout?: number;
  // Node.js Error fields
  name?: string;
  stack?: string;
  cause?: any;
  // Additional fields
  errorType?: 'axios' | 'standard' | 'object' | 'string' | 'unknown';
  originalError?: any;
  originalInput?: any; // Reference to the original input object when it contains logTag/errorOrException
  [key: string]: any; // Allow additional custom fields
}

/**
 * Type for any possible input to logger methods
 * Supports strings, errors, objects, and unknown types
 */
export type LogInput =
  | string
  | Error
  | AxiosError
  | Record<string, any>
  | unknown;

/**
 * Type for log levels supported by the logger
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'log' | 'debug' | 'verbose';

/**
 * Type for error types that can be detected by the logger
 */
export type ErrorType = 'axios' | 'standard' | 'object' | 'string' | 'unknown';

/**
 * Interface for Loki stream format
 */
export interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

/**
 * Interface for Loki request payload
 */
export interface LokiRequestPayload {
  streams: LokiStream[];
}

/**
 * Interface for Loki error information
 */
export interface LokiErrorInfo {
  message: string;
  error: string;
  url: string;
  status?: number;
  data?: any;
  retryCount: number;
  originalLabels: Record<string, string>;
  timestamp: string;
}

/**
 * Type for object with logTag and error properties (preferred logging format)
 */
export interface LogObjectWithError {
  logTag: string;
  errorOrException?: any;
  error?: any;
  [key: string]: any;
}

/**
 * Type for object with logTag and general data (preferred logging format)
 */
export interface LogObjectWithData {
  logTag: string;
  message?: string;
  [key: string]: any;
}

/**
 * Union type for preferred object-based logging formats
 */
export type LogObject = LogObjectWithError | LogObjectWithData;
