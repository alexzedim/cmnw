import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HashBlockLogsEntity, HashBlockMembersEntity, HashBlocksEntity } from '@app/pg';

@Injectable()
export class BlockOsintService {
  constructor(
    @InjectRepository(HashBlocksEntity)
    private readonly hashBlocksRepository: Repository<HashBlocksEntity>,
    @InjectRepository(HashBlockMembersEntity)
    private readonly hashBlockMembersRepository: Repository<HashBlockMembersEntity>,
    @InjectRepository(HashBlockLogsEntity)
    private readonly hashBlockLogsRepository: Repository<HashBlockLogsEntity>,
  ) {}

  async getBlockWithMembers(
    hashValue: string,
  ): Promise<{ block: HashBlocksEntity; members: HashBlockMembersEntity[] } | null> {
    const block = await this.hashBlocksRepository.findOneBy({ hashValue });
    if (!block) return null;

    const members = await this.hashBlockMembersRepository.find({
      where: { blockId: block.id },
      order: { isConfirmed: 'DESC', joinedAt: 'ASC' },
    });

    return { block, members };
  }

  async getBlockLogs(hashValue: string): Promise<{ logs: HashBlockLogsEntity[] } | null> {
    const block = await this.hashBlocksRepository.findOneBy({ hashValue });
    if (!block) return null;

    const logs = await this.hashBlockLogsRepository.find({
      where: { blockId: block.id },
      order: { createdAt: 'DESC' },
      take: 500,
    });

    return { logs };
  }
}
