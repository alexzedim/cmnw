import { SWAGGER_DISCORD_CHANNEL_ID, SWAGGER_DISCORD_SERVER_ID } from '@app/resources';
import { ApiProperty } from '@nestjs/swagger';

export class DiscordUidSubscriptionDto {
  @ApiProperty(SWAGGER_DISCORD_SERVER_ID)
  readonly discord_id: string;

  @ApiProperty(SWAGGER_DISCORD_CHANNEL_ID)
  readonly channel_id: string;
}
