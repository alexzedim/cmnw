import { BlockOsintService, CharacterOsintService, GuildOsintService, RealmOsintService } from './services';

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';

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
  BlockIdDto,
  CharacterHashDto,
  CharacterIdDto,
  CharacterLfgDto,
  GuildIdDto,
  IAddonScanEntryWithStatus,
  IAddonScanGuild,
  RealmDto,
  UploadOsintDto,
} from '@app/resources';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersProfileEntity,
  GuildsEntity,
  HashBlockLogsEntity,
  HashBlockMembersEntity,
  HashBlocksEntity,
  RealmsEntity,
} from '@app/pg';

@ApiTags('osint')
@Controller('osint')
export class OsintController {
  constructor(
    private readonly characterOsintService: CharacterOsintService,
    private readonly guildOsintService: GuildOsintService,
    private readonly realmOsintService: RealmOsintService,
    private readonly blockOsintService: BlockOsintService,
  ) {}

  @ApiOperation({ description: 'Upload CMNW OSINT addon scan entries as JSON' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @Post('/upload')
  async uploadOsintJson(
    @Body() body: UploadOsintDto,
  ): Promise<{ characters: IAddonScanEntryWithStatus[]; guilds: IAddonScanGuild[]; s3Key: string }> {
    return this.characterOsintService.processOsintJsonUpload(body.entries);
  }

  @ApiOperation({
    description:
      'Returns requested character. When sessionId/requestId are provided, ' +
      'the character is force-refreshed from Blizzard and progress is ' +
      'streamed over the WS feed to the originating session.',
  })
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
  async getCharacter(@Query() input: CharacterIdDto): Promise<CharactersEntity> {
    return await this.characterOsintService.getCharacter(input);
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
  async getCharactersLfg(@Query() input: CharacterLfgDto): Promise<{ characters: CharactersProfileEntity[] }> {
    const characters = await this.characterOsintService.getCharactersLfg(input);
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
  @Get('/character/hash/:hashQuery/:hashQuery2')
  async getCharactersByHashCombined(@Param() input: CharacterHashDto): Promise<{ characters: CharactersEntity[] }> {
    const characters = await this.characterOsintService.getCharactersByHash(input);
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
  @Get('/character/hash/:hashQuery')
  async getCharactersByHash(@Param() input: CharacterHashDto): Promise<{ characters: CharactersEntity[] }> {
    const characters = await this.characterOsintService.getCharactersByHash(input);
    return { characters };
  }

  @ApiOperation({ description: 'Returns the block and its members for a given hashB anchor value' })
  @ApiOkResponse({ description: 'Block with members for selected hashValue' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/block/:hashValue')
  async getBlock(@Param() input: BlockIdDto): Promise<{ block: HashBlocksEntity; members: HashBlockMembersEntity[] } | null> {
    return this.blockOsintService.getBlockWithMembers(input.hashValue);
  }

  @ApiOperation({ description: 'Returns the audit logs for a block anchored on the given hashB value' })
  @ApiOkResponse({ description: 'Logs for selected block' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/block/:hashValue/logs')
  async getBlockLogs(
    @Param() input: BlockIdDto,
  ): Promise<{ logs: HashBlockLogsEntity[] } | null> {
    return this.blockOsintService.getBlockLogs(input.hashValue);
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
  async getCharacterLogs(@Query() input: CharacterIdDto): Promise<{ logs: CharactersGuildsLogsEntity[] }> {
    const logs = await this.characterOsintService.getCharacterLogs(input);
    return { logs };
  }

  @ApiOperation({
    description:
      'Returns requested guild. When sessionId/requestId are provided, ' +
      'the guild is force-refreshed from Blizzard and progress is ' +
      'streamed over the WS feed to the originating session.',
  })
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
  async getGuild(@Query() input: GuildIdDto): Promise<{ guild: GuildsEntity; members: any[]; memberCount: number }> {
    return this.guildOsintService.getGuild(input);
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
  async getGuildLogs(@Query() input: GuildIdDto): Promise<{ logs: CharactersGuildsLogsEntity[] }> {
    const logs = await this.guildOsintService.getGuildLogs(input);
    return { logs };
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/population/:realmId')
  async getRealmPopulation(@Param('realmId') realmId: string): Promise<string[]> {
    return this.realmOsintService.getRealmPopulation(realmId);
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
  async getRealms(@Query() input: RealmDto): Promise<{ realms: RealmsEntity[] }> {
    const realms = await this.realmOsintService.getRealms(input);
    return { realms };
  }
}
