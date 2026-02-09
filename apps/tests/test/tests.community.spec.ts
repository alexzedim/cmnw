import { Test } from '@nestjs/testing';
import { TestsCommunity } from '../src/tests.community';
import { osintConfig } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';
import { raidCharacter } from '../mocks';

describe.skip('COMMUNITY', () => {
  let testsService: TestsCommunity;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const [app] = await Promise.all([
      Test.createTestingModule({
        imports: [HttpModule],
        controllers: [],
        providers: [TestsCommunity],
      }).compile(),
    ]);

    testsService = app.get<TestsCommunity>(TestsCommunity);
  });

  describe('WCL-PAGE-LOGS', () => {
    it('page response', async () => {
      const response = await testsService.getLogsFromPage(osintConfig, 417, 1);

      expect(Array.isArray(response)).toBeTruthy();
      response.map((logId) => expect(logId).toEqual(expect.any(String)));
    });
  });

  describe('WCL-CHARACTER-RAID-LOGS', () => {
    it('logs response', async () => {
      const raidCharacters = await testsService.getCharactersFromLogs(
        '',
        '7M98VAxrmyKvZhqd',
      );

      expect(Array.isArray(raidCharacters)).toBeTruthy();
      raidCharacters.map((character) =>
        expect(character).toMatchObject(raidCharacter),
      );
    });
  });
});
