import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_CHARACTER_HASH_QUERY } from '@app/resources';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class CharacterHashDto {
  @ApiProperty(SWAGGER_CHARACTER_HASH_QUERY)
  @IsNotEmpty({ message: 'Hash query is required' })
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly hashQuery: string;

  @ApiProperty(SWAGGER_CHARACTER_HASH_QUERY)
  @IsOptional()
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly hashQuery2?: string;
}
