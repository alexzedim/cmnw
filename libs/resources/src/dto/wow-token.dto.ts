import { Transform } from 'class-transformer';
import { IsOptional, IsString, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  SWAGGER_WOWTOKEN_LIMIT,
  SWAGGER_WOWTOKEN_REGION,
  transformToLowerCase,
} from '@app/resources';

export class WowTokenDto {
  @ApiProperty(SWAGGER_WOWTOKEN_REGION)
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly region: 'eu' | 'kr' | 'us' | 'tw';

  @ApiProperty(SWAGGER_WOWTOKEN_LIMIT)
  @IsOptional()
  @Max(250)
  @Transform(({ value: limit }) => Number(limit), { toClassOnly: true })
  readonly limit: number;
}
