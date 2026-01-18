import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg/enum';

@Index('ix__valuations__item_id', ['itemId'], {})
@Index('ix__valuations__connected_realm_id', ['connectedRealmId'], {})
@Index('ix__valuations__timestamp', ['timestamp'], {})
@Entity({ name: CMNW_ENTITY_ENUM.VALUATIONS })
export class ValuationEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'item_id',
  })
  itemId: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'connected_realm_id',
  })
  connectedRealmId: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  open?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  high?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  low?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  close?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  market?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  value?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'vendor_sell_price',
  })
  vendorSellPrice?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  quantity?: number;

  @Column({
    nullable: true,
    type: 'int',
  })
  iteration?: number;

  @Column({
    nullable: true,
    type: 'bigint',
  })
  timestamp?: number;

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
