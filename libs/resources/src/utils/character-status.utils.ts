/**
 * Character Status Utility Functions
 *
 * Provides utilities for working with character status strings.
 * Status strings are 6-character strings where each character represents
 * the status of a specific endpoint (e.g., "SU-MPVR").
 */

import {
  CharacterStatusState,
  CHARACTER_STATUS_CODES,
  STATUS_ENDPOINT_ORDER,
} from '@app/resources/constants';

/**
 * Set endpoint status in status string
 * @param currentStatusString - Current status string
 * @param endpoint - Endpoint name
 * @param state - Status state (SUCCESS, ERROR, PENDING)
 * @returns Updated status string
 *
 * @example
 * setStatusString('------', 'STATUS', CharacterStatusState.SUCCESS) // "S-----"
 * setStatusString('S-----', 'SUMMARY', CharacterStatusState.SUCCESS) // "SU----"
 * setStatusString('SU----', 'MEDIA', CharacterStatusState.ERROR) // "SU-M---"
 */
export function setStatusString(
  currentStatusString: string,
  endpoint: keyof typeof CHARACTER_STATUS_CODES,
  state: CharacterStatusState,
): string {
  const index = STATUS_ENDPOINT_ORDER.indexOf(endpoint);
  if (index === -1) {
    return currentStatusString;
  }

  const codes = CHARACTER_STATUS_CODES[endpoint];
  const char = state === CharacterStatusState.SUCCESS ? codes.success : state === CharacterStatusState.ERROR ? codes.error : codes.pending;

  return currentStatusString.substring(0, index) + char + currentStatusString.substring(index + 1);
}

/**
 * Get status character for endpoint
 * @param statusString - Status string
 * @param endpoint - Endpoint name
 * @returns Status character (S, U, M, P, V, R, or -)
 *
 * @example
 * getStatusChar('SU-MPV', 'STATUS') // "S"
 * getStatusChar('SU-MPV', 'SUMMARY') // "U"
 * getStatusChar('SU-MPV', 'MEDIA') // "-"
 */
export function getStatusChar(statusString: string, endpoint: keyof typeof CHARACTER_STATUS_CODES): string {
  const index = STATUS_ENDPOINT_ORDER.indexOf(endpoint);
  if (index === -1 || index >= statusString.length) {
    return '-';
  }
  return statusString[index];
}

/**
 * Check if endpoint succeeded in status string
 * @param statusString - Status string
 * @param endpoint - Endpoint name
 * @returns True if endpoint succeeded
 *
 * @example
 * isEndpointSuccessInString('SU-MPV', 'STATUS') // true
 * isEndpointSuccessInString('SU-MPV', 'MEDIA') // false
 */
export function isEndpointSuccessInString(
  statusString: string,
  endpoint: keyof typeof CHARACTER_STATUS_CODES,
): boolean {
  const char = getStatusChar(statusString, endpoint);
  return char === CHARACTER_STATUS_CODES[endpoint].success;
}

/**
 * Check if endpoint failed in status string
 * @param statusString - Status string
 * @param endpoint - Endpoint name
 * @returns True if endpoint failed
 *
 * @example
 * isEndpointErrorInString('su-mpv', 'STATUS') // true
 * isEndpointErrorInString('SU-MPV', 'STATUS') // false
 */
export function isEndpointErrorInString(
  statusString: string,
  endpoint: keyof typeof CHARACTER_STATUS_CODES,
): boolean {
  const char = getStatusChar(statusString, endpoint);
  return char === CHARACTER_STATUS_CODES[endpoint].error;
}

/**
 * Check if endpoint is pending in status string
 * @param statusString - Status string
 * @param endpoint - Endpoint name
 * @returns True if endpoint is pending
 *
 * @example
 * isEndpointPendingInString('SU-MPV', 'PROFESSIONS') // true
 * isEndpointPendingInString('SU-MPV', 'STATUS') // false
 */
export function isEndpointPendingInString(
  statusString: string,
  endpoint: keyof typeof CHARACTER_STATUS_CODES,
): boolean {
  const char = getStatusChar(statusString, endpoint);
  return char === CHARACTER_STATUS_CODES[endpoint].pending;
}

/**
 * Get all successful endpoints
 * @param statusString - Status string
 * @returns Array of endpoint names that succeeded
 *
 * @example
 * getSuccessfulEndpointsInString('SU-MPV') // ['STATUS', 'SUMMARY', 'MEDIA', 'PETS', 'MOUNTS']
 */
export function getSuccessfulEndpointsInString(
  statusString: string,
): Array<keyof typeof CHARACTER_STATUS_CODES> {
  return STATUS_ENDPOINT_ORDER.filter(
    (endpoint) => isEndpointSuccessInString(statusString, endpoint as keyof typeof CHARACTER_STATUS_CODES),
  ) as Array<keyof typeof CHARACTER_STATUS_CODES>;
}

/**
 * Get all failed endpoints
 * @param statusString - Status string
 * @returns Array of endpoint names that failed
 *
 * @example
 * getFailedEndpointsInString('su-mpv') // ['STATUS', 'SUMMARY', 'MEDIA', 'PETS', 'MOUNTS']
 */
export function getFailedEndpointsInString(
  statusString: string,
): Array<keyof typeof CHARACTER_STATUS_CODES> {
  return STATUS_ENDPOINT_ORDER.filter(
    (endpoint) => isEndpointErrorInString(statusString, endpoint as keyof typeof CHARACTER_STATUS_CODES),
  ) as Array<keyof typeof CHARACTER_STATUS_CODES>;
}

/**
 * Get all pending endpoints
 * @param statusString - Status string
 * @returns Array of endpoint names that are pending
 *
 * @example
 * getPendingEndpointsInString('SU-MPV') // ['PROFESSIONS']
 */
export function getPendingEndpointsInString(
  statusString: string,
): Array<keyof typeof CHARACTER_STATUS_CODES> {
  return STATUS_ENDPOINT_ORDER.filter(
    (endpoint) => isEndpointPendingInString(statusString, endpoint as keyof typeof CHARACTER_STATUS_CODES),
  ) as Array<keyof typeof CHARACTER_STATUS_CODES>;
}

/**
 * Check if all endpoints succeeded
 * @param statusString - Status string
 * @returns True if all endpoints succeeded
 *
 * @example
 * isAllSuccessInString('SU-MPV') // true
 * isAllSuccessInString('SU-MPv') // false
 */
export function isAllSuccessInString(statusString: string): boolean {
  return getFailedEndpointsInString(statusString).length === 0 && getPendingEndpointsInString(statusString).length === 0;
}

/**
 * Check if any endpoint failed
 * @param statusString - Status string
 * @returns True if any endpoint failed
 *
 * @example
 * hasAnyErrorInString('su-mpv') // true
 * hasAnyErrorInString('SU-MPV') // false
 */
export function hasAnyErrorInString(statusString: string): boolean {
  return getFailedEndpointsInString(statusString).length > 0;
}

/**
 * Get completion percentage
 * @param statusString - Status string
 * @returns Percentage of completed endpoints (0-100)
 *
 * @example
 * getCompletionPercentageInString('SU-MPV') // 83
 * getCompletionPercentageInString('------') // 0
 */
export function getCompletionPercentageInString(statusString: string): number {
  const total = STATUS_ENDPOINT_ORDER.length;
  const completed = total - getPendingEndpointsInString(statusString).length;
  return Math.round((completed / total) * 100);
}

/**
 * Get success percentage
 * @param statusString - Status string
 * @returns Percentage of successful endpoints (0-100)
 *
 * @example
 * getSuccessPercentageInString('SU-MPV') // 100
 * getSuccessPercentageInString('SU-MPv') // 83
 */
export function getSuccessPercentageInString(statusString: string): number {
  const total = STATUS_ENDPOINT_ORDER.length;
  const successful = getSuccessfulEndpointsInString(statusString).length;
  return Math.round((successful / total) * 100);
}

/**
 * Get error percentage
 * @param statusString - Status string
 * @returns Percentage of failed endpoints (0-100)
 *
 * @example
 * getErrorPercentageInString('su-mpv') // 16
 * getErrorPercentageInString('SU-MPV') // 0
 */
export function getErrorPercentageInString(statusString: string): number {
  const total = STATUS_ENDPOINT_ORDER.length;
  const failed = getFailedEndpointsInString(statusString).length;
  return Math.round((failed / total) * 100);
}

/**
 * Get human-readable status description
 * @param statusString - Status string
 * @returns Human-readable description
 *
 * @example
 * getStatusDescriptionInString('SU-MPV') // "All endpoints succeeded"
 * getStatusDescriptionInString('su-mpv') // "5 failed, 1 pending"
 */
export function getStatusDescriptionInString(statusString: string): string {
  const successful = getSuccessfulEndpointsInString(statusString);
  const failed = getFailedEndpointsInString(statusString);
  const pending = getPendingEndpointsInString(statusString);

  if (successful.length === STATUS_ENDPOINT_ORDER.length) {
    return 'All endpoints succeeded';
  }

  if (failed.length === STATUS_ENDPOINT_ORDER.length) {
    return 'All endpoints failed';
  }

  if (pending.length === STATUS_ENDPOINT_ORDER.length) {
    return 'All endpoints pending';
  }

  const parts: string[] = [];
  if (successful.length > 0) {
    parts.push(`${successful.length} succeeded`);
  }
  if (failed.length > 0) {
    parts.push(`${failed.length} failed`);
  }
  if (pending.length > 0) {
    parts.push(`${pending.length} pending`);
  }

  return parts.join(', ');
}

/**
 * Validate status string format
 * @param statusString - Status string to validate
 * @returns True if status string is valid
 *
 * @example
 * isValidStatusString('SU-MPV') // true
 * isValidStatusString('SU-MPVX') // false (too long)
 * isValidStatusString('SU-MPV') // true
 * isValidStatusString('SU-MPV') // true
 */
export function isValidStatusString(statusString: string): boolean {
  if (statusString.length !== STATUS_ENDPOINT_ORDER.length) {
    return false;
  }

  const validChars = new Set(['S', 's', 'U', 'u', 'M', 'm', 'P', 'p', 'V', 'v', 'R', 'r', '-']);

  for (const char of statusString) {
    if (!validChars.has(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Convert status string to lowercase for comparison
 * @param statusString - Status string
 * @returns Lowercase status string
 *
 * @example
 * toLowercaseStatusString('SU-MPV') // "su-mpv"
 */
export function toLowercaseStatusString(statusString: string): string {
  return statusString.toLowerCase();
}
