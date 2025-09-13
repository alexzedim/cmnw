import { AxiosError } from 'axios';

/**
 * Type guard to check if error is AxiosError
 * @param error - The error to check
 * @returns true if the error is an AxiosError
 */
export const isAxiosError = (error: unknown): error is AxiosError => {
  return error instanceof AxiosError;
};

/**
 * Type guard to check if error is standard Error
 * @param error - The error to check
 * @returns true if the error is a standard Error instance
 */
export const isStandardError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Type guard to check if input is a plain object (but not null, array, or primitive)
 * @param input - The input to check
 * @returns true if the input is a plain object
 */
export const isPlainObject = (input: unknown): input is Record<string, any> => {
  return input !== null && typeof input === 'object' && !Array.isArray(input) && !(input instanceof Error);
};