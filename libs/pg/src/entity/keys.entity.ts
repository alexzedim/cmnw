import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.KEYS })
export class KeysEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'varchar',
    name: 'client',
    nullable: false,
  })
  clientId: string;

  @Column({
    type: 'varchar',
    name: 'secret',
    nullable: false,
  })
  clientSecret: string;

  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  accessToken?: string;

  @Column({
    type: 'int',
    name: 'expired_in',
    nullable: true,
    default: null,
  })
  expiredIn?: number;

  @Column({
    type: 'int',
    name: 'cooldown_delay_seconds',
    nullable: false,
    default: 0,
  })
  cooldownDelaySeconds: number;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_failure_at',
    nullable: true,
    default: null,
  })
  lastFailureAt?: Date;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
    default: null,
  })
  tags?: string[];

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
  })
  updatedAt: Date;
}
