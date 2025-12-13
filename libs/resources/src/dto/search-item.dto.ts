import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { transformSearchQuery } from '@app/resources';

export class SearchItemDto {
  @ApiProperty({
    description: 'Search query for commodity items',
    example: 'Ghost Iron Ore',
    minLength: 2,
  })
  @IsNotEmpty({ message: 'Search query is required' })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters long' })
  @Transform(transformSearchQuery, { toClassOnly: true })
  readonly q: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 25,
    default: 25,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  readonly limit?: number = 25;
}

export interface SearchItemResult {
  id: number;
  name: string;
  quality?: number;
}

export class SearchItemResponseDto {
  @ApiProperty({
    description: 'Array of matching items',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 52185 },
        name: { type: 'string', example: 'Ghost Iron Ore' },
        quality: { type: 'number', example: 1 },
      },
    },
  })
  results: SearchItemResult[];
}
