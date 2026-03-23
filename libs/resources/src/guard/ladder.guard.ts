import { BadGatewayException } from '@nestjs/common';
import {
  IMythicKeystoneDungeonResponse,
  IMythicKeystoneSeasonResponse,
  IMythicKeystoneSeasonDetail,
  IMythicLeaderboardResponse,
  IPvPSeasonIndexResponse,
  IPvPLeaderboardResponse,
} from '@app/resources/types';
import {
  isMythicKeystoneDungeonResponse,
  isMythicKeystoneSeasonResponse,
  isMythicKeystoneSeasonDetail,
  isMythicLeaderboardResponse,
  isPvPSeasonIndexResponse,
  isPvPLeaderboardResponse,
} from '@app/resources/guard/api.guard';

export function validateMythicKeystoneDungeonResponse(response: unknown): IMythicKeystoneDungeonResponse {
  if (!isMythicKeystoneDungeonResponse(response)) {
    throw new BadGatewayException('Invalid mythic keystone dungeon response');
  }
  return response;
}

export function validateMythicKeystoneSeasonResponse(response: unknown): IMythicKeystoneSeasonResponse {
  if (!isMythicKeystoneSeasonResponse(response)) {
    throw new BadGatewayException('Invalid mythic keystone season response');
  }
  return response;
}

export function validateMythicKeystoneSeasonDetail(response: unknown): IMythicKeystoneSeasonDetail {
  if (!isMythicKeystoneSeasonDetail(response)) {
    throw new BadGatewayException('Invalid mythic keystone season detail response');
  }
  return response;
}

export function validateMythicLeaderboardResponse(response: unknown): IMythicLeaderboardResponse {
  if (!isMythicLeaderboardResponse(response)) {
    throw new BadGatewayException('Invalid mythic leaderboard response');
  }
  return response;
}

export function validatePvPSeasonIndexResponse(response: unknown): IPvPSeasonIndexResponse {
  if (!isPvPSeasonIndexResponse(response)) {
    throw new BadGatewayException('Invalid PvP season index response');
  }
  return response;
}

export function validatePvPLeaderboardResponse(response: unknown): IPvPLeaderboardResponse {
  if (!isPvPLeaderboardResponse(response)) {
    throw new BadGatewayException('Invalid PvP leaderboard response');
  }
  return response;
}
