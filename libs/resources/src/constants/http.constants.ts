/**
 * Browser-like HTTP headers for web scraping
 * Used to avoid 403 Forbidden errors when making requests to external services
 */

export const BROWSER_USER_AGENTS = {
  CHROME_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  CHROME_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  FIREFOX_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  FIREFOX_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
} as const;

/**
 * Standard browser headers to mimic legitimate requests
 * Used for scraping WarcraftLogs and similar services
 */
export const BROWSER_HEADERS = {
  'User-Agent': BROWSER_USER_AGENTS.CHROME_WINDOWS,
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
} as const;

/**
 * Get browser headers with optional custom user agent
 */
export function getBrowserHeaders(
  userAgent?: string,
): Record<string, string> {
  return {
    ...BROWSER_HEADERS,
    ...(userAgent && { 'User-Agent': userAgent }),
  };
}
