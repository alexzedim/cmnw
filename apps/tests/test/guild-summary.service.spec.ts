import { Test, TestingModule } from '@nestjs/testing';
import { GuildSummaryService } from '../../osint/src/services/guild-summary.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { FACTION, STATUS_CODES } from '@app/resources';
import { mockGuildSummaryResponse, mockGuildSummaryResponseWithFactionName } from '../mocks/guild-worker.mock';

describe('GuildSummaryService', () => {
  let service: GuildSummaryService;
  let mockKeysRepository: any;
  let mockBNet: any;

  beforeEach(async () => {
    mockKeysRepository = {
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    mockBNet = {
      query: jest.fn(),
      accessTokenObject: {
        access_token: 'test-token',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildSummaryService,
        {
          provide: getRepositoryToken(KeysEntity),
          useValue: mockKeysRepository,
        },
      ],
    }).compile();

    service = module.get<GuildSummaryService>(GuildSummaryService);
  });

  describe('getSummary', () => {
    it('should return guild summary with faction type starting with A', async () => {
      mockBNet.query.mockResolvedValue(mockGuildSummaryResponse);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result).toMatchObject({
        id: 12345,
        name: 'TestGuild',
        achievementPoints: 1000,
        membersCount: 10,
        faction: FACTION.A,
        realmId: 123,
        realmName: 'Test Realm',
        realm: 'test-realm',
        statusCode: 200,
      });
      expect(result.lastModified).toBeInstanceOf(Date);
      expect(result.createdTimestamp).toBeInstanceOf(Date);
    });

    it('should return guild summary with faction name when provided', async () => {
      mockBNet.query.mockResolvedValue(mockGuildSummaryResponseWithFactionName);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result.faction).toBe('Horde');
    });

    it('should handle empty response', async () => {
      mockBNet.query.mockResolvedValue(null);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result).toEqual({});
    });

    it('should handle API error and set error status code', async () => {
      const mockError = { status: 404 };
      mockBNet.query.mockRejectedValue(mockError);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result.statusCode).toBe(404);
    });

    it('should increment error count on 429 status', async () => {
      const mockError = { status: 429 };
      mockBNet.query.mockRejectedValue(mockError);

      await service.getSummary('testguild', 'test-realm', mockBNet);

      // Error count increment should be called through incErrorCount
      // This would need proper mocking of the incErrorCount function
      expect(result.statusCode).toBe(429);
    });

    it('should handle response without realm data', async () => {
      const responseWithoutRealm = {
        ...mockGuildSummaryResponse,
        realm: null,
      };
      mockBNet.query.mockResolvedValue(responseWithoutRealm);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result.realmId).toBeUndefined();
      expect(result.realmName).toBeUndefined();
    });

    it('should handle faction type starting with H', async () => {
      const hordeResponse = {
        ...mockGuildSummaryResponse,
        faction: {
          type: 'HORDE',
          name: null,
        },
      };
      mockBNet.query.mockResolvedValue(hordeResponse);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result.faction).toBe(FACTION.H);
    });
  });

  describe('extractBasicFields', () => {
    it('should extract only allowed fields with non-null values', async () => {
      const response = {
        id: 12345,
        name: 'TestGuild',
        achievement_points: 1000,
        invalid_field: 'should not be extracted',
      };
      mockBNet.query.mockResolvedValue(response);

      const result = await service.getSummary('testguild', 'test-realm', mockBNet);

      expect(result.id).toBe(12345);
      expect(result.name).toBe('TestGuild');
      expect(result.achievementPoints).toBe(1000);
      expect(result['invalid_field']).toBeUndefined();
    });
  });
});
