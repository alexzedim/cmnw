import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthProvider, UsersEntity } from '@app/pg';
import {
  AuthResponseDto,
  AuthUserDto,
  DiscordProfile,
  BattleNetProfile,
} from '@app/resources';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });

  constructor(
    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,
  ) {}

  /**
   * Handle Discord OAuth authentication
   */
  async handleDiscordAuth(profile: DiscordProfile): Promise<AuthResponseDto> {
    const logTag = 'handleDiscordAuth';
    try {
      this.logger.log({
        logTag,
        discordId: profile.id,
        username: profile.username,
        message: `Processing Discord OAuth for user: ${profile.id}`,
      });

      let user = await this.userRepository.findOne({
        where: { discordId: profile.id },
      });

      let isNewUser = false;

      if (!user) {
        // Create new user with Discord as primary provider
        user = this.userRepository.create({
          discordId: profile.id,
          discordUsername: profile.username,
          discordDiscriminator: profile.discriminator,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : undefined,
          locale: profile.locale,
          primaryProvider: AuthProvider.DISCORD,
          linkedProviders: [AuthProvider.DISCORD],
          isActive: true,
          lastLoginAt: new Date(),
        });

        user = await this.userRepository.save(user);
        isNewUser = true;
        this.logger.log({
          logTag,
          userId: user.id,
          discordId: profile.id,
          message: `Created new Discord user: ${user.id}`,
        });
      } else {
        // Update existing user's Discord data and last login
        user.discordUsername = profile.username;
        user.discordDiscriminator = profile.discriminator;
        user.lastLoginAt = new Date();

        // Update avatar if not set or if Discord has a new one
        if (!user.avatar && profile.avatar) {
          user.avatar = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
        }

        // Update email if not set
        if (!user.email && profile.email) {
          user.email = profile.email;
        }

        user = await this.userRepository.save(user);
        this.logger.log({
          logTag,
          userId: user.id,
          discordId: profile.id,
          message: `Updated existing Discord user: ${user.id}`,
        });
      }

      return this.createAuthResponse(
        user,
        isNewUser,
        'Discord authentication successful',
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        discordId: profile.id,
        errorOrException,
        message: `Error processing Discord OAuth for user: ${profile.id}`,
      });

      throw new InternalServerErrorException('Discord authentication failed');
    }
  }

  /**
   * Handle Battle.net OAuth authentication
   */
  async handleBattleNetAuth(
    profile: BattleNetProfile,
  ): Promise<AuthResponseDto> {
    const logTag = 'handleBattleNetAuth';
    try {
      this.logger.log({
        logTag,
        battlenetId: profile.id,
        battletag: profile.battletag,
        message: `Processing Battle.net OAuth for user: ${profile.id}`,
      });

      let user = await this.userRepository.findOne({
        where: { battlenetId: profile.id },
      });

      let isNewUser = false;

      if (!user) {
        // Create new user with Battle.net as primary provider
        user = this.userRepository.create({
          battlenetId: profile.id,
          battlenetBattletag: profile.battletag,
          username: profile.battletag.split('#')[0], // Extract name part from BattleTag
          primaryProvider: AuthProvider.BATTLENET,
          linkedProviders: [AuthProvider.BATTLENET],
          isActive: true,
          lastLoginAt: new Date(),
        });

        user = await this.userRepository.save(user);
        isNewUser = true;
        this.logger.log({
          logTag,
          userId: user.id,
          battlenetId: profile.id,
          battletag: profile.battletag,
          message: `Created new Battle.net user: ${user.id}`,
        });
      } else {
        // Update existing user's Battle.net data and last login
        user.battlenetBattletag = profile.battletag;
        user.lastLoginAt = new Date();

        // Update username if not set
        if (!user.username) {
          user.username = profile.battletag.split('#')[0];
        }

        user = await this.userRepository.save(user);
        this.logger.log({
          logTag,
          userId: user.id,
          battlenetId: profile.id,
          battletag: profile.battletag,
          message: `Updated existing Battle.net user: ${user.id}`,
        });
      }

      return this.createAuthResponse(
        user,
        isNewUser,
        'Battle.net authentication successful',
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        battlenetId: profile.id,
        battletag: profile.battletag,
        errorOrException,
        message: `Error processing Battle.net OAuth for user: ${profile.id}`,
      });

      throw new InternalServerErrorException(
        'Battle.net authentication failed',
      );
    }
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<UsersEntity | null> {
    const logTag = 'findUserById';
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      return user;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        userId: id,
        errorOrException,
        message: `Error finding user by ID: ${id}`,
      });
      return null;
    }
  }

  /**
   * Create standardized auth response
   */
  private createAuthResponse(
    user: UsersEntity,
    isNewUser: boolean,
    message: string,
  ): AuthResponseDto {
    const userDto: AuthUserDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      battlenetId: user.battlenetId,
      battlenetBattletag: user.battlenetBattletag,
      primaryProvider: user.primaryProvider,
      linkedProviders: user.linkedProviders,
      locale: user.locale,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };

    return {
      success: true,
      message,
      user: userDto,
      isNewUser,
    };
  }
}
