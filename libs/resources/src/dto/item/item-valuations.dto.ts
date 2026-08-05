import { SWAGGER_VALUATIONS, SWAGGER_VALUATIONS_EVALUATIONS } from '@app/resources';
import { ApiProperty } from '@nestjs/swagger';

export class ItemValuationsDto {
  @ApiProperty(SWAGGER_VALUATIONS_EVALUATIONS)
  readonly is_evaluating: number;

  @ApiProperty(SWAGGER_VALUATIONS)
  readonly valuations: any[];
}
