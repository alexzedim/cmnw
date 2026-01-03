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
import { AppHealthPayload, SearchQueryDto } from '@app/resources';
import { CharactersEntity, GuildsEntity, ItemsEntity } from '@app/pg';

@ApiTags('app')
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOkResponse({ description: 'Health status and application version.' })
  @Get('health')
  getHealth(): AppHealthPayload {
    return this.appService.getHealth();
  }

  @ApiOperation({ description: 'Universal search across characters, guilds, and items' })
  @ApiOkResponse({
    description:
      'Search results containing matching characters, guilds, and items',
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
  async indexSearch(
    @Query() input: SearchQueryDto,
  ): Promise<{
    characters: CharactersEntity[];
    guilds: GuildsEntity[];
    items: ItemsEntity[];
    hashMatches: { count: number };
  }> {
    return this.appService.indexSearch(input);
  }
}
