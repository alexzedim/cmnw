import { get } from 'lodash';
import {
  BlizzardApiAuctions,
  BlizzardApiCharacterMedia,
  BlizzardApiCharacterProfessions,
  BlizzardApiCharacterSummary,
  BlizzardApiErrorResponse,
  BlizzardApiItem,
  BlizzardApiItemMedia,
  BlizzardApiMountsCollection,
  BlizzardApiPetsCollection,
  BlizzardApiResponse,
  BlizzardApiWowToken,
  GoldApiListing,
  ICharacterRaiderIo,
  IHallOfFame,
  IMythicKeystoneDungeonResponse,
  IMythicKeystoneSeasonResponse,
  IMythicKeystoneSeasonDetail,
  IMythicLeaderboardResponse,
  IPvPSeasonIndexResponse,
  IPvPLeaderboardResponse,
  IRGuildRoster,
  IRGuildRosterMember,
} from '@app/resources/types';

export const isEuRegion = (region: string | number | undefined): boolean =>
  Boolean(region) && (region === 'eu' || region === 2);

export const isBlizzardApiResponse = (
  response: unknown,
): response is Readonly<BlizzardApiResponse> =>
  typeof response === 'object' && !('error' in response);

export const isNamedField = (response: unknown) =>
  response && typeof response === 'object' && 'en_GB' in response;

export const isGuildRoster = (
  response: unknown,
): response is Readonly<IRGuildRoster> =>
  typeof response === 'object' &&
  'members' in response &&
  Array.isArray(response.members) &&
  Boolean(response.members.length);

export const isGuildMember = (
  member: unknown,
): member is Readonly<IRGuildRosterMember> =>
  typeof member === 'object' &&
  member !== null &&
  'character' in member &&
  'rank' in member;

export const isGuildRosterMember = (
  member: unknown,
): member is Readonly<IRGuildRosterMember> =>
  typeof member === 'object' &&
  member !== null &&
  'character' in member &&
  typeof (member as any).character === 'object' &&
  'name' in (member as any).character &&
  'realm' in (member as any).character &&
  'level' in (member as any).character &&
  'playable_class' in (member as any).character &&
  'playable_race' in (member as any).character;

export const isPetsCollection = (
  response: unknown,
): response is Readonly<BlizzardApiPetsCollection> =>
  typeof response === 'object' &&
  'pets' in response &&
  Array.isArray(response.pets) &&
  Boolean(response.pets.length);

export const isMountCollection = (
  response: unknown,
): response is Readonly<BlizzardApiMountsCollection> =>
  typeof response === 'object' &&
  'mounts' in response &&
  Array.isArray(response.mounts) &&
  Boolean(response.mounts.length);

export const isCharacterSummary = (
  response: unknown,
): response is BlizzardApiCharacterSummary =>
  typeof response === 'object' &&
  !('error' in response) &&
  'id' in response &&
  'name' in response;

export const isCharacterMedia = (
  response: unknown,
): response is BlizzardApiCharacterMedia =>
  typeof response === 'object' &&
  'assets' in response &&
  Array.isArray(response.assets) &&
  Boolean(response.assets.length);

export const isWowToken = (response: unknown): response is BlizzardApiWowToken =>
  typeof response === 'object' &&
  'price' in response &&
  'lastModified' in response &&
  'last_updated_timestamp' in response;

export const isAuctions = (response: unknown): response is BlizzardApiAuctions =>
  typeof response === 'object' &&
  'lastModified' in response &&
  'auctions' in response &&
  Array.isArray(response.auctions) &&
  Boolean(response.auctions.length);

export const isGold = (response: unknown): response is GoldApiListing =>
  typeof response === 'object' &&
  'price' in response &&
  typeof response.price === 'number' &&
  'quantity' in response &&
  typeof response.quantity === 'number' &&
  'orderId' in response &&
  typeof response.orderId === 'string' &&
  'counterparty' in response &&
  typeof response.counterparty === 'string';

export const isItem = (
  response: PromiseSettledResult<any>,
): response is PromiseFulfilledResult<BlizzardApiItem> =>
  typeof response === 'object' &&
  response.status === 'fulfilled' &&
  'value' in response &&
  Boolean(response.value);

export const isItemMedia = (
  response: PromiseSettledResult<any>,
): response is PromiseFulfilledResult<BlizzardApiItemMedia> =>
  typeof response === 'object' &&
  response.status === 'fulfilled' &&
  'value' in response &&
  'assets' in response.value &&
  Boolean(response.value.assets) &&
  Array.isArray(response.value.assets);

export const isRaiderIoProfile = (
  response: unknown,
): response is ICharacterRaiderIo =>
  typeof response === 'object' &&
  'mythic_plus_scores_by_season' in response &&
  'raid_progression' in response &&
  Array.isArray(response.mythic_plus_scores_by_season);

export const isHallOfFame = (response: unknown): response is IHallOfFame =>
  typeof response === 'object' &&
  'entries' in response &&
  Array.isArray(response.entries);

export const isCharacterProfessions = (
  response: unknown,
): response is BlizzardApiCharacterProfessions =>
  typeof response === 'object' &&
  'character' in response &&
  'primaries' in response &&
  'secondaries' in response &&
  Array.isArray(response.primaries) &&
  Array.isArray(response.secondaries);

export const isResponseError = (error: unknown): error is BlizzardApiErrorResponse =>
  typeof error === 'object' &&
  get(error, 'response.status') &&
  get(error, 'response.statusText');

export const isMythicKeystoneDungeonResponse = (
  response: unknown,
): response is IMythicKeystoneDungeonResponse =>
  typeof response === 'object' &&
  '_links' in response &&
  'dungeons' in response &&
  Array.isArray(response.dungeons);

export const isMythicKeystoneSeasonResponse = (
  response: unknown,
): response is IMythicKeystoneSeasonResponse =>
  typeof response === 'object' &&
  '_links' in response &&
  'seasons' in response &&
  Array.isArray(response.seasons) &&
  'current_season' in response;

export const isMythicKeystoneSeasonDetail = (
  response: unknown,
): response is IMythicKeystoneSeasonDetail =>
  typeof response === 'object' &&
  '_links' in response &&
  'id' in response &&
  typeof (response as any).id === 'number' &&
  'start_timestamp' in response &&
  typeof (response as any).start_timestamp === 'number' &&
  'periods' in response &&
  Array.isArray((response as any).periods);

export const isMythicLeaderboardResponse = (
  response: unknown,
): response is IMythicLeaderboardResponse =>
  typeof response === 'object' &&
  '_links' in response &&
  'map' in response &&
  typeof (response as any).map === 'object' &&
  'period' in response &&
  typeof (response as any).period === 'number' &&
  'period_start_timestamp' in response &&
  typeof (response as any).period_start_timestamp === 'number' &&
  'period_end_timestamp' in response &&
  typeof (response as any).period_end_timestamp === 'number' &&
  'leading_groups' in response &&
  Array.isArray((response as any).leading_groups) &&
  'keystone_affixes' in response &&
  Array.isArray((response as any).keystone_affixes);

export const isPvPSeasonIndexResponse = (
  response: unknown,
): response is IPvPSeasonIndexResponse =>
  typeof response === 'object' &&
  '_links' in response &&
  'seasons' in response &&
  Array.isArray(response.seasons) &&
  'current_season' in response;

export const isPvPLeaderboardResponse = (
  response: unknown,
): response is IPvPLeaderboardResponse =>
  typeof response === 'object' &&
  '_links' in response &&
  'season' in response &&
  'name' in response &&
  'bracket' in response &&
  typeof (response as any).bracket === 'object' &&
  'entries' in response &&
  Array.isArray((response as any).entries);
