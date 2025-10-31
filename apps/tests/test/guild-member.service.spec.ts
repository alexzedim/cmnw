import { Test, TestingModule } from '@nestjs/testing';
import { GuildMemberService } from '../../osint/src/services/guild-member.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersGuildsLogsEntity,
} from '@app/pg';
import { ACTION_LOG, OSINT_GM_RANK, OSINT_SOURCE } from '@app/resources';
import {
  mockGuildData,
  mockCharacterData,
  mockGuildMasterData,
} from '../mocks/guild-worker.mock';

describe('GuildMemberService', () => {
  let service: GuildMemberService;
  let mockCharacterGuildsMembersRepository: any;
  let mockCharactersRepository: any;
  let mockCharactersGuildsLogsRepository: any;

  beforeEach(async () => {
    mockCharacterGuildsMembersRepository = {
      findBy: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockCharactersRepository = {
      update: jest.fn(),
      findOneBy: jest.fn(),
    };

    mockCharactersGuildsLogsRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildMemberService,
        {
          provide: getRepositoryToken(CharactersGuildsMembersEntity),
          useValue: mockCharacterGuildsMembersRepository,
        },
        {
          provide: getRepositoryToken(CharactersEntity),
          useValue: mockCharactersRepository,
        },
        {
          provide: getRepositoryToken(CharactersGuildsLogsEntity),
          useValue: mockCharactersGuildsLogsRepository,
        },
      ],
    }).compile();

    service = module.get<GuildMemberService>(GuildMemberService);
  });

  describe('processJoinMember - First Time Guild Indexing', () => {
    it('should NOT create JOIN log when guild is indexed for the first time', async () => {
      const isFirstTimeRosterIndexed = true;
      const guildMemberId = mockCharacterData.id;
      const updatedRoster = new Map([
        [guildMemberId, { ...mockCharacterData, rank: 2 }],
      ]);
      const rosterUpdatedAt = new Date();

      await service.processJoinMember(
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        updatedRoster,
        isFirstTimeRosterIndexed,
      );

      // Verify that NO JOIN log was created
      expect(mockCharactersGuildsLogsRepository.save).not.toHaveBeenCalled();

      // But membership should still be created
      expect(mockCharacterGuildsMembersRepository.save).toHaveBeenCalled();
      expect(mockCharactersRepository.update).toHaveBeenCalled();
    });

    it('should CREATE JOIN log when member joins an already-indexed guild', async () => {
      const isFirstTimeRosterIndexed = false;
      const guildMemberId = mockCharacterData.id;
      const updatedRoster = new Map([
        [guildMemberId, { ...mockCharacterData, rank: 2 }],
      ]);
      const rosterUpdatedAt = new Date();

      await service.processJoinMember(
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        updatedRoster,
        isFirstTimeRosterIndexed,
      );

      // Verify JOIN log WAS created
      expect(mockCharactersGuildsLogsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ACTION_LOG.JOIN,
          characterGuid: mockCharacterData.guid,
          guildGuid: mockGuildData.guid,
        }),
      );
    });

    it('should NOT create JOIN log for Guild Master even when guild is not first-time indexed', async () => {
      const isFirstTimeRosterIndexed = false;
      const guildMemberId = mockGuildMasterData.id;
      const updatedRoster = new Map([
        [guildMemberId, { ...mockGuildMasterData, rank: OSINT_GM_RANK }],
      ]);
      const rosterUpdatedAt = new Date();

      await service.processJoinMember(
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        updatedRoster,
        isFirstTimeRosterIndexed,
      );

      // GM should never have JOIN log
      expect(mockCharactersGuildsLogsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('processIntersectionMember - Rank Changes', () => {
    it('should log PROMOTE event when member rank decreases (lower number = higher rank)', async () => {
      const guildMemberId = mockCharacterData.id;
      const originalRoster = new Map([
        [
          guildMemberId,
          {
            ...mockCharacterData,
            rank: 5,
            characterGuid: mockCharacterData.guid,
          },
        ],
      ]);
      const updatedRoster = new Map([
        [guildMemberId, { ...mockCharacterData, rank: 3 }],
      ]);
      const rosterUpdatedAt = new Date();

      await service['processIntersectionMember'](
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        originalRoster,
        updatedRoster,
      );

      expect(mockCharactersGuildsLogsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ACTION_LOG.PROMOTE,
          original: '5',
          updated: '3',
        }),
      );
    });

    it('should log DEMOTE event when member rank increases (higher number = lower rank)', async () => {
      const guildMemberId = mockCharacterData.id;
      const originalRoster = new Map([
        [
          guildMemberId,
          {
            ...mockCharacterData,
            rank: 2,
            characterGuid: mockCharacterData.guid,
          },
        ],
      ]);
      const updatedRoster = new Map([
        [guildMemberId, { ...mockCharacterData, rank: 4 }],
      ]);
      const rosterUpdatedAt = new Date();

      await service['processIntersectionMember'](
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        originalRoster,
        updatedRoster,
      );

      expect(mockCharactersGuildsLogsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ACTION_LOG.DEMOTE,
          original: '2',
          updated: '4',
        }),
      );
    });

    it('should NOT log rank change if either member is Guild Master', async () => {
      const guildMemberId = mockGuildMasterData.id;
      const originalRoster = new Map([
        [
          guildMemberId,
          {
            ...mockGuildMasterData,
            rank: OSINT_GM_RANK,
            characterGuid: mockGuildMasterData.guid,
          },
        ],
      ]);
      const updatedRoster = new Map([
        [guildMemberId, { ...mockGuildMasterData, rank: 1 }],
      ]);
      const rosterUpdatedAt = new Date();

      await service['processIntersectionMember'](
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        originalRoster,
        updatedRoster,
      );

      // No log should be created for GM rank changes
      expect(mockCharactersGuildsLogsRepository.save).not.toHaveBeenCalled();
    });

    it('should NOT log if rank has not changed', async () => {
      const guildMemberId = mockCharacterData.id;
      const originalRoster = new Map([
        [
          guildMemberId,
          {
            ...mockCharacterData,
            rank: 3,
            characterGuid: mockCharacterData.guid,
          },
        ],
      ]);
      const updatedRoster = new Map([
        [guildMemberId, { ...mockCharacterData, rank: 3 }],
      ]);
      const rosterUpdatedAt = new Date();

      await service['processIntersectionMember'](
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        originalRoster,
        updatedRoster,
      );

      expect(mockCharactersGuildsLogsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('processLeaveMember', () => {
    it('should create LEAVE log for regular member', async () => {
      const guildMemberId = mockCharacterData.id;
      const originalRoster = new Map([
        [
          guildMemberId,
          {
            ...mockCharacterData,
            rank: 2,
            characterGuid: mockCharacterData.guid,
          },
        ],
      ]);
      const rosterUpdatedAt = new Date();

      await service['processLeaveMember'](
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        originalRoster,
      );

      expect(mockCharactersGuildsLogsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ACTION_LOG.LEAVE,
          characterGuid: mockCharacterData.guid,
          original: '2',
        }),
      );

      expect(mockCharacterGuildsMembersRepository.delete).toHaveBeenCalled();
      expect(mockCharactersRepository.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          guild: null,
          guildId: null,
          guildGuid: null,
          guildRank: null,
        }),
      );
    });

    it('should NOT create LEAVE log for Guild Master', async () => {
      const guildMemberId = mockGuildMasterData.id;
      const originalRoster = new Map([
        [
          guildMemberId,
          {
            ...mockGuildMasterData,
            rank: OSINT_GM_RANK,
            characterGuid: mockGuildMasterData.guid,
          },
        ],
      ]);
      const rosterUpdatedAt = new Date();

      await service['processLeaveMember'](
        mockGuildData as any,
        rosterUpdatedAt,
        guildMemberId,
        originalRoster,
      );

      // GM should not have LEAVE log, but membership should be removed
      expect(mockCharactersGuildsLogsRepository.save).not.toHaveBeenCalled();
      expect(mockCharacterGuildsMembersRepository.delete).toHaveBeenCalled();
    });
  });

  describe('updateRoster', () => {
    it('should return early if roster has no members', async () => {
      const roster = { members: [], updatedAt: new Date() };

      await service.updateRoster(mockGuildData as any, roster as any, false);

      expect(
        mockCharacterGuildsMembersRepository.findBy,
      ).not.toHaveBeenCalled();
    });
  });
});
