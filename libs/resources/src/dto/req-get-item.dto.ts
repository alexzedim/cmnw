import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_ITEM_ID } from '@app/resources';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class ReqGetItemDto {
  @ApiProperty(SWAGGER_ITEM_ID)
  @IsNotEmpty({ message: 'ID is required' })
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly id: string;
}
