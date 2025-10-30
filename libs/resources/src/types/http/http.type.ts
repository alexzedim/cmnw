/**
 * Request type for header generation
 */
export type HeaderRequestType = 'browser' | 'xhr';

/**
 * Options for generating randomized headers
 */
export interface RandomizedHeadersOptions {
  /** Type of request: 'browser' for HTML pages, 'xhr' for AJAX/JSON requests */
  type: HeaderRequestType;
  /** Optional referer header (typically used with 'xhr' type) */
  referer?: string;
}
