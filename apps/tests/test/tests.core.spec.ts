import { Test, TestingModule } from '@nestjs/testing';
import { TestsCore } from '../src/tests.core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { KeysEntity } from '@app/pg';

describe('CORE', () => {
  let testsService: TestsCore;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(postgresConfig),
        TypeOrmModule.forFeature([KeysEntity]),
      ],
      controllers: [],
      providers: [TestsCore],
    }).compile();

    testsService = app.get<TestsCore>(TestsCore);
  });

  describe('API REQUEST', () => {
    it('get character logs', async () => {
      const result = await testsService.statistics('Aanzz', 'Aanzz');
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
