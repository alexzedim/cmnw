jest.mock('change-case', () => ({
  __esModule: true,
  default: {},
  camelCase: jest.fn((s: string) => s),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuildSummaryService } from './guild-summary.service';
import { KeysEntity } from '@app/pg';
import { BattleNetService, BattleNetRegion, IBattleNetClientConfig } from '@app/battle-net';

describe('GuildSummaryService', () => {
  let service: GuildSummaryService;
  let app: TestingModule;
  let config: IBattleNetClientConfig;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [HttpModule.register({ timeout: 30000, maxRedirects: 5 })],
      providers: [BattleNetService, GuildSummaryService, { provide: getRepositoryToken(KeysEntity), useValue: {} }],
    }).compile();

    service = app.get<GuildSummaryService>(GuildSummaryService);
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

  describe('getSummary', () => {
    it('should return guild summary from Blizzard API', async () => {
      const result = await service.getSummary('рак-гейминг', 'soulflayer', config);

      expect(result).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        realmId: expect.any(Number),
        realmName: expect.any(String),
        realm: expect.any(String),
        faction: expect.any(String),
        membersCount: expect.any(Number),
        lastModified: expect.any(Date),
        createdTimestamp: expect.any(Date),
      });
    });
  });
});
