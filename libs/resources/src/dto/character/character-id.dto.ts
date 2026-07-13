import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_CHARACTER_GUID } from '@app/resources';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class CharacterIdDto {
  @ApiProperty(SWAGGER_CHARACTER_GUID)
  @IsNotEmpty({ message: 'guid is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly guid: string;

  @ApiProperty({
    description: 'Client session identifier for WS progress routing (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly sessionId?: string;

  @ApiProperty({
    description: 'Unique identifier for this request (optional, pairs with sessionId)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly requestId?: string;
}
