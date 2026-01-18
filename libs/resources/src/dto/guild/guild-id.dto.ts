import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_GUILD_GUID } from '@app/resources';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class GuildIdDto {
  @ApiProperty(SWAGGER_GUILD_GUID)
  @IsNotEmpty({ message: 'guid is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly guid: string;
}
