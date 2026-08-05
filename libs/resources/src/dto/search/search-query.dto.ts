import { transformSearchQuery } from '@app/resources/transformers';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query string to search across characters, guilds, and items',
    example: 'example-search',
  })
  @IsNotEmpty({ message: 'searchQuery is required' })
  @IsString()
  @Transform(transformSearchQuery)
  readonly searchQuery: string;
}
