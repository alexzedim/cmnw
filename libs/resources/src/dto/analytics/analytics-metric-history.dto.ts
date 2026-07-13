import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '../../enums';
import { IsDate, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class AnalyticsMetricHistoryDto {
  @ApiProperty({
    enum: AnalyticsMetricCategory,
    description: 'Analytics metric category to query.',
    example: AnalyticsMetricCategory.CHARACTERS,
  })
  @IsEnum(AnalyticsMetricCategory)
  readonly category: AnalyticsMetricCategory;

  @ApiPropertyOptional({
    enum: AnalyticsMetricType,
    default: AnalyticsMetricType.TOTAL,
    description: 'Specific metric type; defaults to total snapshots when omitted.',
    example: AnalyticsMetricType.TOTAL,
  })
  @IsEnum(AnalyticsMetricType)
  @IsOptional()
  readonly metricType: AnalyticsMetricType = AnalyticsMetricType.TOTAL;

  @ApiPropertyOptional({
    type: Number,
    description: 'Realm identifier for realm-scoped metrics; omit for global totals.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)), {
    toClassOnly: true,
  })
  @IsInt()
  @Min(0)
  readonly realmId?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'ISO date string; lower bound (inclusive) of the history range.',
    example: '2026-06-01',
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : new Date(value)), {
    toClassOnly: true,
  })
  @IsDate()
  readonly fromDate?: Date;

  @ApiPropertyOptional({
    type: String,
    description: 'ISO date string; upper bound (inclusive) of the history range.',
    example: '2026-07-14',
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : new Date(value)), {
    toClassOnly: true,
  })
  @IsDate()
  readonly toDate?: Date;
}
