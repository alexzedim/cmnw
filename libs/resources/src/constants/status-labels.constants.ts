import { STATUS_CODES } from './api.constants';

/**
 * Human-readable labels for status codes
 * Used in Grafana dashboards and monitoring
 */
export const STATUS_CODE_LABELS: Record<number, string> = {
  [STATUS_CODES.DEFAULT_STATUS]: 'PENDING',
  [STATUS_CODES.SUCCESS_STATUS]: 'SUCCESS',
  [STATUS_CODES.SUCCESS_SUMMARY]: 'SUCCESS_SUMMARY',
  [STATUS_CODES.SUCCESS_MEDIA]: 'SUCCESS_MEDIA',
  [STATUS_CODES.SUCCESS_PETS]: 'SUCCESS_PETS',
  [STATUS_CODES.SUCCESS_MOUNTS]: 'SUCCESS_MOUNTS',
  [STATUS_CODES.SUCCESS_PROFESSIONS]: 'SUCCESS_PROFESSIONS',
  305: 'NOT_EU_REGION',
  [STATUS_CODES.KEY_LOCKED]: 'RATE_LIMITED',
  [STATUS_CODES.ERROR_GUILD]: 'ERROR_GUILD',
  [STATUS_CODES.ERROR_ROSTER]: 'ERROR_ROSTER',
  [STATUS_CODES.ERROR_PROFESSIONS]: 'ERROR_PROFESSIONS',
  [STATUS_CODES.ERROR_MOUNTS]: 'ERROR_MOUNTS',
  [STATUS_CODES.ERROR_PETS]: 'ERROR_PETS',
  [STATUS_CODES.ERROR_SUMMARY]: 'ERROR_SUMMARY',
  [STATUS_CODES.ERROR_MEDIA]: 'ERROR_MEDIA',
  [STATUS_CODES.ERROR_STATUS]: 'ERROR_STATUS',
  404: 'NOT_FOUND',
  500: 'INTERNAL_ERROR',
};

/**
 * Get human-readable label for status code
 * @param statusCode - Numeric status code
 * @returns Human-readable label or 'UNKNOWN_{code}'
 */
export function getStatusLabel(statusCode: number): string {
  return STATUS_CODE_LABELS[statusCode] || `UNKNOWN_${statusCode}`;
}

/**
 * Check if status code represents success
 * @param statusCode - Numeric status code
 */
export function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Check if status code represents an error
 * @param statusCode - Numeric status code
 */
export function isErrorStatus(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 600;
}
