import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@app/pg';

export class AuthUserDto {
  @ApiProperty({ description: 'User unique identifier' })
  readonly id: string;

  @ApiProperty({ description: 'User display name', required: false })
  readonly username?: string;

  @ApiProperty({ description: 'User email address', required: false })
  readonly email?: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  readonly avatar?: string;

  @ApiProperty({ description: 'Discord user ID', required: false })
  readonly discordId?: string;

  @ApiProperty({ description: 'Discord username', required: false })
  readonly discordUsername?: string;

  @ApiProperty({ description: 'Battle.net user ID', required: false })
  readonly battlenetId?: string;

  @ApiProperty({ description: 'Battle.net BattleTag', required: false })
  readonly battlenetBattletag?: string;

  @ApiProperty({ enum: AuthProvider, description: 'Primary authentication provider' })
  readonly primaryProvider: AuthProvider;

  @ApiProperty({ 
    enum: AuthProvider, 
    isArray: true, 
    description: 'All linked authentication providers' 
  })
  readonly linkedProviders: AuthProvider[];

  @ApiProperty({ description: 'User locale/language preference', required: false })
  readonly locale?: string;

  @ApiProperty({ description: 'Whether user account is active' })
  readonly isActive: boolean;

  @ApiProperty({ description: 'Last login timestamp', required: false })
  readonly lastLoginAt?: Date;

  @ApiProperty({ description: 'Account creation timestamp' })
  readonly createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Authentication status' })
  readonly success: boolean;

  @ApiProperty({ description: 'Status message' })
  readonly message: string;

  @ApiProperty({ type: AuthUserDto, description: 'Authenticated user data' })
  readonly user: AuthUserDto;

  @ApiProperty({ description: 'Whether this is a new user registration' })
  readonly isNewUser: boolean;

  @ApiProperty({ description: 'Access token for API requests', required: false })
  readonly accessToken?: string;
}