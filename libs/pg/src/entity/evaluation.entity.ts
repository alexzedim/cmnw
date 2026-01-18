import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { VALUATION_TYPE } from '@app/resources/constants';

@Index('ix__evaluations__item_id', ['itemId'], {})
@Index('ix__evaluations__connected_realm_id', ['connectedRealmId'], {})
@Index('ix__evaluations__timestamp', ['timestamp'], {})
@Index('ix__evaluations__profit_margin', ['profitMargin'], {})
@Entity({ name: CMNW_ENTITY_ENUM.EVALUATIONS })
export class EvaluationEntity {
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
    name: 'market_price',
  })
  marketPrice?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'crafting_cost',
  })
  craftingCost?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'vendor_sell_price',
  })
  vendorSellPrice?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'reverse_value',
  })
  reverseValue?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  profit?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'profit_margin',
  })
  profitMargin?: number;

  @Column({
    nullable: true,
    type: 'boolean',
    name: 'is_profitable',
  })
  isProfitable?: boolean;

  @Column({
    nullable: true,
    type: 'int',
    name: 'best_recipe_id',
  })
  bestRecipeId?: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'recipe_rank',
  })
  recipeRank?: number;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  profession?: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  expansion?: string;

  @Column({
    array: true,
    nullable: true,
    type: 'character varying',
    name: 'asset_class',
  })
  assetClass?: VALUATION_TYPE[];

  @Column({
    nullable: true,
    type: 'jsonb',
  })
  recommendations?: string[];

  @Column({
    nullable: true,
    type: 'real',
  })
  confidence?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'market_volume',
  })
  marketVolume?: number;

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
