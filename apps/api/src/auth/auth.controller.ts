import { Controller, Get, HttpCode, HttpStatus, Logger, Req, Res, UseGuards } from '@nestjs/common';
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
import { AuthGuard } from '@nestjs/passport';
import { AuthResponseDto } from '@app/resources';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name, { timestamp: true });

  constructor() {}

  @ApiOperation({ description: 'Initiate Discord OAuth authentication' })
  @ApiOkResponse({ description: 'Redirects to Discord OAuth' })
  @Get('/discord')
  @UseGuards(AuthGuard('discord'))
  async discordAuth(): Promise<void> {
    // This endpoint initiates the Discord OAuth flow
    // The actual redirect is handled by passport
  }

  @ApiOperation({ description: 'Discord OAuth callback' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Discord authentication successful' })
  @ApiUnauthorizedResponse({ description: 'Discord authentication failed' })
  @ApiForbiddenResponse({ description: 'Discord OAuth access denied' })
  @ApiBadRequestResponse({ description: 'Invalid Discord OAuth response' })
  @ApiServiceUnavailableResponse({ description: 'Discord OAuth service unavailable' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error during Discord OAuth' })
  @HttpCode(HttpStatus.OK)
  @Get('/discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(@Req() req, @Res() res: Response): Promise<void> {
    try {
      this.logger.log('Discord OAuth callback received', 'discordCallback');
      const authResponse: AuthResponseDto = req.user;
      
      // In a real application, you might:
      // 1. Generate a JWT token
      // 2. Set secure cookies
      // 3. Redirect to frontend with success status
      
      // For now, return the auth response as JSON
      res.json(authResponse);
    } catch (error) {
      this.logger.error(
        'Error in Discord callback',
        error instanceof Error ? error.stack : String(error),
        'discordCallback'
      );
      res.status(500).json({ success: false, message: 'Authentication failed' });
    }
  }

  @ApiOperation({ description: 'Initiate Battle.net OAuth authentication' })
  @ApiOkResponse({ description: 'Redirects to Battle.net OAuth' })
  @Get('/battlenet')
  @UseGuards(AuthGuard('battlenet'))
  async battlenetAuth(): Promise<void> {
    // This endpoint initiates the Battle.net OAuth flow
    // The actual redirect is handled by passport
  }

  @ApiOperation({ description: 'Battle.net OAuth callback' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Battle.net authentication successful' })
  @ApiUnauthorizedResponse({ description: 'Battle.net authentication failed' })
  @ApiForbiddenResponse({ description: 'Battle.net OAuth access denied' })
  @ApiBadRequestResponse({ description: 'Invalid Battle.net OAuth response' })
  @ApiServiceUnavailableResponse({ description: 'Battle.net OAuth service unavailable' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error during Battle.net OAuth' })
  @HttpCode(HttpStatus.OK)
  @Get('/battlenet/callback')
  @UseGuards(AuthGuard('battlenet'))
  async battlenetCallback(@Req() req, @Res() res: Response): Promise<void> {
    try {
      this.logger.log('Battle.net OAuth callback received', 'battlenetCallback');
      const authResponse: AuthResponseDto = req.user;
      
      // In a real application, you might:
      // 1. Generate a JWT token
      // 2. Set secure cookies
      // 3. Redirect to frontend with success status
      
      // For now, return the auth response as JSON
      res.json(authResponse);
    } catch (error) {
      this.logger.error(
        'Error in Battle.net callback',
        error instanceof Error ? error.stack : String(error),
        'battlenetCallback'
      );
      res.status(500).json({ success: false, message: 'Authentication failed' });
    }
  }

}
