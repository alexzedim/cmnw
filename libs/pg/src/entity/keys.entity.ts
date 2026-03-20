import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { KEY_STATUS } from '@app/resources';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.KEYS })
export class KeysEntity {
  // ============ Primary Key ============
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  // ============ Credentials ============
  @Column({
    type: 'varchar',
    nullable: false,
  })
  client: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  secret: string;

  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  token?: string;

  @Column({
    type: 'int',
    name: 'token_expires_in',
    nullable: true,
    default: null,
  })
  tokenExpiresIn?: number;

  // ============ Key State ============
  @Column({
    type: 'varchar',
    nullable: false,
    default: KEY_STATUS.ACTIVE,
  })
  status: KEY_STATUS;

  @Column({
    type: 'int',
    name: 'error_count',
    nullable: false,
    default: 0,
  })
  errorCount: number;

  @Column({
    type: 'int',
    name: 'rate_limit_count',
    nullable: false,
    default: 0,
  })
  rateLimitCount: number;

  @Column({
    type: 'int',
    name: 'request_count',
    nullable: false,
    default: 0,
  })
  requestCount: number;

  @Column({
    type: 'int',
    name: 'success_count',
    nullable: false,
    default: 0,
  })
  successCount: number;

  @Column({
    type: 'int',
    name: 'consecutive_errors',
    nullable: false,
    default: 0,
  })
  consecutiveErrors: number;

  // ============ Timestamps ============
  @Column({
    type: 'timestamp with time zone',
    name: 'last_error_at',
    nullable: true,
    default: null,
  })
  lastErrorAt?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_rate_limit_at',
    nullable: true,
    default: null,
  })
  lastRateLimitAt?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_success_at',
    nullable: true,
    default: null,
  })
  lastSuccessAt?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'cooldown_until',
    nullable: true,
    default: null,
  })
  cooldownUntil?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_request_at',
    nullable: true,
    default: null,
  })
  lastRequestAt?: Date;

  // ============ Metadata ============
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    default: null,
  })
  tags?: string[];

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
  })
  priority: number;

  // ============ Legacy Columns (for migration) ============
  @Column({
    type: 'int',
    name: 'error_counts',
    nullable: true,
    default: 0,
  })
  errorCounts?: number;

  @Column({
    type: 'int',
    name: 'expired_in',
    nullable: true,
    default: null,
  })
  expiredIn?: number;

  @Column({
    type: 'timestamp with time zone',
    name: 'reset_at',
    nullable: true,
    default: null,
  })
  resetAt?: Date;

  // ============ Audit Columns ============
  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
