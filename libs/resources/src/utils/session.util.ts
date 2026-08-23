import type { IncomingMessage } from 'node:http';

import { SESSION_QUERY_KEY } from '../constants/feed.constants';

/**
 * Extracts the client session id from the WS upgrade URL (?session=<id>).
 * Returns undefined for clients that did not supply one (legacy/global feed).
 */
export const extractSessionId = (request: IncomingMessage): string | undefined => {
  try {
    const { searchParams } = new URL(request.url || '', `ws://${request.headers.host}`);
    const sid = searchParams.get(SESSION_QUERY_KEY);
    return sid || undefined;
  } catch {
    return undefined;
  }
};
