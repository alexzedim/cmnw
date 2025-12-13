import { OsintService } from './osint.service';

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  CharacterHashDto,
  CharacterIdDto,
  CharactersLfgDto,
  GuildIdDto,
  RealmDto,
  SearchQueryDto,
} from '@app/resources';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersProfileEntity,
  GuildsEntity,
  ItemsEntity,
  RealmsEntity,
} from '@app/pg';

@ApiTags('osint')
@Controller('osint')
export class OsintController {
  constructor(private readonly osintService: OsintService) {}

  @ApiOperation({ description: 'Returns requested character' })
  @ApiOkResponse({ description: 'Request character with selected guid' })
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
  @Get('/character')
  async getCharacter(
    @Query() input: CharacterIdDto,
  ): Promise<CharactersEntity> {
    return await this.osintService.getCharacter(input);
  }

  @ApiOperation({
    description: 'Returns characters which are looking for guild',
  })
  @ApiOkResponse({
    description: 'Request characters with selected input parameters',
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
  @Get('/character/lfg')
  async getCharactersLfg(
    @Query() input: CharactersLfgDto,
  ): Promise<{ characters: CharactersProfileEntity[] }> {
    const characters = await this.osintService.getCharactersLfg(input);
    return { characters };
  }

  @ApiOperation({ description: 'Returns requested account characters' })
  @ApiOkResponse({ description: 'Request characters with selected hash' })
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
  @Get('/character/hash')
  async getCharactersByHash(
    @Query() input: CharacterHashDto,
  ): Promise<{ characters: CharactersEntity[] }> {
    const characters = await this.osintService.getCharactersByHash(input);
    return { characters };
  }

  @ApiOperation({ description: 'Returns requested character logs' })
  @ApiOkResponse({ description: 'Request logs for selected character' })
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
  @Get('/character/logs')
  async getCharacterLogs(
    @Query() input: CharacterIdDto,
  ): Promise<{ logs: CharactersGuildsLogsEntity[] }> {
    const logs = await this.osintService.getCharacterLogs(input);
    return { logs };
  }

  @ApiOperation({ description: 'Returns requested guild' })
  @ApiOkResponse({ description: 'Request guild with requested guid' })
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
  @Get('/guild')
  async getGuild(
    @Query() input: GuildIdDto,
  ): Promise<{ guild: GuildsEntity; members: any[]; memberCount: number }> {
    return this.osintService.getGuild(input);
  }

  @ApiOperation({ description: 'Returns requested guild logs' })
  @ApiOkResponse({
    description: 'Request guild logs for guild with selected guid',
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
  @Get('/guild/logs')
  async getGuildLogs(
    @Query() input: GuildIdDto,
  ): Promise<{ logs: CharactersGuildsLogsEntity[] }> {
    const logs = await this.osintService.getGuildLogs(input);
    return { logs };
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/population/:realmId')
  async getRealmPopulation(
    @Param('realmId') realmId: string,
  ): Promise<string[]> {
    return this.osintService.getRealmPopulation(realmId);
  }

  @ApiOperation({ description: 'Returns requested realm' })
  @ApiOkResponse({
    description: 'Request realm logs by various different criteria',
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
  @Get('/realms')
  async getRealms(
    @Query() input: RealmDto,
  ): Promise<{ realms: RealmsEntity[] }> {
    const realms = await this.osintService.getRealms(input);
    return { realms };
  }

  @ApiOperation({
    description: 'Universal search across characters, guilds, and items',
  })
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
  }> {
    return this.osintService.indexSearch(input);
  }
}
