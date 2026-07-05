import { ItemQuotesResponseDto } from './item-quotes-response.dto';

/**
 * Locks in the type-coercion fix for the /quotes endpoint.
 *
 * Background: TypeORM returns PostgreSQL aggregate columns (`COUNT(*)`,
 * `SUM(quantity)`, `SUM(value)`) as strings, so without coercion the wire
 * payload had `quantity:"5"` and `size:"1"` — JSON strings that silently
 * broke `toLocaleString()` grouping in the quotes table. `remapQuotes` now
 * runs every field through `Number()`.
 */
describe('ItemQuotesResponseDto.remapQuotes', () => {
  it('coerces string aggregate columns to numbers', () => {
    // Shape TypeORM actually returns from the raw query in dma.service.getItemQuotes.
    const raw = [
      {
        price: '2.93',
        size: '1',
        quantity: '5',
        open_interest: '14.65',
      },
      {
        price: '4.40',
        size: '1448',
        quantity: '11783810',
        open_interest: '51848672',
      },
    ];

    const quotes = ItemQuotesResponseDto.remapQuotes(raw);

    expect(quotes).toEqual([
      { price: 2.93, size: 1, quantity: 5, openInterest: 14.65 },
      { price: 4.4, size: 1448, quantity: 11783810, openInterest: 51848672 },
    ]);

    // Every field must be a real number, not a string.
    for (const q of quotes) {
      expect(typeof q.price).toBe('number');
      expect(typeof q.size).toBe('number');
      expect(typeof q.quantity).toBe('number');
      expect(typeof q.openInterest).toBe('number');
    }
  });

  it('renames open_interest (snake_case) to openInterest (camelCase)', () => {
    const quotes = ItemQuotesResponseDto.remapQuotes([{ price: 1, size: 1, quantity: 1, open_interest: 1 }]);

    expect(quotes[0]).toHaveProperty('openInterest', 1);
    expect(quotes[0]).not.toHaveProperty('open_interest');
  });

  it('passes already-numeric input through unchanged', () => {
    const quotes = ItemQuotesResponseDto.remapQuotes([{ price: 2.5, size: 3, quantity: 100, open_interest: 250 }]);

    expect(quotes).toEqual([{ price: 2.5, size: 3, quantity: 100, openInterest: 250 }]);
  });

  it('handles empty input', () => {
    expect(ItemQuotesResponseDto.remapQuotes([])).toEqual([]);
  });

  it('tolerates null-ish / NaN aggregate values by coercing them (never a string)', () => {
    // Number(null) === 0, Number(undefined) === NaN, Number('abc') === NaN.
    // The point of this test: whatever the coercion produces, it must NEVER be
    // a string — that is what broke the quotes table grouping originally.
    const quotes = ItemQuotesResponseDto.remapQuotes([
      { price: 0, size: null, quantity: undefined, open_interest: 'abc' },
    ]);

    expect(typeof quotes[0].size).toBe('number');
    expect(typeof quotes[0].quantity).toBe('number');
    expect(typeof quotes[0].openInterest).toBe('number');

    expect(quotes[0].size).toBe(0); // Number(null)
    expect(Number.isNaN(quotes[0].quantity)).toBe(true); // Number(undefined)
    expect(Number.isNaN(quotes[0].openInterest)).toBe(true); // Number('abc')
  });
});
