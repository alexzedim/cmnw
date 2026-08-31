import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('uq__characters_raid__log_id', ['logId'], { unique: true })
@Index('ix__characters_raid__status', ['status'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_RAID_LOGS })
export class CharactersRaidLogsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  readonly logId: string;

  @Column({
    default: 'discovered',
    type: 'varchar',
    length: 16,
  })
  status: string;

  @Column({
    default: false,
    type: 'boolean',
  })
  isIndexed: boolean;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'realm_slug',
  })
  realmSlug?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    length: 16,
    name: 'source',
  })
  source?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'jsonb',
    name: 'payload',
  })
  payload?: Record<string, unknown> | null;

  @Column({
    default: 0,
    type: 'int',
    name: 'attempts',
  })
  attempts: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    length: 500,
    name: 'last_error',
  })
  lastError?: string | null;

  @Column({
    default: null,
    nullable: true,
    type: 'timestamp with time zone',
    name: 'last_error_at',
  })
  lastErrorAt?: Date | null;

  @Column({
    default: null,
    nullable: true,
    type: 'timestamp with time zone',
    name: 'started_at',
  })
  startedAt?: Date | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'indexed_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  indexedAt?: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
