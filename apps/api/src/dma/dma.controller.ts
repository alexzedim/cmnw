import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { DmaService } from './dma.service';

import {
  ItemChartDto,
  ItemFeedDto,
  ItemQuotesDto,
  ItemValuationsDto,
  ReqGetItemDto,
  WowTokenDto,
  SearchItemDto,
  SearchItemResponseDto,
} from '@app/resources';
import { ItemsEntity, MarketEntity } from '@app/pg';
import { ItemRealmDto } from '@app/resources';

@ApiTags('dma')
@Controller('dma')
export class DmaController {
  constructor(private readonly dmaService: DmaService) {}

  @ApiOperation({ description: 'Returns requested item with realm data' })
  @ApiOkResponse({ description: 'Request item with selected id' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item')
  async getItem(
    @Query() input: ReqGetItemDto,
  ): Promise<{ item: ItemsEntity; realm: any[] }> {
    return this.dmaService.getItem(input);
  }

  @ApiOperation({ description: 'Returns requested WoWToken' })
  @ApiOkResponse({ description: 'Request item with selected timestamp' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/token')
  async getWowToken(@Query() input: WowTokenDto): Promise<MarketEntity[]> {
    return this.dmaService.getWowToken(input);
  }

  @ApiOperation({ description: 'Returns requested item valuations' })
  @ApiOkResponse({ description: 'Request item valuations  with selected _id' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/valuations')
  getItemValuations(@Query() input: ItemRealmDto): Promise<ItemValuationsDto> {
    return this.dmaService.getItemValuations(input);
  }

  @ApiOperation({ description: 'Returns chart data for item (commodity or gold)' })
  @ApiOkResponse({ description: 'Request item chart with selected id' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/chart')
  async getItemChart(@Query() input: ReqGetItemDto): Promise<any> {
    return this.dmaService.getItemChart(input);
  }

  @ApiOperation({ description: 'Returns requested commodity item chart' })
  @ApiOkResponse({ description: 'Request commodity chart with selected _id' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/commodity/chart')
  async getCommodityChart(
    @Query() input: ReqGetItemDto,
  ): Promise<ItemChartDto> {
    return this.dmaService.getChart(input);
  }

  @ApiOperation({ description: 'Returns requested item quotes' })
  @ApiOkResponse({ description: 'Request item quotes with selected _id' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/quotes')
  async getAssetQuotes(@Query() input: ItemRealmDto): Promise<ItemQuotesDto> {
    return this.dmaService.getAssetQuotes(input);
  }

  @ApiOperation({ description: 'Returns requested item feed' })
  @ApiOkResponse({ description: 'Request item feed with selected _id' })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/feed')
  async getItemFeed(@Query() input: ItemRealmDto): Promise<ItemFeedDto> {
    return this.dmaService.getItemFeed(input);
  }

  @ApiOperation({
    description:
      'Search for items by ID, name, or localized names for autocomplete',
  })
  @ApiOkResponse({
    description: 'Returns list of matching items',
    type: SearchItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({
    description:
      'The server could not understand the request due to invalid syntax',
  })
  @ApiServiceUnavailableResponse({
    description: 'Server is under maintenance or overloaded',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/search')
  async searchItems(
    @Query() input: SearchItemDto,
  ): Promise<SearchItemResponseDto> {
    const results = await this.dmaService.searchItems(
      input.q,
      input.limit || 25,
    );
    return { results };
  }
}
