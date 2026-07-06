import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { HASH_BLOCK_ACTION } from '@app/resources';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('ix__hash_block_logs__block_id', ['blockId'], {})
@Index('ix__hash_block_logs__character_guid', ['characterGuid'], {})
@Entity({ name: CMNW_ENTITY_ENUM.HASH_BLOCK_LOGS })
export class HashBlockLogsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    default: null,
    nullable: true,
    type: 'uuid',
    name: 'block_id',
  })
  blockId?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'character_guid',
  })
  characterGuid?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    length: 8,
    name: 'hash_value',
  })
  hashValue?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    length: 8,
    name: 'hash_a',
  })
  hashA?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    length: 8,
    name: 'hash_b',
  })
  hashB?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  action!: HASH_BLOCK_ACTION;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  original?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  updated?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'members_count',
  })
  membersCount?: number | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'scanned_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  scannedAt?: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
