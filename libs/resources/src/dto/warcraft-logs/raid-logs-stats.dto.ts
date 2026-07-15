import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RaidLogsStatsDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Realm slug (e.g. "silvermoon"). Used directly to filter logs.',
    example: 'silvermoon',
  })
  @IsOptional()
  @IsString()
  readonly realmSlug?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Realm name (e.g. "Silvermoon"). Resolved to slug before querying.',
    example: 'Silvermoon',
  })
  @IsOptional()
  @IsString()
  readonly realmName?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Realm numeric id. Resolved to slug before querying.',
    example: 60,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)), {
    toClassOnly: true,
  })
  @IsInt()
  @Min(0)
  readonly realmId?: number;
}
