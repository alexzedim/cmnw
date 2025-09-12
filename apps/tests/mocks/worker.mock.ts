import { GuildsEntity, CharactersGuildsMembersEntity } from '@app/pg';
import { OSINT_GM_RANK, OSINT_SOURCE } from '@app/resources';

/**
 * Original Banhammer guild roster state
 */
export const guildOriginal: {
  guildEntity: GuildsEntity;
  members: CharactersGuildsMembersEntity[];
} = {
  guildEntity: {
    uuid: 'guild-uuid-12345',
    id: 12345,
    guid: 'banhammer@stormrage',
    name: 'Banhammer',
    realm: 'stormrage',
    realmId: 52,
    realmName: 'Stormrage',
    faction: 'Alliance',
    membersCount: 8,
    achievementPoints: 125000,
    statusCode: 200,
    createdBy: OSINT_SOURCE.GUILD_GET,
    updatedBy: OSINT_SOURCE.GUILD_ROSTER,
    createdTimestamp: new Date('2020-01-15'),
    lastModified: new Date('2024-01-15'),
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  } as GuildsEntity,

  members: [
    // Guild Master - will be changed in updated roster
    {
      uuid: 'member-uuid-100001',
      characterId: 100001,
      characterGuid: 'oldguildmaster@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: OSINT_GM_RANK, // 0
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2020-01-15'),
    } as CharactersGuildsMembersEntity,

    // Officer - will become new GM
    {
      uuid: 'member-uuid-100002',
      characterId: 100002,
      characterGuid: 'newguildmaster@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 1, // Officer
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2020-03-01'),
    } as CharactersGuildsMembersEntity,

    // Officer - stays same
    {
      uuid: 'member-uuid-100003',
      characterId: 100003,
      characterGuid: 'stableofficer@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 1, // Officer
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2020-05-10'),
    } as CharactersGuildsMembersEntity,

    // Member - gets promoted
    {
      uuid: 'member-uuid-100004',
      characterId: 100004,
      characterGuid: 'promotedmember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 5, // Member
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2021-02-15'),
    } as CharactersGuildsMembersEntity,

    // Member - gets demoted
    {
      uuid: 'member-uuid-100005',
      characterId: 100005,
      characterGuid: 'demotedmember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 3, // Veteran
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2021-06-20'),
    } as CharactersGuildsMembersEntity,

    // Member - will leave guild
    {
      uuid: 'member-uuid-100006',
      characterId: 100006,
      characterGuid: 'leavingmember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 4, // Member
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2022-03-10'),
    } as CharactersGuildsMembersEntity,

    // Member - will also leave guild
    {
      uuid: 'member-uuid-100007',
      characterId: 100007,
      characterGuid: 'anotherleavingmember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 6, // Trial
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2023-11-01'),
    } as CharactersGuildsMembersEntity,

    // Stable member - no changes
    {
      uuid: 'member-uuid-100008',
      characterId: 100008,
      characterGuid: 'stablemember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 4, // Member
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-01-15'),
      createdAt: new Date('2022-08-15'),
    } as CharactersGuildsMembersEntity,
  ],
};

/**
 * Updated Banhammer guild roster state
 * - Old GM left, new GM promoted from officer
 * - Some members promoted/demoted
 * - Some members left
 * - New members joined
 */
export const guildUpdated: {
  guildEntity: GuildsEntity;
  members: CharactersGuildsMembersEntity[];
} = {
  guildEntity: {
    ...guildOriginal.guildEntity,
    membersCount: 9, // Changed member count
    updatedBy: OSINT_SOURCE.GUILD_ROSTER,
    lastModified: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01T14:30:00Z'),
  } as GuildsEntity,

  members: [
    // New Guild Master (was officer)
    {
      uuid: 'member-uuid-100002',
      characterId: 100002,
      characterGuid: 'newguildmaster@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: OSINT_GM_RANK, // 0 - promoted to GM
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2020-03-01'),
    } as CharactersGuildsMembersEntity,

    // Officer - stays same (no change)
    {
      uuid: 'member-uuid-100003',
      characterId: 100003,
      characterGuid: 'stableofficer@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 1, // Officer (no change)
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2020-05-10'),
    } as CharactersGuildsMembersEntity,

    // Member - promoted to officer
    {
      uuid: 'member-uuid-100004',
      characterId: 100004,
      characterGuid: 'promotedmember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 2, // Promoted from 5 to 2
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2021-02-15'),
    } as CharactersGuildsMembersEntity,

    // Member - demoted
    {
      uuid: 'member-uuid-100005',
      characterId: 100005,
      characterGuid: 'demotedmember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 6, // Demoted from 3 to 6
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2021-06-20'),
    } as CharactersGuildsMembersEntity,

    // Stable member - no changes
    {
      uuid: 'member-uuid-100008',
      characterId: 100008,
      characterGuid: 'stablemember@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 4, // Member (no change)
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2022-08-15'),
    } as CharactersGuildsMembersEntity,

    // NEW MEMBER 1 - Recently joined
    {
      uuid: 'member-uuid-200001',
      characterId: 200001,
      characterGuid: 'newmember1@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 6, // Trial
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2024-02-01'),
    } as CharactersGuildsMembersEntity,

    // NEW MEMBER 2 - Recently joined
    {
      uuid: 'member-uuid-200002',
      characterId: 200002,
      characterGuid: 'newmember2@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 5, // Member
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2024-01-28'),
    } as CharactersGuildsMembersEntity,

    // NEW MEMBER 3 - Alt character joined
    {
      uuid: 'member-uuid-200003',
      characterId: 200003,
      characterGuid: 'altcharacter@stormrage',
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      rank: 4, // Member
      realmId: 52,
      realmName: 'Stormrage',
      realm: 'stormrage',
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      lastModified: new Date('2024-02-01'),
      createdAt: new Date('2024-01-30'),
    } as CharactersGuildsMembersEntity,
  ],
};

/**
 * Helper functions to create roster maps as used in the worker
 */
export const createGuildOriginalRosterMap = (): Map<number, CharactersGuildsMembersEntity> => {
  const map = new Map<number, CharactersGuildsMembersEntity>();
  guildOriginal.members.forEach(member => {
    map.set(member.characterId, member);
  });
  return map;
};

export const createGuildUpdateRosterMap = (): Map<number, CharactersGuildsMembersEntity> => {
  const map = new Map<number, CharactersGuildsMembersEntity>();
  guildUpdated.members.forEach(member => {
    map.set(member.characterId, member);
  });
  return map;
};

/**
 * Calculated differences for testing
 */
export const rosterDifferences = {
  // Members that left (in original but not in updated)
  leftMembers: [100001, 100006, 100007], // oldguildmaster, leavingmember, anotherleavingmember

  // Members that joined (in updated but not in original)
  joinedMembers: [200001, 200002, 200003], // newmember1, newmember2, altcharacter

  // Members that had rank changes (intersection)
  rankChanges: [
    { characterId: 100002, oldRank: 1, newRank: 0 }, // newguildmaster: Officer -> GM
    { characterId: 100004, oldRank: 5, newRank: 2 }, // promotedmember: Member -> Officer
    { characterId: 100005, oldRank: 3, newRank: 6 }, // demotedmember: Veteran -> Trial
  ],

  // Members with no changes
  stableMembers: [100003, 100008], // stableofficer, stablemember
};

/**
 * Expected test results validation objects
 */
export const expectedWorkerResults = {
  intersectionResult: {
    action: expect.any(String),
    original: expect.any(Number),
    updated: expect.any(Number),
    logEntity: expect.objectContaining({
      characterGuid: expect.any(String),
      guildGuid: expect.stringMatching(/banhammer@stormrage/),
      action: expect.any(String),
    }),
  },

  joinResult: {
    action: 'JOIN',
    memberEntity: expect.objectContaining({
      guildGuid: 'banhammer@stormrage',
      guildId: 12345,
      characterId: expect.any(Number),
      rank: expect.any(Number),
    }),
    logEntity: expect.anything(),
    isGuildMaster: expect.any(Boolean),
  },

  leaveResult: {
    action: 'LEAVE',
    originalMember: expect.objectContaining({
      characterId: expect.any(Number),
      guildGuid: 'banhammer@stormrage',
      rank: expect.any(Number),
    }),
    logEntity: expect.anything(),
    isGuildMaster: expect.any(Boolean),
  },
};
