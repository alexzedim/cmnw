import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_CHARACTER_HASH } from '@app/resources';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources';

export class CharacterHashDto {
  @ApiProperty(SWAGGER_CHARACTER_HASH)
  @IsNotEmpty({ message: 'Hash is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly hash: string;
}
