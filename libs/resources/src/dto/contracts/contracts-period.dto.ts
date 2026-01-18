import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ContractsPeriodDto {
  @ApiProperty({
    description: 'Item ID (must be a valid number)',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Item ID is required' })
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => Number(value))
  readonly itemId: number;

  @ApiProperty({
    description: 'Time period for contract data',
    enum: ['1m', '1w', '30d', '1d', '24h'],
    example: '1d',
  })
  @IsNotEmpty({ message: 'Period is required' })
  @IsString()
  @IsIn(['1m', '1w', '30d', '1d', '24h'], {
    message: 'Period must be one of: 1m, 1w, 30d, 1d, 24h',
  })
  readonly period: string;
}
