import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Index('uq__hash_blocks__hash_value', ['hashValue'], { unique: true })
@Entity({ name: CMNW_ENTITY_ENUM.HASH_BLOCKS })
export class HashBlocksEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({
    nullable: false,
    type: 'varchar',
    length: 8,
    name: 'hash_value',
  })
  hashValue!: string;

  @Column({
    default: 0,
    nullable: false,
    type: 'int',
    name: 'characters_count',
  })
  charactersCount: number;

  @Column({
    default: 0,
    nullable: false,
    type: 'int',
    name: 'confirmed_count',
  })
  confirmedCount: number;

  @Column({
    default: false,
    nullable: false,
    type: 'boolean',
    name: 'is_collision',
  })
  isCollision: boolean;

  @Column({
    type: 'timestamp with time zone',
    name: 'first_seen_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  firstSeenAt?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_seen_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastSeenAt?: Date;

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
