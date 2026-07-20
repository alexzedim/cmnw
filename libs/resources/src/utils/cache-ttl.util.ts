import { DateTime } from 'luxon';

export const CACHE_SNAPSHOT_HOUR = 2;
export const CACHE_SNAPSHOT_SAFETY_MARGIN_SECONDS = 10 * 60;
export const CACHE_SNAPSHOT_TTL_FLOOR_SECONDS = 60;

export function secondsUntilNextSnapshot(now: Date = new Date()): number {
  const current = DateTime.fromJSDate(now);
  let next = current.set({
    hour: CACHE_SNAPSHOT_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  if (next <= current) {
    next = next.plus({ days: 1 });
  }

  const rawSeconds = Math.floor(next.diff(current, 'seconds').seconds) - CACHE_SNAPSHOT_SAFETY_MARGIN_SECONDS;

  return Math.max(CACHE_SNAPSHOT_TTL_FLOOR_SECONDS, rawSeconds);
}
