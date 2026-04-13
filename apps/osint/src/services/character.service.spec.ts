import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CharacterService } from './character.service';
import { CharactersEntity, KeysEntity } from '@app/pg';
import { BattleNetService, BattleNetRegion, IBattleNetClientConfig } from '@app/battle-net';

describe('CharacterService', () => {
  let service: CharacterService;
  let app: TestingModule;
  let config: IBattleNetClientConfig;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [HttpModule.register({ timeout: 30000, maxRedirects: 5 })],
      providers: [
        BattleNetService,
        CharacterService,
        { provide: getRepositoryToken(KeysEntity), useValue: {} },
        { provide: getRepositoryToken(CharactersEntity), useValue: {} },
      ],
    }).compile();

    service = app.get<CharacterService>(CharacterService);
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

  describe('getStatus', () => {
    it('should return character status from Blizzard API', async () => {
      const result = await service.getStatus('инициатива', 'gordunni', config);

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        id: expect.any(Number),
        status: expect.any(String),
      });
    });
  });

  describe('getSummary', () => {
    it('should return character summary from Blizzard API', async () => {
      const result = await service.getSummary('сингараши', 'howling-fjord', config);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('achievementPoints');
      expect(result).toHaveProperty('averageItemLevel');
      expect(result).toHaveProperty('equippedItemLevel');
      expect(result).toHaveProperty('realmId');
      expect(result).toHaveProperty('realm');
      expect(result).toHaveProperty('guid');
    });
  });

  describe('getMedia', () => {
    it('should return character media from Blizzard API', async () => {
      const result = await service.getMedia('инициатива', 'gordunni', config);

      expect(result).toMatchObject({
        avatarImage: expect.any(String),
        mainImage: expect.any(String),
        insetImage: expect.any(String),
      });
    });
  });

  describe('getMountsCollection', () => {
    it('should return character mounts from Blizzard API', async () => {
      const result = await service.getMountsCollection('инициатива', 'gordunni', config);

      expect(result).toHaveProperty('mounts');
      expect(Array.isArray(result.mounts)).toBeTruthy();
      expect(result.mounts.length).toBeGreaterThan(0);
      result.mounts.forEach((mount) => {
        expect(mount).toHaveProperty('mount');
        expect(mount.mount).toHaveProperty('id');
        expect(mount).toHaveProperty('is_useable');
      });
    });
  });

  describe('getPetsCollection', () => {
    it('should return character pets from Blizzard API', async () => {
      const result = await service.getPetsCollection('инициатива', 'gordunni', config);

      expect(result).toHaveProperty('pets');
      expect(Array.isArray(result.pets)).toBeTruthy();
      expect(result.pets.length).toBeGreaterThan(0);
      result.pets.forEach((pet) => {
        expect(pet).toHaveProperty('species');
        expect(pet.species).toHaveProperty('id');
        expect(pet).toHaveProperty('level');
        expect(pet).toHaveProperty('id');
      });
    });
  });

  describe('getProfessions', () => {
    it('should return character professions from Blizzard API', async () => {
      const result = await service.getProfessions('инициатива', 'gordunni', config);

      expect(result).toHaveProperty('primaries');
      expect(result).toHaveProperty('secondaries');
      expect(Array.isArray(result.primaries)).toBeTruthy();
      expect(Array.isArray(result.secondaries)).toBeTruthy();
      expect(result).toHaveProperty('character');
    });
  });
});
