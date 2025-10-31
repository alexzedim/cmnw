import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-discord';
import { AuthService } from '../auth.service';
import { DiscordProfile } from '@app/resources';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private readonly logger = new Logger(DiscordStrategy.name, {
    timestamp: true,
  });

  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ['identify', 'email'],
    } as StrategyOptions);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    _done: VerifyCallback,
  ): Promise<any> {
    try {
      this.logger.log(
        `Discord OAuth validation for user: ${profile.id}`,
        'validate',
      );

      const discordProfile: DiscordProfile = {
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        email: profile.email,
        avatar: profile.avatar,
        locale: profile.locale,
      };

      const authResponse =
        await this.authService.handleDiscordAuth(discordProfile);

      this.logger.log(
        `Discord OAuth successful for user: ${profile.id}, isNewUser: ${authResponse.isNewUser}`,
        'validate',
      );

      return authResponse;
    } catch (error) {
      this.logger.error(
        `Discord OAuth validation failed for user: ${profile.id}`,
        error instanceof Error ? error.stack : String(error),
        'validate',
      );
      throw error;
    }
  }
}
