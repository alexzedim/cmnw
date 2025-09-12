# Auth Module - OAuth Authentication

This module provides OAuth authentication for Discord and Battle.net using PostgreSQL for user storage.

## Features

- 🔐 **Discord OAuth** - Authenticate users with Discord accounts
- ⚔️ **Battle.net OAuth** - Authenticate users with Battle.net accounts  
- 🗄️ **PostgreSQL Storage** - User data stored in PostgreSQL with TypeORM
- 🔄 **Account Linking** - Support for linking multiple OAuth providers
- 📊 **Comprehensive Logging** - Full audit trail of authentication events
- 🛡️ **Type Safety** - Full TypeScript coverage with DTOs and entities

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback

# Battle.net OAuth
BATTLENET_CLIENT_ID=your_battlenet_client_id
BATTLENET_CLIENT_SECRET=your_battlenet_client_secret
BATTLENET_CALLBACK_URL=http://localhost:3000/auth/battlenet/callback
```

## API Endpoints

### Discord Authentication

- `GET /auth/discord` - Initiates Discord OAuth flow
- `GET /auth/discord/callback` - Discord OAuth callback (handles response)

### Battle.net Authentication  

- `GET /auth/battlenet` - Initiates Battle.net OAuth flow
- `GET /auth/battlenet/callback` - Battle.net OAuth callback (handles response)

## OAuth Flow

1. **Initiation**: User visits `/auth/discord` or `/auth/battlenet`
2. **Redirect**: User is redirected to OAuth provider (Discord/Battle.net)
3. **Authorization**: User authorizes the application
4. **Callback**: OAuth provider redirects to callback URL with authorization code
5. **Validation**: Strategy validates the code and fetches user profile
6. **User Creation/Update**: User is created or updated in PostgreSQL
7. **Response**: Returns `AuthResponseDto` with user data

## Database Schema

The `UserEntity` stores:

- **Basic Info**: id, username, email, avatar, locale
- **Discord Data**: discordId, discordUsername, discordDiscriminator
- **Battle.net Data**: battlenetId, battlenetBattletag
- **OAuth Metadata**: primaryProvider, linkedProviders
- **Account Status**: isActive, lastLoginAt, createdAt, updatedAt

## Response Format

```typescript
interface AuthResponseDto {
  success: boolean;
  message: string;
  user: AuthUserDto;
  isNewUser: boolean;
  accessToken?: string; // Reserved for future JWT implementation
}
```

## Setup Instructions

1. **Register OAuth Applications**:
   - Discord: https://discord.com/developers/applications
   - Battle.net: https://develop.battle.net/

2. **Configure Redirect URIs**:
   - Discord: `http://localhost:3000/auth/discord/callback`
   - Battle.net: `http://localhost:3000/auth/battlenet/callback`

3. **Install Required Packages**:
   ```bash
   npm install passport-discord passport-oauth2
   ```

4. **Database Migration**:
   - The `UserEntity` will auto-create the users table
   - Indexes are automatically created for performance

## Logging

All authentication events are logged with context:

- User login attempts (success/failure)
- New user registrations
- Profile updates
- OAuth validation steps
- Error conditions with stack traces

## Security Considerations

- OAuth secrets stored in environment variables
- User data validation in strategies
- Comprehensive error handling
- Audit logging for all auth events
- TypeORM parameterized queries prevent SQL injection

## Future Enhancements

- JWT token generation for API access
- Session management
- Account linking between providers
- OAuth token refresh handling
- Multi-factor authentication support