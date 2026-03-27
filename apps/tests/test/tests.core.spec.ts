import { Test, TestingModule } from '@nestjs/testing';
import { TestsCore } from '../src/tests.core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { KeysEntity } from '@app/pg';
import { BattleNetService } from '@app/battle-net';

describe('CORE', () => {
  let testsService: TestsCore;
  let app: TestingModule;
  jest.setTimeout(600_000);

  const mockBattleNetService = {
    createQueryOptions: jest.fn().mockReturnValue({ namespace: 'test', locale: 'en_GB', timeout: 30000 }),
    query: jest.fn().mockResolvedValue({}),
    getAllKeys: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(postgresConfig), TypeOrmModule.forFeature([KeysEntity])],
      controllers: [],
      providers: [TestsCore, { provide: BattleNetService, useValue: mockBattleNetService }],
    }).compile();

    testsService = app.get<TestsCore>(TestsCore);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API REQUEST', () => {
    it('get character logs', async () => {
      const result = await testsService.characterStats('Aanzz', 'Aanzz');
      console.log(result);
    });
  });

  describe('GET WCL KEYS', () => {
    it('get wcl keys', async () => {
      const result = await testsService.getWclKeys();
      console.log(result);
    });
  });
});
