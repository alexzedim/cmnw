/**
 * Price-axis binning for the market heatmap.
 *
 * Design notes (see review for item 123918):
 * - WoW auction prices span many orders of magnitude (a few silver to tens of
 *   thousands of gold), so a single linear axis collapses ~all volume into one
 *   row and leaves the rest of the grid empty.
 * - We pick a hybrid strategy: log10-spaced edges when the cleaned range is
 *   wide (`max / min > LOG_BIN_RATIO`), otherwise linear equal-width edges.
 * - Every edge is snapped to a "nice" 1-2-5 step at its own magnitude, so the
 *   labels read cleanly (2, 3, 5, 7, 10, 20, 50, 100, ...) and never collide.
 * - Outliers are removed with a quantity-weighted IQR filter on log10(price)
 *   before any binning, so junk listings (e.g. 48888g) cannot drag the cap.
 *
 * These helpers are pure functions so they can be unit-tested without the
 * NestJS DI container.
 */

/**
 * Standard "nice" rounding grid (1-2-2.5-5 series, plus round decimals).
 * Must be sorted ascending. Used both for snapping individual log-bin edges
 * and for picking the linear-bin step whose count best matches `blocks`.
 */
export const NICE_STEPS: readonly number[] = [
  0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500,
  5000, 10000,
];

/** Switch to log bins when the cleaned range spans more than this ratio. */
export const LOG_BIN_RATIO = 50;

/** Default bin (block) count for the price axis. */
export const DEFAULT_BLOCKS = 20;

/** Minimum meaningful price; guards against zero/negative inputs. */
export const MIN_PRICE = 0.01;

export interface PriceQuantity {
  price: number;
  /** Optional; only `price` is required for the IQR filter (it weights by order count). */
  quantity?: number;
}

/**
 * Pick the largest "nice" step (1-2-5 series) that is no bigger than half the
 * given value. Returns the last step if `value` exceeds the grid.
 *
 * Used to snap an arbitrary edge to a clean label at its own magnitude,
 * instead of one global increment (which is what produced duplicate labels).
 */
export function niceStep(value: number): number {
  if (value <= NICE_STEPS[0]) return NICE_STEPS[0];

  const half = value / 2;

  for (let i = NICE_STEPS.length - 1; i >= 0; i--) {
    if (NICE_STEPS[i] <= half) return NICE_STEPS[i];
  }

  return NICE_STEPS[0];
}

/** Round to a multiple of `step` (0.5 step rounds half-up). */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Remove outlier prices using an interquartile range on `log10(price)`.
 *
 * Weighting is by **order count** (each row = one vote), NOT by quantity.
 * Quantity-weighting was the original design, but a single mega-stack
 * (e.g. 11M units at 4.40g) then dominates the CDF and collapses the kept
 * range to a sliver around that one price — defeating the point of the axis.
 * Order-count weighting gives every listed price level an equal voice, which
 * is what we want when deciding the visible range of the chart.
 *
 * Log space handles the heavy tail naturally, so a thin listing at 48888g
 * lands well outside the fence and is dropped, while a genuinely liquid rare
 * (many distinct listings near the same high price) is kept.
 *
 * @param data  raw market records (only `price` is read; `quantity` preserved)
 * @param k     IQR multiplier; 3 is conservative (keeps rare-but-real listings)
 * @returns cleaned records with finite, positive price
 */
export function filterOutlierPrices(data: ReadonlyArray<PriceQuantity>, k: number = 3): PriceQuantity[] {
  const clean = data.filter((d) => Number.isFinite(d.price) && d.price > 0);

  if (clean.length < 4) return clean.slice();

  const logs = clean.map((d) => Math.log10(d.price)).sort((a, b) => a - b);

  const at = (pct: number) => {
    const idx = (logs.length - 1) * pct;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return logs[lo];
    return logs[lo] + (logs[hi] - logs[lo]) * (idx - lo);
  };

  const q1 = at(0.25);
  const q3 = at(0.75);
  const iqr = q3 - q1;

  let logLow: number;
  let logHigh: number;

  if (iqr > 0) {
    logLow = q1 - k * iqr;
    logHigh = q3 + k * iqr;
  } else {
    // IQR collapsed (e.g. all prices identical) — keep everything.
    return clean.slice();
  }

  const low = Math.pow(10, logLow);
  const high = Math.pow(10, logHigh);

  return clean.filter((d) => d.price >= low && d.price <= high);
}

/** Build log10-spaced edges between `min` and `max`, then snap each to nice. */
function buildLogBins(min: number, max: number, blocks: number): number[] {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logStep = (logMax - logMin) / blocks;

  const raw: number[] = [];
  for (let i = 0; i <= blocks; i++) {
    raw.push(Math.pow(10, logMin + i * logStep));
  }

  return snapAndDedupe(raw);
}

/**
 * Build linear equal-width edges between `min` and `max`, then snap each.
 *
 * We pick the nice 1-2-5 step whose resulting bin count is closest to the
 * requested `blocks`. This avoids two failure modes:
 *   - a 4.0–4.5 range producing one bin (step too coarse), and
 *   - a 4.0–4.5 range producing 26 bins (step too fine).
 */
function buildLinearBins(min: number, max: number, blocks: number): number[] {
  const range = max - min;
  if (range <= 0) return [parseFloat(min.toFixed(2))];

  // Pick the nice step whose resulting bin count is closest to `blocks`.
  let bestStep = NICE_STEPS[0];
  let bestErr = Infinity;

  for (const s of NICE_STEPS) {
    if (s > range) break;
    const count = range / s;
    const err = Math.abs(count - blocks);
    if (err < bestErr) {
      bestErr = err;
      bestStep = s;
    }
  }

  const start = Math.floor(min / bestStep) * bestStep;
  const raw: number[] = [];

  for (let v = start; v <= max + bestStep / 2; v += bestStep) {
    raw.push(v);
  }

  return raw.map((v) => parseFloat(v.toFixed(2))).filter((v, i, arr) => i === 0 || v > arr[i - 1]);
}

/**
 * Snap each raw edge to a nice step at its own magnitude, then drop duplicates
 * produced by the rounding. Always preserves the first and last edges so the
 * axis covers the full cleaned range.
 */
function snapAndDedupe(raw: number[]): number[] {
  if (raw.length === 0) return [];

  const snapped = raw.map((v) => {
    const step = niceStep(v);
    return parseFloat(roundToStep(v, step).toFixed(2));
  });

  const deduped: number[] = [snapped[0]];
  for (let i = 1; i < snapped.length; i++) {
    if (snapped[i] > deduped[deduped.length - 1]) {
      deduped.push(snapped[i]);
    }
  }

  // Ensure the true max is represented as the final edge.
  const trueMax = snapped[snapped.length - 1];
  if (deduped[deduped.length - 1] < trueMax) {
    deduped.push(trueMax);
  }

  return deduped;
}

/**
 * Build the heatmap price axis (Y) from raw market data.
 *
 * 1. Filter outliers (quantity-weighted IQR on log-price).
 * 2. Pick log vs linear based on the cleaned range.
 * 3. Produce `blocks + 1` edges, snapped to nice 1-2-5 steps, deduplicated.
 *
 * @returns strictly-ascending, unique price edges. Empty if no usable data.
 */
export function buildHybridPriceBins(data: ReadonlyArray<PriceQuantity>, blocks: number = DEFAULT_BLOCKS): number[] {
  if (data.length === 0) return [];

  const cleaned = filterOutlierPrices(data);
  if (cleaned.length === 0) return [];

  const prices = cleaned.map((d) => d.price);
  let min = Math.min(...prices);
  let max = Math.max(...prices);

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return [Math.max(min, MIN_PRICE)];
  }

  min = Math.max(min, MIN_PRICE);

  // Wide range (e.g. 2g to 50000g) -> log bins. Narrow (e.g. 4g to 5g) -> linear.
  if (max / min > LOG_BIN_RATIO) {
    return buildLogBins(min, max, blocks);
  }

  return buildLinearBins(min, max, blocks);
}

/**
 * Find the bucket index for `price` using half-open intervals `[edge[i], edge[i+1])`.
 * Prices at or above the last edge clamp to the last bucket. Binary search, O(log n).
 */
export function assignPriceBucket(price: number, edges: number[]): number {
  if (edges.length === 0) return 0;
  if (price <= edges[0]) return 0;
  if (price >= edges[edges.length - 1]) return edges.length - 1;

  let lo = 0;
  let hi = edges.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (price < edges[mid]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return lo - 1;
}
