import { ApiProperty } from '@nestjs/swagger';

export class ItemChartResponseDto {
  @ApiProperty({
    name: 'yAxis',
    type: () => [String],
    isArray: true,
    description: 'Price levels formatted as strings for display',
    example: ['1.00', '1.50', '2.00', '2.50'],
  })
  readonly yAxis: string[];

  @ApiProperty({
    name: 'xAxis',
    isArray: true,
    description: 'Timestamps as numbers (milliseconds since epoch)',
    example: [1703752800000, 1703839200000, 1703925600000],
  })
  readonly xAxis: number[];

  @ApiProperty({
    name: 'dataset',
    type: () => Object,
    isArray: true,
    description: 'Array of chart data points with market information',
    example: [
      {
        x: 0,
        y: 0,
        value: 100,
        orders: 5,
        oi: 500,
      },
    ],
  })
  readonly dataset: Array<{
    x: number;
    y: number;
    value: number;
    orders: number;
    oi: number;
  }>;
}
