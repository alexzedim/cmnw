import { FACTION, OSINT_SOURCE, STATUS_CODES, OSINT_GM_RANK } from '@app/resources';

export const mockApiKey = 'test-api-key-12345';
export const mockClientId = 'test-client-id';
export const mockClientSecret = 'test-client-secret';
export const mockAccessToken = 'test-access-token';

export const mockGuildData = {
  id: 12345,
  name: 'TestGuild',
  realm: 'test-realm',
  realmId: 123,
  realmName: 'Test Realm',
  guid: 'testguild@test-realm',
  faction: FACTION.A,
  achievementPoints: 1000,
  membersCount: 10,
  statusCode: STATUS_CODES.DEFAULT_STATUS,
  createdBy: OSINT_SOURCE.GUILD_GET,
  updatedBy: OSINT_SOURCE.GUILD_GET,
  lastModified: new Date('2025-01-01T00:00:00Z'),
  createdTimestamp: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

export const mockCharacterData = {
  id: 54321,
  guid: 'testchar@test-realm',
  name: 'TestChar',
  realm: 'test-realm',
  level: 70,
  guildRank: 2,
};

export const mockGuildMasterData = {
  id: 11111,
  guid: 'guildmaster@test-realm',
  name: 'GuildMaster',
  realm: 'test-realm',
  level: 70,
  guildRank: OSINT_GM_RANK,
};

export const mockRosterMember = {
  character: {
    id: 54321,
    name: 'TestChar',
    level: 70,
    realm: { slug: 'test-realm' },
    playable_class: { id: 1 },
  },
  rank: 2,
};

export const mockRosterGuildMaster = {
  character: {
    id: 11111,
    name: 'GuildMaster',
    level: 70,
    realm: { slug: 'test-realm' },
    playable_class: { id: 1 },
  },
  rank: OSINT_GM_RANK,
};

export const mockGuildSummaryResponse = {
  id: 12345,
  name: 'TestGuild',
  achievement_points: 1000,
  member_count: 10,
  faction: {
    type: 'ALLIANCE',
    name: null,
  },
  realm: {
    id: 123,
    name: 'Test Realm',
    slug: 'test-realm',
  },
  last_modified: 1704067200000,
  created_timestamp: 1672531200000,
};

export const mockGuildSummaryResponseWithFactionName = {
  ...mockGuildSummaryResponse,
  faction: {
    type: 'HORDE',
    name: 'Horde',
  },
};

export const mockGuildRosterResponse = {
  _links: { self: { href: 'test-url' } },
  guild: {
    key: { href: 'test-url' },
    name: 'TestGuild',
    id: 12345,
    realm: {
      key: { href: 'test-url' },
      name: 'Test Realm',
      id: 123,
      slug: 'test-realm',
    },
    faction: {
      type: 'ALLIANCE',
      name: 'Alliance',
    },
  },
  members: [mockRosterGuildMaster, mockRosterMember],
  last_modified: 1704067200000,
};

export const mockRealmEntity = {
  id: 123,
  name: 'Test Realm',
  slug: 'test-realm',
};

export const mockGuildJobQueue = {
  name: 'TestGuild',
  realm: 'test-realm',
  region: 'eu',
  clientId: mockClientId,
  clientSecret: mockClientSecret,
  accessToken: mockAccessToken,
  forceUpdate: 0,
  createOnlyUnique: false,
};
