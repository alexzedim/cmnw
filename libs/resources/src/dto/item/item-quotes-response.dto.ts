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
   * Static method to remap raw database query results from snake_case to camelCase
   * @param rawQuotes - Raw query results with snake_case field names
   * @returns Array of remapped quotes with camelCase field names
   */
  static remapQuotes(
    rawQuotes: Array<{
      price: number;
      size: number;
      quantity: number;
      open_interest: number;
    }>,
  ): IOrderQuotes[] {
    return rawQuotes.map((quote) => ({
      price: quote.price,
      size: quote.size,
      quantity: quote.quantity,
      openInterest: quote.open_interest,
    }));
  }
}
