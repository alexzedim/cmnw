import { Test, TestingModule } from '@nestjs/testing';
import { TestsWorker } from '../src/tests.worker';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import {
  CharactersGuildsMembersEntity,
  CharactersGuildsLogsEntity,
} from '@app/pg';
import { guildOriginal, guildUpdated } from '../mocks';
import { ACTION_LOG, OSINT_GM_RANK } from '@app/resources';

describe('WORKER', () => {
  let testsService: TestsWorker;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(postgresConfig),
        TypeOrmModule.forFeature([
          CharactersGuildsLogsEntity,
          CharactersGuildsMembersEntity,
        ]),
      ],
      controllers: [],
      providers: [TestsWorker],
    }).compile();

    testsService = app.get<TestsWorker>(TestsWorker);
  });

  describe('INTERSECTION', () => {
    it('should process member promotion correctly', async () => {
      // Setup: Member gets promoted from rank 5 to rank 2
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();
      const updatedRoster = new Map<number, CharactersGuildsMembersEntity>();

      // Add original member (rank 5)
      const originalMember = guildOriginal.members.find(
        (member) => member.characterGuid === 'promotedmember@stormrage',
      );
      originalRoster.set(originalMember.characterId, originalMember);

      // Add updated member (rank 2)
      const updatedMember = guildUpdated.members.find(
        (member) => member.characterGuid === 'promotedmember@stormrage',
      );
      updatedRoster.set(updatedMember.characterId, updatedMember);

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processIntersectionMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        originalMember.characterId,
        originalRoster,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.PROMOTE);
      expect(result.original).toBe(5); // Original rank
      expect(result.updated).toBe(2); // New rank
      expect(result.logEntity).toBeDefined();
      expect(result.logEntity.characterGuid).toBe('promotedmember@stormrage');
      expect(result.logEntity.action).toBe(ACTION_LOG.PROMOTE);
      expect(result.logEntity.original).toBe('5');
      expect(result.logEntity.updated).toBe('2');
    });

    it('should process member demotion correctly', async () => {
      // Setup: Member gets demoted from rank 3 to rank 6
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();
      const updatedRoster = new Map<number, any>();

      // Add original member (rank 3)
      const originalMember = guildOriginal.members.find(
        (member) => member.characterGuid === 'demotedmember@stormrage',
      );
      originalRoster.set(originalMember.characterId, originalMember);

      // Add updated member (rank 6)
      const updatedMember = guildUpdated.members.find(
        (member) => member.characterGuid === 'demotedmember@stormrage',
      );
      updatedRoster.set(updatedMember.characterId, updatedMember);

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processIntersectionMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        originalMember.characterId,
        originalRoster,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.DEMOTE);
      expect(result.original).toBe(3); // Original rank
      expect(result.updated).toBe(6); // New rank
      expect(result.logEntity).toBeDefined();
      expect(result.logEntity.characterGuid).toBe('demotedmember@stormrage');
      expect(result.logEntity.action).toBe(ACTION_LOG.DEMOTE);
      expect(result.logEntity.original).toBe('3');
      expect(result.logEntity.updated).toBe('6');
    });

    it.skip('should skip guild master rank changes', async () => {
      // Setup: Guild master change (should be skipped)
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();
      const updatedRoster = new Map<number, CharactersGuildsMembersEntity>();

      // Add original guild master (rank 0)
      const originalGM = guildOriginal.members.find(
        (member) => member.characterGuid === 'oldguildmaster@stormrage',
      );
      originalRoster.set(originalGM.characterId, originalGM);

      // Create a mock updated version where GM gets demoted to rank 1
      const updatedGM = {
        ...originalGM,
        rank: 1, // Demoted from GM
        id: originalGM.characterId,
        guid: originalGM.characterGuid,
      };
      updatedRoster.set(originalGM.characterId, updatedGM);

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processIntersectionMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        originalGM.characterId,
        originalRoster,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe('guild_master_skip');
    });

    it('should return no_change when ranks are identical', async () => {
      // Setup: Member with no rank change
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();
      const updatedRoster = new Map<number, any>();

      // Add stable member (no rank change)
      const stableMember = guildOriginal.members.find(
        (member) => member.characterGuid === 'stablemember@stormrage',
      );
      originalRoster.set(stableMember.characterId, stableMember);

      // Add same member in updated roster (same rank)
      const updatedStableMember = guildUpdated.members.find(
        (member) => member.characterGuid === 'stablemember@stormrage',
      );
      updatedRoster.set(updatedStableMember.characterId, {
        ...updatedStableMember,
        id: updatedStableMember.characterId,
        guid: updatedStableMember.characterGuid,
      });

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processIntersectionMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        stableMember.characterId,
        originalRoster,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe('no_change');
    });
  });

  describe('JOIN', () => {
    it('should process new regular member joining correctly', async () => {
      // Setup: New trial member joining
      const updatedRoster = new Map<number, any>();

      // Add new member from updated roster
      const newMember = guildUpdated.members.find(
        (member) => member.characterGuid === 'newmember1@stormrage',
      );
      updatedRoster.set(newMember.characterId, {
        id: newMember.characterId,
        guid: newMember.characterGuid,
        rank: newMember.rank,
      });

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processJoinMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        newMember.characterId,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.JOIN);
      expect(result.isGuildMaster).toBe(false);
      expect(result.memberEntity).toBeDefined();
      expect(result.memberEntity.characterGuid).toBe('newmember1@stormrage');
      expect(result.memberEntity.guildGuid).toBe('banhammer@stormrage');
      expect(result.memberEntity.rank).toBe(6); // Trial rank
      expect(result.logEntity).toBeDefined();
      expect(result.logEntity.characterGuid).toBe('newmember1@stormrage');
      expect(result.logEntity.action).toBe(ACTION_LOG.JOIN);
      expect(result.logEntity.updated).toBe('6');
    });

    it('should process new member joining with higher rank correctly', async () => {
      // Setup: New member joining with Member rank
      const updatedRoster = new Map<number, any>();

      // Add new member from updated roster
      const newMember = guildUpdated.members.find(
        (member) => member.characterGuid === 'newmember2@stormrage',
      );
      updatedRoster.set(newMember.characterId, {
        id: newMember.characterId,
        guid: newMember.characterGuid,
        rank: newMember.rank,
      });

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processJoinMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        newMember.characterId,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.JOIN);
      expect(result.isGuildMaster).toBe(false);
      expect(result.memberEntity).toBeDefined();
      expect(result.memberEntity.characterGuid).toBe('newmember2@stormrage');
      expect(result.memberEntity.rank).toBe(5); // Member rank
      expect(result.logEntity).toBeDefined();
      expect(result.logEntity.action).toBe(ACTION_LOG.JOIN);
    });

    it('should process guild master joining without creating log', async () => {
      // Setup: New guild master joining (hypothetical scenario)
      const updatedRoster = new Map<number, any>();

      // Create mock GM joining data
      const mockGMId = 999999;
      updatedRoster.set(mockGMId, {
        id: mockGMId,
        guid: 'newguildmaster@stormrage',
        rank: OSINT_GM_RANK, // Guild Master rank (0)
      });

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processJoinMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        mockGMId,
        updatedRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.JOIN);
      expect(result.isGuildMaster).toBe(true);
      expect(result.memberEntity).toBeDefined();
      expect(result.memberEntity.rank).toBe(OSINT_GM_RANK);
      expect(result.logEntity).toBeNull(); // No log for GM
    });
  });

  describe('LEAVE', () => {
    it('should process regular member leaving correctly', async () => {
      // Setup: Regular member leaving guild
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();

      // Add leaving member from original roster
      const leavingMember = guildOriginal.members.find(
        (member) => member.characterGuid === 'leavingmember@stormrage',
      );
      originalRoster.set(leavingMember.characterId, leavingMember);

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processLeaveMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        leavingMember.characterId,
        originalRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.LEAVE);
      expect(result.isGuildMaster).toBe(false);
      expect(result.originalMember).toBeDefined();
      expect(result.originalMember.characterGuid).toBe(
        'leavingmember@stormrage',
      );
      expect(result.originalMember.rank).toBe(4); // Member rank
      expect(result.logEntity).toBeDefined();
      expect(result.logEntity.characterGuid).toBe('leavingmember@stormrage');
      expect(result.logEntity.action).toBe(ACTION_LOG.LEAVE);
      expect(result.logEntity.original).toBe('4');
    });

    it('should process trial member leaving correctly', async () => {
      // Setup: Trial member leaving guild
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();

      // Add another leaving member (trial rank)
      const leavingTrialMember = guildOriginal.members.find(
        (member) => member.characterGuid === 'anotherleavingmember@stormrage',
      );
      originalRoster.set(leavingTrialMember.characterId, leavingTrialMember);

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processLeaveMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        leavingTrialMember.characterId,
        originalRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.LEAVE);
      expect(result.isGuildMaster).toBe(false);
      expect(result.originalMember).toBeDefined();
      expect(result.originalMember.characterGuid).toBe(
        'anotherleavingmember@stormrage',
      );
      expect(result.originalMember.rank).toBe(6); // Trial rank
      expect(result.logEntity).toBeDefined();
      expect(result.logEntity.action).toBe(ACTION_LOG.LEAVE);
      expect(result.logEntity.original).toBe('6');
    });

    it('should process guild master leaving without creating log', async () => {
      // Setup: Guild master leaving (hypothetical scenario)
      const originalRoster = new Map<number, CharactersGuildsMembersEntity>();

      // Add old guild master as leaving
      const oldGM = guildOriginal.members.find(
        (member) => member.characterGuid === 'oldguildmaster@stormrage',
      );
      originalRoster.set(oldGM.characterId, oldGM);

      // Mock roster data
      const rosterUpdateAt = new Date('2024-02-01T14:30:00Z');

      // Execute
      const result = await testsService.processLeaveMember(
        guildUpdated.guildEntity,
        rosterUpdateAt,
        oldGM.characterId,
        originalRoster,
      );

      // Assertions
      expect(result.action).toBe(ACTION_LOG.LEAVE);
      expect(result.isGuildMaster).toBe(true);
      expect(result.originalMember).toBeDefined();
      expect(result.originalMember.rank).toBe(OSINT_GM_RANK);
      expect(result.logEntity).toBeNull(); // No log for GM leaving
    });
  });
});
