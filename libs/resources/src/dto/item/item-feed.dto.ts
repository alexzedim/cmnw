import type { MarketEntity } from '@app/pg';
import { SWAGGER_ITEM_FEED } from '@app/resources';
import { ApiProperty } from '@nestjs/swagger';

export class ItemFeedDto {
  @ApiProperty(SWAGGER_ITEM_FEED)
  readonly feed: MarketEntity[];
}
