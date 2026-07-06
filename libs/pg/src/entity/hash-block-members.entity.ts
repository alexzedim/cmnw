import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Index('ix__hash_block_members__block_id', ['blockId'], {})
@Index('uq__hash_block_members__character_guid', ['characterGuid'], { unique: true })
@Entity({ name: CMNW_ENTITY_ENUM.HASH_BLOCK_MEMBERS })
export class HashBlockMembersEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({
    nullable: false,
    type: 'uuid',
    name: 'block_id',
  })
  blockId!: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'character_guid',
  })
  characterGuid!: string;

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
    default: false,
    nullable: false,
    type: 'boolean',
    name: 'is_confirmed',
  })
  isConfirmed: boolean;

  @Column({
    type: 'timestamp with time zone',
    name: 'joined_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  joinedAt?: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;
}
