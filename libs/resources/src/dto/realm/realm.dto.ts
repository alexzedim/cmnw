import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  SWAGGER_REALM_CONNECTED_REALM_ID,
  SWAGGER_REALM_ID,
  SWAGGER_REALM_NAME,
  SWAGGER_REALM_REGION,
  SWAGGER_REALM_SLUG,
} from '@app/resources/swagger/osint.swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { capitalize, transformToLowerCase } from '@app/resources/transformers';

export class RealmDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional(SWAGGER_REALM_ID)
  readonly id?: number;

  @ApiPropertyOptional(SWAGGER_REALM_REGION)
  @IsOptional()
  @IsString()
  @Transform(({ value }) => capitalize(value), { toClassOnly: true })
  readonly region?: string;

  @ApiPropertyOptional(SWAGGER_REALM_SLUG)
  @IsOptional()
  @IsString()
  @Transform(transformToLowerCase, { toClassOnly: true })
  readonly slug?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional(SWAGGER_REALM_NAME)
  readonly name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional(SWAGGER_REALM_CONNECTED_REALM_ID)
  readonly connectedRealmId?: number;
}
