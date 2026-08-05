import { SWAGGER_ITEM_ID } from '@app/resources';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class ReqGetItemDto {
  @ApiProperty(SWAGGER_ITEM_ID)
  @IsNotEmpty({ message: 'ID is required' })
  @Type(() => Number)
  @IsNumber()
  readonly id: number;
}
