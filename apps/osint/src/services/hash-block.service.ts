import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';

import {
  HASH_BLOCK_ACTION,
  HashMessageDto,
  hashQueue,
  IHashMessageBase,
  MAX_CHARACTERS_PER_ACCOUNT,
} from '@app/resources';
import { CharactersEntity, HashBlockLogsEntity, HashBlockMembersEntity, HashBlocksEntity } from '@app/pg';

interface IMembershipWithContext extends HashBlockMembersEntity {
  blockHashValue: string;
  blockIsCollision: boolean;
}

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
    @InjectRepository(HashBlockMembersEntity)
    private readonly hashBlockMembersRepository: Repository<HashBlockMembersEntity>,
    @InjectRepository(HashBlockLogsEntity)
    private readonly hashBlockLogsRepository: Repository<HashBlockLogsEntity>,
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
      this.logger.error({
        logTag: 'ERROR',
        message: 'Hash block backfill failed',
        errorOrException: errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      });
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
      select: ['guid', 'hashA', 'hashB'],
    });
    if (!character) return;

    const membership = await this.loadMembershipWithContext(characterGuid);

    const hasNoMembership = !membership;
    const currentHashB = character.hashB ?? null;

    if (hasNoMembership) {
      await this.handleNoMembership(character, currentHashB, scannedAt);
      return;
    }

    const isAccurateBlock = !membership.blockIsCollision;
    if (isAccurateBlock) {
      await this.handleAccurateBlock(membership, character, scannedAt);
      return;
    }

    const stillMatchesAnchor = currentHashB === membership.blockHashValue;
    if (stillMatchesAnchor) {
      await this.handleAccurateBlock(membership, character, scannedAt);
      return;
    }

    await this.handleCollisionDivergence(membership, character, currentHashB, scannedAt);
  }

  private async handleNoMembership(
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    currentHashB: string | null,
    scannedAt: string,
  ): Promise<void> {
    const hasNoHashB = currentHashB === null;
    if (hasNoHashB) return;

    await this.dataSource.transaction(async (manager) => {
      const existingBlock = await this.findAccurateBlockByHashValue(manager, currentHashB);
      if (existingBlock) {
        await this.processJoin(manager, existingBlock, character, scannedAt);
        return;
      }
      await this.processGenesis(manager, character, scannedAt);
    });
  }

  private async handleAccurateBlock(
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
      await this.dataSource.transaction(async (manager) => {
        await manager.update(HashBlocksEntity, { id: membership.blockId }, { lastSeenAt: scannedDate });
      });
      return;
    }

    await this.dataSource.transaction(async (manager) => {
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
    });
  }

  private async handleCollisionDivergence(
    membership: IMembershipWithContext,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    currentHashB: string | null,
    scannedAt: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
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
    });
  }

  private async processGenesis(
    manager: EntityManager,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    scannedAt: string,
  ): Promise<void> {
    const scannedDate = new Date(scannedAt);
    const hashValue = character.hashB as string;

    const block = manager.create(HashBlocksEntity, {
      hashValue,
      charactersCount: 0,
      confirmedCount: 0,
      isCollision: false,
      firstSeenAt: scannedDate,
      lastSeenAt: scannedDate,
    });
    const savedBlock = await manager.save(HashBlocksEntity, block);

    const candidates = await manager.find(CharactersEntity, {
      where: { hashB: hashValue },
      select: ['guid', 'hashA', 'hashB'],
    });

    const nowDate = new Date();
    const members = candidates.map((candidate) =>
      manager.create(HashBlockMembersEntity, {
        blockId: savedBlock.id,
        characterGuid: candidate.guid,
        hashA: candidate.hashA ?? null,
        hashB: candidate.hashB ?? null,
        isConfirmed: false,
        joinedAt: nowDate,
      }),
    );
    await manager.save(HashBlockMembersEntity, members);

    await this.insertLog(manager, {
      blockId: savedBlock.id,
      characterGuid: null,
      hashValue,
      hashA: null,
      hashB: hashValue,
      action: HASH_BLOCK_ACTION.GENESIS,
      membersCount: members.length,
      scannedAt: scannedDate,
    });

    await this.recomputeBlockState(manager, savedBlock.id, scannedDate);
  }

  private async processJoin(
    manager: EntityManager,
    block: HashBlocksEntity,
    character: Pick<CharactersEntity, 'guid' | 'hashA' | 'hashB'>,
    scannedAt: string,
  ): Promise<void> {
    const scannedDate = new Date(scannedAt);
    const nowDate = new Date();

    const member = manager.create(HashBlockMembersEntity, {
      blockId: block.id,
      characterGuid: character.guid,
      hashA: character.hashA ?? null,
      hashB: character.hashB ?? null,
      isConfirmed: false,
      joinedAt: nowDate,
    });
    await manager.save(HashBlockMembersEntity, member);

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
    const members = await manager.find(HashBlockMembersEntity, {
      where: { blockId },
    });

    const count = members.length;
    const hashAFrequencies = new Map<string, number>();
    for (const member of members) {
      const hashA = member.hashA;
      if (!hashA) continue;
      hashAFrequencies.set(hashA, (hashAFrequencies.get(hashA) ?? 0) + 1);
    }

    const updates = members.map((member) => {
      const isConfirmed = member.hashA ? (hashAFrequencies.get(member.hashA) ?? 0) > 1 : false;
      return { id: member.id, isConfirmed };
    });
    for (const update of updates) {
      await manager.update(HashBlockMembersEntity, { id: update.id }, { isConfirmed: update.isConfirmed });
    }

    const confirmedCount = updates.filter((update) => update.isConfirmed).length;
    const isCollision = count > MAX_CHARACTERS_PER_ACCOUNT;

    await manager.update(
      HashBlocksEntity,
      { id: blockId },
      {
        charactersCount: count,
        confirmedCount,
        isCollision,
        lastSeenAt: scannedDate,
      },
    );
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

  private async loadMembershipWithContext(characterGuid: string): Promise<IMembershipWithContext | null> {
    const member = await this.hashBlockMembersRepository.findOneBy({ characterGuid });
    if (!member) return null;

    const block = await this.hashBlocksRepository.findOneBy({ id: member.blockId });
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

    let totalBlocks = 0;
    let totalMembers = 0;
    const scannedAt = new Date().toISOString();

    for (const group of hashBGroups) {
      const placeholderCharacter = await this.charactersRepository.findOne({
        where: { hashB: group.hashB },
        select: ['guid', 'hashA', 'hashB'],
      });
      if (!placeholderCharacter) continue;

      const existingBlock = await this.hashBlocksRepository.findOneBy({ hashValue: group.hashB });
      if (existingBlock) continue;

      await this.dataSource.transaction(async (manager) => {
        const candidates = await manager.find(CharactersEntity, {
          where: { hashB: group.hashB },
          select: ['guid', 'hashA', 'hashB'],
        });

        const scannedDate = new Date(scannedAt);
        const block = manager.create(HashBlocksEntity, {
          hashValue: group.hashB,
          charactersCount: 0,
          confirmedCount: 0,
          isCollision: candidates.length > MAX_CHARACTERS_PER_ACCOUNT,
          firstSeenAt: scannedDate,
          lastSeenAt: scannedDate,
        });
        const savedBlock = await manager.save(HashBlocksEntity, block);

        const nowDate = new Date();
        const members = candidates.map((candidate) =>
          manager.create(HashBlockMembersEntity, {
            blockId: savedBlock.id,
            characterGuid: candidate.guid,
            hashA: candidate.hashA ?? null,
            hashB: candidate.hashB ?? null,
            isConfirmed: false,
            joinedAt: nowDate,
          }),
        );
        await manager.save(HashBlockMembersEntity, members);

        await this.insertLog(manager, {
          blockId: savedBlock.id,
          characterGuid: null,
          hashValue: group.hashB,
          hashA: null,
          hashB: group.hashB,
          action: HASH_BLOCK_ACTION.GENESIS,
          membersCount: members.length,
          scannedAt: scannedDate,
        });

        await this.recomputeBlockState(manager, savedBlock.id, scannedDate);

        totalBlocks += 1;
        totalMembers += members.length;
      });
    }

    this.logger.log(`Backfill complete: ${totalBlocks} blocks, ${totalMembers} members`);
  }
}
