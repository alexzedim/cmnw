import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { AnalyticsMetricCategory, AnalyticsMetricType } from '@app/resources/enums';


export class AnalyticsMetricSnapshotDto {
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
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
    { toClassOnly: true },
  )
  @IsInt()
  @Min(0)
  readonly realmId?: number;
}
