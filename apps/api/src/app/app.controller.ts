import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
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
import { AppService } from './app.service';
import { AnalyticsMetricHistoryDto, AnalyticsMetricSnapshotDto, AppHealthPayload, SearchQueryDto } from '@app/resources';
import { AnalyticsEntity, CharactersEntity, GuildsEntity, ItemsEntity, RealmsEntity } from '@app/pg';

@ApiTags('app')
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOkResponse({ description: 'Health status and application version.' })
  @Get('metrics')
  async getMetrics(): Promise<AppHealthPayload> {
    return this.appService.getMetrics();
  }

  @ApiOperation({
    description: 'Fetch the latest analytics snapshot for a category, metric type, and optional realm.',
  })
  @ApiOkResponse({ description: 'Latest analytics metric snapshot.' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiServiceUnavailableResponse({
    description: 'Analytics data is unavailable.',
  })
  @Get('metrics/snapshot')
  async getLatestAnalyticsMetricSnapshot(
    @Query() snapshotQuery: AnalyticsMetricSnapshotDto,
  ): Promise<AnalyticsEntity | null> {
    return this.appService.getLatestMetricSnapshot(snapshotQuery);
  }

  @ApiOperation({
    description:
      'Fetch the analytics metric history for a category, metric type, and optional realm ' +
      'over a date range. Ordered by snapshot date ascending.',
  })
  @ApiOkResponse({ description: 'Analytics metric history entries.' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiServiceUnavailableResponse({
    description: 'Analytics data is unavailable.',
  })
  @Get('metrics/history')
  async getAnalyticsMetricHistory(
    @Query() historyQuery: AnalyticsMetricHistoryDto,
  ): Promise<AnalyticsEntity[]> {
    return this.appService.getMetricHistory(historyQuery);
  }

  @ApiOperation({
    description: 'Universal search across characters, guilds, items, and realms',
  })
  @ApiOkResponse({
    description: 'Search results containing matching characters, guilds, items, and realms',
  })
  @ApiUnauthorizedResponse({
    description: 'You need authenticate yourself before request',
  })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({
    description: 'Commonwealth API is not available at the moment',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/search')
  async indexSearch(@Query() input: SearchQueryDto): Promise<{
    characters: CharactersEntity[];
    guilds: GuildsEntity[];
    items: ItemsEntity[];
    realms: RealmsEntity[];
    hashMatches: { count: number };
  }> {
    return this.appService.indexSearch(input);
  }
}
