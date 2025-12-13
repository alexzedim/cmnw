import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class ItemRealmDto {
  @ApiProperty({
    description:
      'Item ID with optional realm slug in format: itemId or itemId@realmSlug. For commodity items, realm can be omitted.',
    example: '174305@gordunni or 226024',
  })
  @IsNotEmpty({ message: 'id is required' })
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly id: string;
}
