import { Test, TestingModule } from '@nestjs/testing';
import { TestsOsint } from '../src/tests.osint';
import {
  characterSummary,
  objectPet,
  objectMount,
  statusObj,
  guildMembersRosterObj,
  guildObj,
  professionObj,
  guildRosterObj,
  objectRealm,
  objectConnectedRealm,
} from '../mocks';
import { BattleNetService } from '@app/battle-net';

describe('OSINT', () => {
  let testsService: TestsOsint;
  let app: TestingModule;

  const mockOsintData: Record<string, any> = {
    '/data/wow/realm/howling-fjord': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      id: 1234,
      region: { key: { href: 'https://api.blizzard.com/' }, id: 1, name: 'Europe' },
      connected_realm: { href: 'https://api.blizzard.com/' },
      name: 'Howling Fjord',
      category: 'Standard',
      locale: 'en_GB',
      timezone: 'Europe/Paris',
      type: { type: 'REALM_TYPE_PVE', name: 'PvE' },
      is_tournament: false,
      slug: 'howling-fjord',
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
    '/data/wow/connected-realm/1615': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      id: 1615,
      has_queue: true,
      status: { type: 'UP', name: 'Up' },
      population: { type: 'FULL', name: 'Full' },
      realms: [
        {
          id: 1234,
          region: { key: { href: 'https://api.blizzard.com/' }, id: 1, name: 'Europe' },
          connected_realm: { href: 'https://api.blizzard.com/' },
          name: 'Realm',
          category: 'Standard',
          locale: 'en_GB',
          timezone: 'Europe/Paris',
          type: { type: 'REALM_TYPE_PVE', name: 'PvE' },
          is_tournament: false,
          slug: 'realm',
        },
      ],
      mythic_leaderboards: { href: 'https://api.blizzard.com/' },
      auctions: { href: 'https://api.blizzard.com/' },
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
    '/profile/wow/character/gordunni/инициатива': {
      id: 123456789,
      name: 'Инициатива',
      gender: { type: 'FEMALE', name: 'Female' },
      race: { id: 5, name: 'Undead', key: { href: 'https://api.blizzard.com/' } },
      character_class: { id: 1, name: 'Warrior', key: { href: 'https://api.blizzard.com/' } },
      active_spec: { id: 71, name: 'Arms', key: { href: 'https://api.blizzard.com/' } },
      realm: { id: 1234, name: 'Gordunni', slug: 'gordunni', key: { href: 'https://api.blizzard.com/' } },
      level: 70,
      experience: 0,
      achievement_points: 15000,
      achievements: { href: 'https://api.blizzard.com/' },
      titles: { href: 'https://api.blizzard.com/' },
      pvp_summary: { href: 'https://api.blizzard.com/' },
      encounters: { href: 'https://api.blizzard.com/' },
      media: { href: 'https://api.blizzard.com/' },
      last_login_timestamp: 1735689600000,
      average_item_level: 500,
      equipped_item_level: 485,
      specializations: { href: 'https://api.blizzard.com/' },
      statistics: { href: 'https://api.blizzard.com/' },
      mythic_keystone_profile: { href: 'https://api.blizzard.com/' },
      equipment: { href: 'https://api.blizzard.com/' },
      appearance: { href: 'https://api.blizzard.com/' },
      collections: { href: 'https://api.blizzard.com/' },
      reputations: { href: 'https://api.blizzard.com/' },
      quests: { href: 'https://api.blizzard.com/' },
      achievements_statistics: { href: 'https://api.blizzard.com/' },
      professions: { href: 'https://api.blizzard.com/' },
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
    '/profile/wow/character/gordunni/инициатива/status': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      id: 123456789,
      is_valid: true,
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
    '/profile/wow/character/gordunni/инициатива/collections/mounts': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      mounts: [
        {
          mount: { id: 1, name: 'Swift Spectral Tiger', key: { href: 'https://api.blizzard.com/' } },
          is_useable: true,
        },
        { mount: { id: 2, name: 'Cloud Serpent', key: { href: 'https://api.blizzard.com/' } }, is_useable: true },
      ],
    },
    '/profile/wow/character/gordunni/инициатива/collections/pets': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      pets: [
        { species: { id: 1, name: 'Catz' }, level: 25, id: 1 },
        { species: { id: 2, name: 'Dogz' }, level: 1, id: 2 },
      ],
    },
    '/profile/wow/character/gordunni/инициатива/professions': {
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
      primaries: [
        { profession: { id: 1, name: 'Blacksmithing', key: { href: 'https://api.blizzard.com/' } }, tiers: [] },
      ],
      secondaries: [{ profession: { id: 2, name: 'Cooking', key: { href: 'https://api.blizzard.com/' } }, tiers: [] }],
      character: { name: 'Инициатива', id: 123456789, realm: { name: 'Gordunni', id: 1234, slug: 'gordunni' } },
    },
    '/data/wow/guild/soulflayer/рак-гейминг': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      id: 987654321,
      name: 'Рак-Гейминг',
      achievement_points: 50000,
      member_count: 100,
      realm: { id: 5678, name: 'Soulflayer', slug: 'soulflayer' },
      roster: { href: 'https://api.blizzard.com/' },
      achievements: { href: 'https://api.blizzard.com/' },
      created_timestamp: 1609459200000,
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
    '/data/wow/guild/soulflayer/рак-гейминг/roster': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      guild: {
        key: { href: 'https://api.blizzard.com/' },
        name: 'Рак-Гейминг',
        id: 987654321,
        realm: { key: { href: 'https://api.blizzard.com/' }, name: 'Soulflayer', id: 5678, slug: 'soulflayer' },
        faction: { type: 'ALLIANCE', name: 'Alliance' },
      },
      members: [
        {
          character: {
            key: { href: 'https://api.blizzard.com/' },
            name: 'Member1',
            id: 1,
            level: 70,
            realm: { key: { href: 'https://api.blizzard.com/' }, id: 5678, slug: 'soulflayer' },
            playable_class: { key: { href: 'https://api.blizzard.com/' }, id: 1 },
            playable_race: { key: { href: 'https://api.blizzard.com/' }, id: 1 },
            faction: { type: 'ALLIANCE', name: 'Alliance' },
          },
          rank: 0,
        },
      ],
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
  };

  const mockBattleNetService = {
    createQueryOptions: jest.fn().mockReturnValue({ namespace: 'test', locale: 'en_GB', timeout: 30000 }),
    query: jest.fn().mockImplementation((path: string) => {
      const data = mockOsintData[path];
      return Promise.resolve(data || {});
    }),
    initialize: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [],
      providers: [TestsOsint, { provide: BattleNetService, useValue: mockBattleNetService }],
    }).compile();

    testsService = app.get<TestsOsint>(TestsOsint);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('realm', () => {
    it('return realm response', async () => {
      const response = await testsService.realm('howling-fjord');
      expect(response).toMatchObject(objectRealm);
    });
  });

  describe('connectedRealm', () => {
    it('return connected realm response', async () => {
      const response = await testsService.connectedRealm(1615);
      expect(response).toMatchObject(objectConnectedRealm);
    });
  });

  describe('summary', () => {
    it('return character summary response', async () => {
      const response = await testsService.summary('инициатива', 'gordunni');
      expect(response).toMatchObject(characterSummary);
    });
  });

  describe('mounts', () => {
    it('return character mount collection', async () => {
      const response = await testsService.mounts('инициатива', 'gordunni');
      expect(response).toHaveProperty('mounts');
      expect(Array.isArray(response.mounts)).toBeTruthy();
      response.mounts.map((mount) => expect(mount).toMatchObject(objectMount));
    });
  });

  describe('pets', () => {
    it('return character pets collection', async () => {
      const response = await testsService.pets('инициатива', 'gordunni');
      expect(response).toHaveProperty('pets');
      expect(Array.isArray(response.pets)).toBeTruthy();
      response.pets.map((pet) => expect(pet).toMatchObject(objectPet));
    });
  });

  describe('status', () => {
    it('return character profile status', async () => {
      const response = await testsService.status('инициатива', 'gordunni');
      expect(response).toMatchObject(statusObj);
    });
  });

  describe('professions', () => {
    it('return character professions summary', async () => {
      const response = await testsService.professions('инициатива', 'gordunni');
      expect(response).toMatchObject(professionObj);
    });
  });

  describe('guild', () => {
    it('return guild', async () => {
      const response = await testsService.guild('рак-гейминг', 'soulflayer');
      expect(response).toMatchObject(guildObj);
    });
  });

  describe('guildRoster', () => {
    it('return guild roster', async () => {
      const response = await testsService.guildRoster('рак-гейминг', 'soulflayer');
      expect(response).toHaveProperty('members');
      expect(Array.isArray(response.members)).toBeTruthy();
      expect(response).toMatchObject(guildRosterObj);
      expect(['Alliance', 'Horde']).toContain(response.guild.faction.name);
      response.members.map((member) => expect(member).toMatchObject(guildMembersRosterObj));
    });
  });
});
