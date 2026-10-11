import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import type { IActionsModifier, IPetList } from '@app/resources';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('ix__market__reconstruction', ['itemId', 'connectedRealmId', 'validFrom'], {})
@Index('ix__market__ttl', ['validTo'], {})
@Index('ix__market__live', ['connectedRealmId'], { where: 'valid_to IS NULL' })
@Entity({ name: CMNW_ENTITY_ENUM.MARKET })
export class MarketEntity {
  @PrimaryColumn({
    nullable: false,
    type: 'int',
    name: 'connected_realm_id',
  })
  connectedRealmId: number;

  @PrimaryColumn({
    nullable: false,
    type: 'varchar',
    name: 'order_id',
  })
  orderId: string;

  @PrimaryColumn({
    nullable: false,
    type: 'varchar',
  })
  type: string;

  @PrimaryColumn({
    nullable: false,
    type: 'bigint',
    name: 'valid_from',
  })
  validFrom: number;

  @Column({
    nullable: true,
    type: 'bigint',
    name: 'valid_to',
  })
  validTo: number | null;

  @Column({
    nullable: false,
    type: 'int',
    name: 'attr_hash',
  })
  attrHash: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'item_id',
  })
  itemId: number;

  @Column({
    nullable: false,
    type: 'real',
  })
  price: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  bid: number | null;

  @Column({
    nullable: true,
    type: 'int',
  })
  context: number | null;

  @Column({
    array: true,
    nullable: true,
    type: 'int',
    name: 'bonus_list',
  })
  bonusList?: number[] | null;

  @Column({
    type: 'jsonb',
    array: false,
    nullable: true,
  })
  modifiers?: Array<IActionsModifier> | null;

  @Column({
    type: 'jsonb',
    array: false,
    nullable: true,
    name: 'pet_list',
  })
  petList?: Array<IPetList> | null;

  @Column({
    default: 1,
    nullable: true,
    type: 'int',
  })
  quantity?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  value?: number | null;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'time_left',
  })
  timeLeft?: string | null;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  faction: string | null;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  counterparty: string | null;

  @Column({
    nullable: true,
    type: 'boolean',
    name: 'is_online',
  })
  isOnline: boolean | null;
}
