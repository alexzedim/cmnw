import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { AtSignExists } from '@app/resources';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class ItemCrossRealmDto {
  @ApiProperty()
  @IsNotEmpty({ message: '_id is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly _id: string;
}
