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

// ============================================================================
// Guild Status Utility Functions
// ============================================================================

import {
  GuildStatusState,
  GUILD_STATUS_CODES,
  GUILD_STATUS_OPERATION_ORDER,
} from '@app/resources/constants';

/**
 * Set operation status in guild status string
 * @param currentStatusString - Current status string
 * @param operation - Operation name
 * @param state - Status state (SUCCESS, ERROR, PENDING)
 * @returns Updated status string
 *
 * @example
 * setGuildStatusString('-----', 'SUMMARY', GuildStatusState.SUCCESS) // "S----"
 * setGuildStatusString('S----', 'ROSTER', GuildStatusState.SUCCESS) // "SR---"
 * setGuildStatusString('SR---', 'MEMBERS', GuildStatusState.ERROR) // "SRm--"
 */
export function setGuildStatusString(
  currentStatusString: string,
  operation: keyof typeof GUILD_STATUS_CODES,
  state: GuildStatusState,
): string {
  const index = GUILD_STATUS_OPERATION_ORDER.indexOf(operation);
  if (index === -1) {
    return currentStatusString;
  }

  const codes = GUILD_STATUS_CODES[operation];
  const char = state === GuildStatusState.SUCCESS ? codes.success : state === GuildStatusState.ERROR ? codes.error : codes.pending;

  return currentStatusString.substring(0, index) + char + currentStatusString.substring(index + 1);
}

/**
 * Get status character for guild operation
 * @param statusString - Status string
 * @param operation - Operation name
 * @returns Status character (S, R, M, L, G, or -)
 *
 * @example
 * getGuildStatusChar('SRMLG', 'SUMMARY') // "S"
 * getGuildStatusChar('SRMLG', 'ROSTER') // "R"
 * getGuildStatusChar('SRMLG', 'MEMBERS') // "M"
 */
export function getGuildStatusChar(statusString: string, operation: keyof typeof GUILD_STATUS_CODES): string {
  const index = GUILD_STATUS_OPERATION_ORDER.indexOf(operation);
  if (index === -1 || index >= statusString.length) {
    return '-';
  }
  return statusString[index];
}

/**
 * Check if guild operation succeeded in status string
 * @param statusString - Status string
 * @param operation - Operation name
 * @returns True if operation succeeded
 *
 * @example
 * isGuildOperationSuccessInString('SRMLG', 'SUMMARY') // true
 * isGuildOperationSuccessInString('SRMLG', 'MEMBERS') // false
 */
export function isGuildOperationSuccessInString(
  statusString: string,
  operation: keyof typeof GUILD_STATUS_CODES,
): boolean {
  const char = getGuildStatusChar(statusString, operation);
  return char === GUILD_STATUS_CODES[operation].success;
}

/**
 * Check if guild operation failed in status string
 * @param statusString - Status string
 * @param operation - Operation name
 * @returns True if operation failed
 *
 * @example
 * isGuildOperationErrorInString('srmlg', 'SUMMARY') // true
 * isGuildOperationErrorInString('SRMLG', 'SUMMARY') // false
 */
export function isGuildOperationErrorInString(
  statusString: string,
  operation: keyof typeof GUILD_STATUS_CODES,
): boolean {
  const char = getGuildStatusChar(statusString, operation);
  return char === GUILD_STATUS_CODES[operation].error;
}

/**
 * Check if guild operation is pending in status string
 * @param statusString - Status string
 * @param operation - Operation name
 * @returns True if operation is pending
 *
 * @example
 * isGuildOperationPendingInString('SR-LG', 'MEMBERS') // true
 * isGuildOperationPendingInString('SRMLG', 'SUMMARY') // false
 */
export function isGuildOperationPendingInString(
  statusString: string,
  operation: keyof typeof GUILD_STATUS_CODES,
): boolean {
  const char = getGuildStatusChar(statusString, operation);
  return char === GUILD_STATUS_CODES[operation].pending;
}

/**
 * Get all successful guild operations
 * @param statusString - Status string
 * @returns Array of operation names that succeeded
 *
 * @example
 * getSuccessfulGuildOperationsInString('SRMLG') // ['SUMMARY', 'ROSTER', 'MEMBERS', 'LOGS', 'MASTER']
 */
export function getSuccessfulGuildOperationsInString(
  statusString: string,
): Array<keyof typeof GUILD_STATUS_CODES> {
  return GUILD_STATUS_OPERATION_ORDER.filter(
    (operation) => isGuildOperationSuccessInString(statusString, operation as keyof typeof GUILD_STATUS_CODES),
  ) as Array<keyof typeof GUILD_STATUS_CODES>;
}

/**
 * Get all failed guild operations
 * @param statusString - Status string
 * @returns Array of operation names that failed
 *
 * @example
 * getFailedGuildOperationsInString('srmlg') // ['SUMMARY', 'ROSTER', 'MEMBERS', 'LOGS', 'MASTER']
 */
export function getFailedGuildOperationsInString(
  statusString: string,
): Array<keyof typeof GUILD_STATUS_CODES> {
  return GUILD_STATUS_OPERATION_ORDER.filter(
    (operation) => isGuildOperationErrorInString(statusString, operation as keyof typeof GUILD_STATUS_CODES),
  ) as Array<keyof typeof GUILD_STATUS_CODES>;
}

/**
 * Get all pending guild operations
 * @param statusString - Status string
 * @returns Array of operation names that are pending
 *
 * @example
 * getPendingGuildOperationsInString('SR-LG') // ['MEMBERS']
 */
export function getPendingGuildOperationsInString(
  statusString: string,
): Array<keyof typeof GUILD_STATUS_CODES> {
  return GUILD_STATUS_OPERATION_ORDER.filter(
    (operation) => isGuildOperationPendingInString(statusString, operation as keyof typeof GUILD_STATUS_CODES),
  ) as Array<keyof typeof GUILD_STATUS_CODES>;
}

/**
 * Check if all guild operations succeeded
 * @param statusString - Status string
 * @returns True if all operations succeeded
 *
 * @example
 * isAllGuildSuccessInString('SRMLG') // true
 * isAllGuildSuccessInString('SRMLg') // false
 */
export function isAllGuildSuccessInString(statusString: string): boolean {
  return getFailedGuildOperationsInString(statusString).length === 0 && getPendingGuildOperationsInString(statusString).length === 0;
}

/**
 * Check if any guild operation failed
 * @param statusString - Status string
 * @returns True if any operation failed
 *
 * @example
 * hasAnyGuildErrorInString('srmlg') // true
 * hasAnyGuildErrorInString('SRMLG') // false
 */
export function hasAnyGuildErrorInString(statusString: string): boolean {
  return getFailedGuildOperationsInString(statusString).length > 0;
}

/**
 * Get guild operation completion percentage
 * @param statusString - Status string
 * @returns Percentage of completed operations (0-100)
 *
 * @example
 * getGuildCompletionPercentageInString('SRMLG') // 100
 * getGuildCompletionPercentageInString('-----') // 0
 */
export function getGuildCompletionPercentageInString(statusString: string): number {
  const total = GUILD_STATUS_OPERATION_ORDER.length;
  const completed = total - getPendingGuildOperationsInString(statusString).length;
  return Math.round((completed / total) * 100);
}

/**
 * Get guild operation success percentage
 * @param statusString - Status string
 * @returns Percentage of successful operations (0-100)
 *
 * @example
 * getGuildSuccessPercentageInString('SRMLG') // 100
 * getGuildSuccessPercentageInString('SRMLg') // 80
 */
export function getGuildSuccessPercentageInString(statusString: string): number {
  const total = GUILD_STATUS_OPERATION_ORDER.length;
  const successful = getSuccessfulGuildOperationsInString(statusString).length;
  return Math.round((successful / total) * 100);
}

/**
 * Get guild operation error percentage
 * @param statusString - Status string
 * @returns Percentage of failed operations (0-100)
 *
 * @example
 * getGuildErrorPercentageInString('srmlg') // 100
 * getGuildErrorPercentageInString('SRMLG') // 0
 */
export function getGuildErrorPercentageInString(statusString: string): number {
  const total = GUILD_STATUS_OPERATION_ORDER.length;
  const failed = getFailedGuildOperationsInString(statusString).length;
  return Math.round((failed / total) * 100);
}

/**
 * Get human-readable guild status description
 * @param statusString - Status string
 * @returns Human-readable description
 *
 * @example
 * getGuildStatusDescriptionInString('SRMLG') // "All operations succeeded"
 * getGuildStatusDescriptionInString('srmlg') // "5 failed"
 */
export function getGuildStatusDescriptionInString(statusString: string): string {
  const successful = getSuccessfulGuildOperationsInString(statusString);
  const failed = getFailedGuildOperationsInString(statusString);
  const pending = getPendingGuildOperationsInString(statusString);

  if (successful.length === GUILD_STATUS_OPERATION_ORDER.length) {
    return 'All operations succeeded';
  }

  if (failed.length === GUILD_STATUS_OPERATION_ORDER.length) {
    return 'All operations failed';
  }

  if (pending.length === GUILD_STATUS_OPERATION_ORDER.length) {
    return 'All operations pending';
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
 * Validate guild status string format
 * @param statusString - Status string to validate
 * @returns True if status string is valid
 *
 * @example
 * isValidGuildStatusString('SRMLG') // true
 * isValidGuildStatusString('SRMLGX') // false (too long)
 * isValidGuildStatusString('SRM') // false (too short)
 */
export function isValidGuildStatusString(statusString: string): boolean {
  if (statusString.length !== GUILD_STATUS_OPERATION_ORDER.length) {
    return false;
  }

  const validChars = new Set(['S', 's', 'R', 'r', 'M', 'm', 'L', 'l', 'G', 'g', '-']);

  for (const char of statusString) {
    if (!validChars.has(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Convert guild status string to lowercase for comparison
 * @param statusString - Status string
 * @returns Lowercase status string
 *
 * @example
 * toLowercaseGuildStatusString('SRMLG') // "srmlg"
 */
export function toLowercaseGuildStatusString(statusString: string): string {
  return statusString.toLowerCase();
}
