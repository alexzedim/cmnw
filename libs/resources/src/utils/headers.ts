import { USER_AGENTS, ACCEPT_LANGUAGES } from '../constants/http.constants';
import type { RandomizedHeadersOptions } from '../types';

/**
 * Generate randomized HTTP headers to avoid detection
 *
 * @param options - Configuration for header generation
 * @returns Record of HTTP headers with randomized values
 *
 * @example
 * // For HTML page navigation
 * const headers = getRandomizedHeaders({ type: 'browser' });
 *
 * @example
 * // For AJAX/JSON API requests
 * const headers = getRandomizedHeaders({
 *   type: 'xhr',
 *   referer: 'https://example.com/page'
 * });
 */
export function getRandomizedHeaders(
  options: RandomizedHeadersOptions,
): Record<string, string> {
  const { type, referer } = options;

  // Randomize common headers
  const randomUserAgent =
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const randomAcceptLanguage =
    ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];

  // Base headers common to both types
  const baseHeaders: Record<string, string> = {
    'User-Agent': randomUserAgent,
    'Accept-Language': randomAcceptLanguage,
    'Accept-Encoding': 'gzip, deflate, br',
    DNT: '1',
    Connection: 'keep-alive',
  };

  // Type-specific headers
  if (type === 'browser') {
    return {
      ...baseHeaders,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    };
  }

  // XHR/AJAX type
  const xhrHeaders: Record<string, string> = {
    ...baseHeaders,
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };

  if (referer) {
    xhrHeaders['Referer'] = referer;
  }

  return xhrHeaders;
}
