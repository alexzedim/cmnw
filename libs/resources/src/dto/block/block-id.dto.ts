import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@app/resources/transformers';

export class BlockIdDto {
  @ApiProperty({
    name: 'hashValue',
    description: 'Block anchor hashB value (8 chars)',
    type: String,
    required: true,
    nullable: false,
    example: 'a99becec',
  })
  @IsNotEmpty({ message: 'hashValue is required' })
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly hashValue: string;
}
