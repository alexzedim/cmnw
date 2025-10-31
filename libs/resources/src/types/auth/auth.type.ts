/**
 * OAuth Profile Interfaces
 * Used for authentication with external OAuth providers
 */

/**
 * Discord OAuth user profile data
 */
export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  avatar?: string;
  locale?: string;
}

/**
 * Battle.net OAuth user profile data
 */
export interface BattleNetProfile {
  id: string;
  battletag: string;
  sub: string;
}
