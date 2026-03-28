jest.mock('@app/resources/dao/character.dao', () => ({
  characterAsGuildMember: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuildRosterService } from './guild-roster.service';
import { CharactersEntity, GuildsEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { BattleNetService, BattleNetRegion, IBattleNetClientConfig } from '@app/battle-net';

describe('GuildRosterService', () => {
  let service: GuildRosterService;
  let app: TestingModule;
  let config: IBattleNetClientConfig;

  const guildEntity = {
    guid: 'рак-гейминг@soulflayer',
    id: 12345,
    name: 'рак-гейминг',
    realm: 'soulflayer',
    realmId: 1302,
    realmName: 'Soulflayer',
    faction: 'Horde',
  } as unknown as GuildsEntity;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [HttpModule.register({ timeout: 30000, maxRedirects: 5 })],
      providers: [
        BattleNetService,
        GuildRosterService,
        { provide: 'BullQueue_osint.characters', useValue: { add: jest.fn() } },
        { provide: getRepositoryToken(KeysEntity), useValue: {} },
        { provide: getRepositoryToken(RealmsEntity), useValue: {} },
        { provide: getRepositoryToken(CharactersEntity), useValue: {} },
      ],
    }).compile();

    service = app.get<GuildRosterService>(GuildRosterService);
    const httpService = app.get(HttpService);

    const response = await httpService.axiosRef.post(
      'https://oauth.battle.net/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: {
          username: process.env.BATTLENET_CLIENT_ID!,
          password: process.env.BATTLENET_CLIENT_SECRET!,
        },
      },
    );

    config = {
      clientId: process.env.BATTLENET_CLIENT_ID!,
      clientSecret: process.env.BATTLENET_CLIENT_SECRET!,
      accessToken: response.data.access_token,
      region: BattleNetRegion.EU,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('fetchRoster', () => {
    it('should return guild roster from Blizzard API', async () => {
      const result = await service.fetchRoster(guildEntity, config);

      expect(result).toHaveProperty('members');
      expect(Array.isArray(result.members)).toBeTruthy();
      expect(result.members.length).toBeGreaterThan(0);
      expect(result.status).toContain('R');

      result.members.forEach((member) => {
        expect(member).toMatchObject({
          guid: expect.any(String),
          id: expect.any(Number),
          rank: expect.any(Number),
          level: expect.any(Number),
          isGM: expect.any(Boolean),
          realmId: expect.any(Number),
          realmSlug: expect.any(String),
        });
      });
    });
  });
});
