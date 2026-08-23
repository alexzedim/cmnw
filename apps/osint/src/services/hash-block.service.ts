import { randomUUID } from 'node:crypto';
import { formatServiceErrorLog } from '@app/logger';
import { CharactersEntity, HashBlockLogsEntity, HashBlockMembersEntity, HashBlocksEntity } from '@app/pg';
import {
  HASH_BLOCK_ACTION,
  HashMessageDto,
  hashQueue,
  type IHashBlockMemberInsert,
  type IHashMessageBase,
  type IMembershipWithContext,
  MAX_CHARACTERS_PER_ACCOUNT,
} from '@app/resources';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import type { DataSource, EntityManager, Repository } from 'typeorm';

@Injectable()
export class HashBlockService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HashBlockService.name, { timestamp: true });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(HashBlocksEntity)
    private readonly hashBlocksRepository: Repository<HashBlocksEntity>,
    @InjectQueue(hashQueue.name)
    private readonly hashQueue: Queue<IHashMessageBase>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const blockCount = await this.hashBlocksRepository.count();
      if (blockCount > 0) return;

      this.logger.log('Hash blocks empty — running initial backfill...');
      await this.runBackfill();
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'onApplicationBootstrap',
          'hash-backfill',
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
    }
  }

  async enqueueHashUpdate(characterGuid: string): Promise<void> {
    const hasGuid = Boolean(characterGuid);
    if (!hasGuid) return;

    const dto = HashMessageDto.create({ characterGuid, scannedAt: new Date().toISOString() });
    await this.hashQueue.add(dto.name, dto.data, dto.opts);
  }

  async reconcileCharacter(characterGuid: string, scannedAt: string): Promise<void> {
    const character = await this.charactersRepository.findOne({
      where: { guid: characterGuid },
      select: { guid: true, hashA: true, hashB: true },
    });
    if (!character) return;

    const membership = await this.loadMembershipWithContext(this.dataSource.manager, characterGuid);
    const currentHashB = character.hashB ?? null;
    const lockKeys = this.resolveLockKeys(membership?.blockHashValue ?? null, currentHashB);

    await this.dataSource.transaction(async (manager) => {
      await this.acquireAdvisoryLocks(manager, lockKeys);

      const lockedCharacter = await manager.findOne(CharactersEntity, {
        where: { guid: characterGuid },
        select: { guid: true, hashA: true, hashB: true },
      });
      if (!lockedCharacter) return;

      const lockedMembership = await this.loadMembershipWithContext(manager, characterGuid);
      const lockedHashB = lockedCharacter.hashB ?? null;

      if (!lockedMembership) {
        await this.handleNoMembership(manager, lockedCharacter, lockedHashB, scannedAt);
        return;
      }

      const isAccurateBlock = !lockedMembership.blockIsCollision;
      const stillMatchesAnchor = lockedHashB === lockedMembership.blockHashValue;

      if (isAccurateBlock || stillMatchesAnchor) {
        await this.handleAccurateBlock(manager, lockedMembership, lockedCharacter, scannedAt);
        return;
      }

      await this.handleCollisionDivergence(manager, lockedMembership, lockedCharacter, lockedHashB, scannedAt);
    });
  }

  private resolveLockKeys(blockHashValue: string | null, currentHashB: string | null): string[] {
    const keys = [blockHashValue, currentHashB].filter((value): value is string => Boolean(value));
    return Array.from(new Set(keys)).sort();
  }

  private async acquireAdvisoryLocks(manager: EntityManager, hashValues: string[]): Promise<void> {
    for (const hashValue of hashValues) {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`hash:${hashValue}`]);
    }
  }

  private async handleNoMembership(
    manager: EntityManager,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    currentHashB: string | null,
    scannedAt: string,
  ): Promise<void> {
    const hasNoHashB = currentHashB === null;
    if (hasNoHashB) return;

    const existingBlock = await this.findAccurateBlockByHashValue(manager, currentHashB);
    if (existingBlock) {
      await this.processJoin(manager, existingBlock, character, scannedAt);
      return;
    }
    await this.processGenesis(manager, character, scannedAt);
  }

  private async handleAccurateBlock(
    manager: EntityManager,
    membership: IMembershipWithContext,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    scannedAt: string,
  ): Promise<void> {
    const scannedDate = new Date(scannedAt);
    const newHashA = character.hashA ?? null;
    const newHashB = character.hashB ?? null;
    const isHashAChanged = membership.hashA !== newHashA;
    const isHashBChanged = membership.hashB !== newHashB;
    const hasNoChange = !isHashAChanged && !isHashBChanged;

    if (hasNoChange) {
      await manager.update(HashBlocksEntity, { id: membership.blockId }, { lastSeenAt: scannedDate });
      return;
    }

    await manager.update(HashBlockMembersEntity, { id: membership.id }, { hashA: newHashA, hashB: newHashB });

    if (isHashAChanged) {
      await this.insertLog(manager, {
        blockId: membership.blockId,
        characterGuid: character.guid,
        hashValue: membership.blockHashValue,
        hashA: newHashA,
        hashB: newHashB,
        action: HASH_BLOCK_ACTION.HASH_A_CHANGE,
        original: membership.hashA ?? null,
        updated: newHashA ?? null,
        scannedAt: scannedDate,
      });
    }

    if (isHashBChanged) {
      await this.insertLog(manager, {
        blockId: membership.blockId,
        characterGuid: character.guid,
        hashValue: membership.blockHashValue,
        hashA: newHashA,
        hashB: newHashB,
        action: HASH_BLOCK_ACTION.HASH_B_CHANGE,
        original: membership.hashB ?? null,
        updated: newHashB ?? null,
        scannedAt: scannedDate,
      });
    }

    await this.recomputeBlockState(manager, membership.blockId, scannedDate);
  }

  private async handleCollisionDivergence(
    manager: EntityManager,
    membership: IMembershipWithContext,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    currentHashB: string | null,
    scannedAt: string,
  ): Promise<void> {
    await this.processLeave(
      manager,
      membership,
      scannedAt,
      HASH_BLOCK_ACTION.MIGRATE,
      membership.blockHashValue,
      currentHashB,
    );

    if (currentHashB === null) return;

    const existingBlock = await this.findAccurateBlockByHashValue(manager, currentHashB);
    if (existingBlock) {
      await this.processJoin(manager, existingBlock, character, scannedAt);
      return;
    }
    await this.processGenesis(manager, character, scannedAt);
  }

  private async processGenesis(
    manager: EntityManager,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    scannedAt: string,
  ): Promise<void> {
    const scannedDate = new Date(scannedAt);
    const hashValue = character.hashB as string;

    const blockId = await this.insertBlockOrGetExisting(manager, hashValue, scannedDate);

    const candidates = await manager.find(CharactersEntity, {
      where: { hashB: hashValue },
      select: { guid: true, hashA: true, hashB: true },
    });

    const nowDate = new Date();
    const members: IHashBlockMemberInsert[] = candidates.map((candidate) => ({
      blockId,
      characterGuid: candidate.guid,
      hashA: candidate.hashA ?? null,
      hashB: candidate.hashB ?? null,
      isConfirmed: false,
      joinedAt: nowDate,
    }));
    await this.insertMembersOrIgnore(manager, members);

    await this.insertLog(manager, {
      blockId,
      characterGuid: null,
      hashValue,
      hashA: null,
      hashB: hashValue,
      action: HASH_BLOCK_ACTION.GENESIS,
      membersCount: members.length,
      scannedAt: scannedDate,
    });

    await this.recomputeBlockState(manager, blockId, scannedDate);
  }

  private async processJoin(
    manager: EntityManager,
    block: HashBlocksEntity,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    scannedAt: string,
  ): Promise<void> {
    const scannedDate = new Date(scannedAt);

    const existingMember = await manager.findOne(HashBlockMembersEntity, {
      where: { characterGuid: character.guid },
      select: { id: true },
    });
    const isAlreadyMember = Boolean(existingMember);
    if (isAlreadyMember) return;

    const nowDate = new Date();
    await this.insertMembersOrIgnore(manager, [
      {
        blockId: block.id,
        characterGuid: character.guid,
        hashA: character.hashA ?? null,
        hashB: character.hashB ?? null,
        isConfirmed: false,
        joinedAt: nowDate,
      },
    ]);

    await this.insertLog(manager, {
      blockId: block.id,
      characterGuid: character.guid,
      hashValue: block.hashValue,
      hashA: character.hashA ?? null,
      hashB: character.hashB ?? null,
      action: HASH_BLOCK_ACTION.JOIN,
      scannedAt: scannedDate,
    });

    await this.recomputeBlockState(manager, block.id, scannedDate);
  }

  private async processLeave(
    manager: EntityManager,
    membership: HashBlockMembersEntity,
    scannedAt: string,
    action: HASH_BLOCK_ACTION,
    original: string | null,
    updated: string | null,
  ): Promise<void> {
    const scannedDate = new Date(scannedAt);

    await manager.delete(HashBlockMembersEntity, { id: membership.id });

    await this.insertLog(manager, {
      blockId: membership.blockId,
      characterGuid: membership.characterGuid,
      hashValue: original,
      hashA: membership.hashA ?? null,
      hashB: membership.hashB ?? null,
      action,
      original,
      updated,
      scannedAt: scannedDate,
    });

    await this.recomputeBlockState(manager, membership.blockId, scannedDate);
  }

  private async recomputeBlockState(manager: EntityManager, blockId: string, scannedDate: Date): Promise<void> {
    await manager.query(
      `UPDATE hash_block_members AS m
         SET is_confirmed = sub.is_confirmed
        FROM (
          SELECT id,
                 CASE WHEN hash_a IS NULL THEN false
                      ELSE COUNT(*) OVER (PARTITION BY hash_a) > 1
                 END AS is_confirmed
            FROM hash_block_members
           WHERE block_id = $1
        ) AS sub
       WHERE m.id = sub.id
         AND m.is_confirmed IS DISTINCT FROM sub.is_confirmed`,
      [blockId],
    );

    const counts: Array<{ characters_count: number; confirmed_count: number }> = await manager.query(
      `SELECT COUNT(*)::int AS characters_count,
              COUNT(*) FILTER (WHERE is_confirmed)::int AS confirmed_count
         FROM hash_block_members
        WHERE block_id = $1`,
      [blockId],
    );

    const charactersCount = counts[0]?.characters_count ?? 0;
    const confirmedCount = counts[0]?.confirmed_count ?? 0;

    await manager.update(
      HashBlocksEntity,
      { id: blockId },
      {
        charactersCount,
        confirmedCount,
        isCollision: charactersCount > MAX_CHARACTERS_PER_ACCOUNT,
        lastSeenAt: scannedDate,
      },
    );
  }

  private async insertMembersOrIgnore(manager: EntityManager, members: IHashBlockMemberInsert[]): Promise<void> {
    if (members.length === 0) return;

    await manager
      .createQueryBuilder()
      .insert()
      .into(HashBlockMembersEntity)
      .values(members.map((member) => ({ id: randomUUID(), ...member })))
      .orIgnore()
      .execute();
  }

  private async insertBlockOrGetExisting(
    manager: EntityManager,
    hashValue: string,
    scannedDate: Date,
  ): Promise<string> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(HashBlocksEntity)
      .values({
        id: randomUUID(),
        hashValue,
        charactersCount: 0,
        confirmedCount: 0,
        isCollision: false,
        firstSeenAt: scannedDate,
        lastSeenAt: scannedDate,
      })
      .orIgnore()
      .execute();

    const block = await manager.findOne(HashBlocksEntity, {
      where: { hashValue },
      select: { id: true },
    });
    if (!block) {
      throw new Error(`Hash block not found after insert: ${hashValue}`);
    }
    return block.id;
  }

  private async insertLog(
    manager: EntityManager,
    entry: {
      blockId: string | null;
      characterGuid: string | null;
      hashValue: string | null;
      hashA: string | null;
      hashB: string | null;
      action: HASH_BLOCK_ACTION;
      original?: string | null;
      updated?: string | null;
      membersCount?: number;
      scannedAt: Date;
    },
  ): Promise<void> {
    const log = manager.create(HashBlockLogsEntity, {
      blockId: entry.blockId,
      characterGuid: entry.characterGuid,
      hashValue: entry.hashValue,
      hashA: entry.hashA,
      hashB: entry.hashB,
      action: entry.action,
      original: entry.original ?? null,
      updated: entry.updated ?? null,
      membersCount: entry.membersCount ?? null,
      scannedAt: entry.scannedAt,
    });
    await manager.save(HashBlockLogsEntity, log);
  }

  private async findAccurateBlockByHashValue(
    manager: EntityManager,
    hashValue: string,
  ): Promise<HashBlocksEntity | null> {
    return manager.findOne(HashBlocksEntity, {
      where: { hashValue, isCollision: false },
    });
  }

  private async loadMembershipWithContext(
    manager: EntityManager,
    characterGuid: string,
  ): Promise<IMembershipWithContext | null> {
    const member = await manager.findOne(HashBlockMembersEntity, { where: { characterGuid } });
    if (!member) return null;

    const block = await manager.findOne(HashBlocksEntity, { where: { id: member.blockId } });
    if (!block) return null;

    return {
      ...member,
      blockHashValue: block.hashValue,
      blockIsCollision: block.isCollision,
    };
  }

  private async runBackfill(): Promise<void> {
    const hashBGroups = await this.charactersRepository
      .createQueryBuilder('c')
      .select('c.hash_b', 'hashB')
      .addSelect('COUNT(*)', 'count')
      .where('c.hash_b IS NOT NULL')
      .groupBy('c.hash_b')
      .getRawMany<{ hashB: string; count: string }>();

    if (hashBGroups.length === 0) {
      this.logger.log('Backfill: no characters with hashB found — nothing to do');
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let isBackfillLockHeld = false;

    try {
      const lockResult: Array<{ acquired: boolean }> = await queryRunner.query(
        'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired',
        ['hash-backfill'],
      );
      isBackfillLockHeld = Boolean(lockResult[0]?.acquired);

      if (!isBackfillLockHeld) {
        this.logger.log('Backfill: already running on another replica — skipping');
        return;
      }

      let totalBlocks = 0;
      let totalMembers = 0;
      const scannedAt = new Date().toISOString();

      for (const group of hashBGroups) {
        const result = await this.backfillGroup(group.hashB, scannedAt);
        if (!result) continue;
        totalBlocks += 1;
        totalMembers += result.membersCount;
      }

      this.logger.log(`Backfill complete: ${totalBlocks} blocks, ${totalMembers} members`);
    } finally {
      if (isBackfillLockHeld) {
        try {
          await queryRunner.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', ['hash-backfill']);
        } catch {
          // Connection dropped — the session lock dies with it
        }
      }
      await queryRunner.release();
    }
  }

  private async backfillGroup(hashValue: string, scannedAt: string): Promise<{ membersCount: number } | null> {
    return this.dataSource.transaction(async (manager) => {
      await this.acquireAdvisoryLocks(manager, [hashValue]);

      const existingBlock = await manager.findOne(HashBlocksEntity, {
        where: { hashValue },
        select: { id: true },
      });
      if (existingBlock) return null;

      const scannedDate = new Date(scannedAt);
      const blockId = await this.insertBlockOrGetExisting(manager, hashValue, scannedDate);

      const candidates = await manager.find(CharactersEntity, {
        where: { hashB: hashValue },
        select: { guid: true, hashA: true, hashB: true },
      });

      const nowDate = new Date();
      const members: IHashBlockMemberInsert[] = candidates.map((candidate) => ({
        blockId,
        characterGuid: candidate.guid,
        hashA: candidate.hashA ?? null,
        hashB: candidate.hashB ?? null,
        isConfirmed: false,
        joinedAt: nowDate,
      }));
      await this.insertMembersOrIgnore(manager, members);

      await this.insertLog(manager, {
        blockId,
        characterGuid: null,
        hashValue,
        hashA: null,
        hashB: hashValue,
        action: HASH_BLOCK_ACTION.GENESIS,
        membersCount: members.length,
        scannedAt: scannedDate,
      });

      await this.recomputeBlockState(manager, blockId, scannedDate);

      return { membersCount: members.length };
    });
  }
}
