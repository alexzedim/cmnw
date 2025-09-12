import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { AtSignExists } from '@app/resources';
import { Transform } from 'class-transformer';

export class ItemRealmDto {
  @ApiProperty({
    description: 'Item ID with optional realm slug in format: itemId or itemId@realmSlug',
    example: '174305@gordunni'
  })
  @IsNotEmpty({ message: 'itemRealm is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(({ value: itemRealm }) => itemRealm.toLowerCase())
  readonly itemRealm: string;
}