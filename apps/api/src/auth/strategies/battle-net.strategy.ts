import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';
import { AuthResponseDto, BattleNetProfile } from '@app/resources';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

/**
 * Review full list of available scopes here: https://develop.battle.net/documentation/guides/using-oauth
 */

@Injectable()
export class BattleNetStrategy extends PassportStrategy(Strategy, 'battlenet') {
  private readonly logger = new Logger(BattleNetStrategy.name, { timestamp: true });

  constructor(
    private readonly authService: AuthService, 
    private readonly httpService: HttpService
  ) {
    super({
      authorizationURL: `https://eu.battle.net/oauth/authorize`,
      tokenURL: 'https://eu.battle.net/oauth/token',
      clientID: process.env.BATTLENET_CLIENT_ID,
      clientSecret: process.env.BATTLENET_CLIENT_SECRET,
      callbackURL: process.env.BATTLENET_CALLBACK_URL,
      scope: 'wow.profile',
    });
  }

  async validate(accessToken: string): Promise<AuthResponseDto> {
    try {
      this.logger.log('Battle.net OAuth validation started', 'validate');
      
      const { data } = await lastValueFrom(
        this.httpService.get('https://eu.battle.net/oauth/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      this.logger.log(`Battle.net OAuth validation for user: ${data.id}`, 'validate');
      
      const battleNetProfile: BattleNetProfile = {
        id: data.id || data.sub,
        battletag: data.battletag,
        sub: data.sub,
      };

      const authResponse = await this.authService.handleBattleNetAuth(battleNetProfile);
      
      this.logger.log(
        `Battle.net OAuth successful for user: ${data.id}, isNewUser: ${authResponse.isNewUser}`, 
        'validate'
      );
      
      return authResponse;
    } catch (error) {
      this.logger.error(
        'Battle.net OAuth validation failed',
        error instanceof Error ? error.stack : String(error),
        'validate'
      );
      throw error;
    }
  }
}
