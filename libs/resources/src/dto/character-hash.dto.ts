import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_CHARACTER_HASH_TYPE, SWAGGER_CHARACTER_HASH_QUERY } from '@app/resources';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class CharacterHashDto {
  @ApiProperty(SWAGGER_CHARACTER_HASH_TYPE)
  @IsNotEmpty({ message: 'Hash type is required' })
  @IsString()
  @Matches(/^[ab]$/, { message: 'Hash type must be either a or b' })
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly hashType: string;

  @ApiProperty(SWAGGER_CHARACTER_HASH_QUERY)
  @IsNotEmpty({ message: 'Hash query is required' })
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly hashQuery: string;
}
