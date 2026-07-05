import {
  assignPriceBucket,
  buildHybridPriceBins,
  filterOutlierPrices,
  niceStep,
  roundToStep,
  NICE_STEPS,
} from './price-binning';

/**
 * Pure-function unit tests for the heatmap price-axis binning.
 *
 * The "LIVE_123918" fixture is the exact 61-record payload returned by
 * https://cmnw.me/api/dma/item/quotes?id=123918 on 2025-07-05 — the item that
 * originally exposed the bug (yAxis came back as
 * `["0","50","50","100","100",…]` with 13 unique labels of 21). These tests
 * lock in the fix.
 */
describe('price-binning', () => {
  describe('niceStep / roundToStep', () => {
    it('returns a step no larger than half the value', () => {
      for (const v of [0.07, 0.3, 1.4, 4.4, 29.48, 90, 250, 800, 5000]) {
        const step = niceStep(v);
        expect(step).toBeLessThanOrEqual(v / 2 + 1e-9);
        expect(NICE_STEPS).toContain(step);
      }
    });

    it('rounds to a multiple of the given step', () => {
      expect(roundToStep(4.4, 2)).toBe(4);
      expect(roundToStep(4.5, 2)).toBe(4); // banker's-ish; we use Math.round on v/step
      expect(roundToStep(99, 50)).toBe(100);
      expect(roundToStep(29.48, 10)).toBe(30);
    });
  });

  describe('filterOutlierPrices', () => {
    it('drops illiquid extreme listings but keeps the dense core', () => {
      const cleaned = filterOutlierPrices(LIVE_123918);
      const prices = cleaned.map((c) => c.price);

      // The 48888 / 51287 junk listings must be gone.
      expect(Math.max(...prices)).toBeLessThan(1000);
      // The real core (2.93 - 5) must be intact.
      expect(Math.min(...prices)).toBeLessThanOrEqual(3);
    });

    it('returns the input unchanged when every price is identical (collapsed IQR)', () => {
      const data = [
        { price: 4, quantity: 100 },
        { price: 4, quantity: 200 },
        { price: 4, quantity: 50 },
      ];
      expect(filterOutlierPrices(data)).toHaveLength(3);
    });

    it('handles small inputs and bad records gracefully', () => {
      expect(filterOutlierPrices([])).toEqual([]);
      expect(filterOutlierPrices([{ price: 5, quantity: 1 }])).toHaveLength(1);
      expect(
        filterOutlierPrices([
          { price: 0, quantity: 1 },
          { price: -1, quantity: 1 },
          { price: NaN, quantity: 1 },
          { price: 5, quantity: 1 },
        ]),
      ).toEqual([{ price: 5, quantity: 1 }]);
    });
  });

  describe('buildHybridPriceBins', () => {
    it('produces strictly ascending, unique edges', () => {
      const edges = buildHybridPriceBins(LIVE_123918);
      expect(new Set(edges).size).toBe(edges.length);
      for (let i = 1; i < edges.length; i++) {
        expect(edges[i]).toBeGreaterThan(edges[i - 1]);
      }
    });

    it('does NOT regress to the original duplicate-label output for item 123918', () => {
      const edges = buildHybridPriceBins(LIVE_123918);
      // The old axis had 21 entries with 8 duplicates (13 unique).
      // The new axis must be fully unique and cover the cleaned range.
      expect(edges.length).toBeGreaterThan(0);
      expect(new Set(edges).size).toBe(edges.length);
      expect(edges.length).toBeLessThanOrEqual(25); // ~blocks + slack
    });

    it('keeps at least one bin for the dominant 2.93-5 price band', () => {
      const edges = buildHybridPriceBins(LIVE_123918);
      const lowBand = edges.filter((e) => e >= 2 && e <= 6);
      expect(lowBand.length).toBeGreaterThan(0);
    });

    it('uses log bins for wide ranges', () => {
      const wide = [
        { price: 1, quantity: 100 },
        { price: 5, quantity: 50 },
        { price: 50, quantity: 20 },
        { price: 500, quantity: 10 },
        { price: 5000, quantity: 5 },
        { price: 50000, quantity: 1 },
      ];
      const edges = buildHybridPriceBins(wide);
      // Log spacing: ratio between consecutive edges is roughly constant.
      const ratios: number[] = [];
      for (let i = 1; i < edges.length; i++) {
        ratios.push(edges[i] / edges[i - 1]);
      }
      const minR = Math.min(...ratios);
      const maxR = Math.max(...ratios);
      // Ratios should be in the same order of magnitude (log spacing).
      expect(maxR / minR).toBeLessThan(5);
      // And span several decades.
      expect(edges[edges.length - 1] / edges[0]).toBeGreaterThan(100);
    });

    it('uses linear bins for narrow ranges with usable resolution', () => {
      const narrow = [
        { price: 4.0, quantity: 1000 },
        { price: 4.1, quantity: 1000 },
        { price: 4.2, quantity: 1000 },
        { price: 4.3, quantity: 1000 },
        { price: 4.4, quantity: 1000 },
        { price: 4.5, quantity: 1000 },
      ];
      const edges = buildHybridPriceBins(narrow);
      // Must not collapse to a single bin (the old bug for tight ranges).
      expect(edges.length).toBeGreaterThan(1);
      // All edges within the narrow band.
      expect(edges[0]).toBeGreaterThanOrEqual(3.5);
      expect(edges[edges.length - 1]).toBeLessThanOrEqual(5);
    });

    it('handles degenerate inputs', () => {
      expect(buildHybridPriceBins([])).toEqual([]);
      expect(buildHybridPriceBins([{ price: 5, quantity: 10 }])).toEqual([5]);
      expect(
        buildHybridPriceBins([
          { price: 3, quantity: 10 },
          { price: 3, quantity: 20 },
        ]),
      ).toEqual([3]);
    });
  });

  describe('assignPriceBucket', () => {
    const edges = [2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('assigns half-open intervals [edge[i], edge[i+1])', () => {
      expect(assignPriceBucket(2.5, edges)).toBe(0);
      expect(assignPriceBucket(3, edges)).toBe(1); // 3 starts bucket 1
      expect(assignPriceBucket(3.99, edges)).toBe(1);
      expect(assignPriceBucket(4, edges)).toBe(2);
      expect(assignPriceBucket(7.5, edges)).toBe(5);
    });

    it('clamps below the floor and at/above the ceiling', () => {
      expect(assignPriceBucket(0, edges)).toBe(0);
      expect(assignPriceBucket(1.99, edges)).toBe(0);
      expect(assignPriceBucket(10, edges)).toBe(edges.length - 1);
      expect(assignPriceBucket(99999, edges)).toBe(edges.length - 1);
    });

    it('is consistent with the bins produced for item 123918', () => {
      const edges = buildHybridPriceBins(LIVE_123918);
      // Every cleaned price must land in a valid bucket.
      const cleaned = filterOutlierPrices(LIVE_123918);
      for (const rec of cleaned) {
        const idx = assignPriceBucket(rec.price, edges);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(edges.length);
      }
    });

    it('handles empty edges', () => {
      expect(assignPriceBucket(5, [])).toBe(0);
    });
  });
});

/**
 * Live fixture: the 61 quote records returned by
 * GET https://cmnw.me/api/dma/item/quotes?id=123918 (Leystone Ore, EU commodity)
 * on 2025-07-05. Includes the illiquid 194-51287g tail that broke the old axis.
 */
const LIVE_123918 = [
  { price: 2.93, quantity: 5 },
  { price: 2.95, quantity: 96 },
  { price: 3, quantity: 16 },
  { price: 3.92, quantity: 118 },
  { price: 3.98, quantity: 255 },
  { price: 3.99, quantity: 1786 },
  { price: 4, quantity: 6008 },
  { price: 4.09, quantity: 50 },
  { price: 4.11, quantity: 3 },
  { price: 4.12, quantity: 33244 },
  { price: 4.15, quantity: 36 },
  { price: 4.19, quantity: 2 },
  { price: 4.2, quantity: 70337 },
  { price: 4.21, quantity: 780 },
  { price: 4.24, quantity: 422 },
  { price: 4.25, quantity: 2747 },
  { price: 4.28, quantity: 45 },
  { price: 4.29, quantity: 369090 },
  { price: 4.3, quantity: 328 },
  { price: 4.33, quantity: 16 },
  { price: 4.34, quantity: 9677 },
  { price: 4.35, quantity: 79775 },
  { price: 4.38, quantity: 90 },
  { price: 4.4, quantity: 11783810 },
  { price: 4.45, quantity: 1066421 },
  { price: 4.49, quantity: 727670 },
  { price: 4.86, quantity: 51568 },
  { price: 4.88, quantity: 2618 },
  { price: 4.98, quantity: 17640 },
  { price: 5, quantity: 491 },
  { price: 5.14, quantity: 1 },
  { price: 5.22, quantity: 5 },
  { price: 5.49, quantity: 1 },
  { price: 5.76, quantity: 1 },
  { price: 5.77, quantity: 2 },
  { price: 5.78, quantity: 2 },
  { price: 5.98, quantity: 1 },
  { price: 5.99, quantity: 1 },
  { price: 6.31, quantity: 1 },
  { price: 6.32, quantity: 1 },
  { price: 6.33, quantity: 1 },
  { price: 6.53, quantity: 1 },
  { price: 6.54, quantity: 1 },
  { price: 6.75, quantity: 1 },
  { price: 6.77, quantity: 1 },
  { price: 7.04, quantity: 1 },
  { price: 8.74, quantity: 30 },
  { price: 8.94, quantity: 10 },
  { price: 9.75, quantity: 5 },
  { price: 18.21, quantity: 10 },
  { price: 18.22, quantity: 5 },
  { price: 18.31, quantity: 1 },
  { price: 18.75, quantity: 1 },
  { price: 40, quantity: 800 },
  { price: 99, quantity: 200 },
  { price: 194, quantity: 1 },
  { price: 299.99, quantity: 2 },
  { price: 594, quantity: 9 },
  { price: 48888.34, quantity: 1 },
  { price: 48888.37, quantity: 1 },
  { price: 51287, quantity: 1 },
];
