import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_ITEM_ID } from '@app/resources';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ReqGetItemDto {
  @ApiProperty(SWAGGER_ITEM_ID)
  @IsNotEmpty({ message: 'ID is required' })
  @Type(() => Number)
  @IsNumber()
  readonly id: number;
}
