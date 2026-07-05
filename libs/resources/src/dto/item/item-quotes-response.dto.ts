import { ApiProperty } from '@nestjs/swagger';
import { IOrderQuotes } from '@app/resources';

export class ItemQuotesResponseDto {
  @ApiProperty({
    name: 'quotes',
    type: () => Object,
    isArray: true,
    description: 'Array of quotes with market data',
    example: [
      {
        price: 1.5,
        size: 10,
        quantity: 100,
        openInterest: 150,
      },
    ],
  })
  readonly quotes: IOrderQuotes[];

  /**
   * Remap raw database query results from snake_case to camelCase AND coerce
   * the aggregate columns to numbers.
   *
   * TypeORM returns PostgreSQL aggregate results (`COUNT(*)`, `SUM(...)`) as
   * strings (bigint-safe), even though the typed `select` pretends they are
   * numbers. Without this coercion, `quantity` and `size` reach the client as
   * JSON strings — which silently breaks `toLocaleString()` grouping in the
   * quotes table. Coerce here at the response boundary so the rest of the
   * stack can trust the declared `number` types.
   *
   * `price` is a non-aggregated numeric column, but it is normalised here too
   * for symmetry and to survive any future driver/ORM change.
   */
  static remapQuotes(rawQuotes: Array<Record<string, string | number>>): IOrderQuotes[] {
    return rawQuotes.map((quote) => ({
      price: Number(quote.price),
      size: Number(quote.size),
      quantity: Number(quote.quantity),
      openInterest: Number(quote.open_interest),
    }));
  }
}
