import { AtSignExists } from '@app/resources';
import { transformToLowerCase } from '@app/resources/transformers';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Validate } from 'class-validator';

export class ItemCrossRealmDto {
  @ApiProperty()
  @IsNotEmpty({ message: '_id is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly _id: string;
}
