/**
 * Character Status System - Hybrid Bit Flags + String Representation
 *
 * This system provides both efficient bit flag storage and human-readable status strings
 * for tracking the status of multiple character data endpoints.
 */


/**
 * Status state for each endpoint
 */
export enum CharacterStatusState {
  /** Endpoint not yet attempted or pending */
  PENDING = 0,
  /** Endpoint succeeded */
  SUCCESS = 1,
  /** Endpoint failed with error */
  ERROR = 2,
}

/**
 * Character codes for string representation
 * Uppercase = Success, Lowercase = Error, Hyphen = Pending
 */
export const CHARACTER_STATUS_CODES = {
  STATUS: { success: 'S', error: 's', pending: '-' },
  SUMMARY: { success: 'U', error: 'u', pending: '-' },
  MEDIA: { success: 'V', error: 'v', pending: '-' },
  PETS: { success: 'P', error: 'p', pending: '-' },
  MOUNTS: { success: 'M', error: 'm', pending: '-' },
  PROFESSIONS: { success: 'R', error: 'r', pending: '-' },
} as const;

/**
 * Endpoint order for string representation
 * Defines the position of each endpoint in the 6-character status string
 */
export const STATUS_ENDPOINT_ORDER = [
  'STATUS',
  'SUMMARY',
  'MEDIA',
  'PETS',
  'MOUNTS',
  'PROFESSIONS',
] as const;
