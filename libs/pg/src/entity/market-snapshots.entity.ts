import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('ix__market_snapshots__source', ['source'], {})
@Entity({ name: CMNW_ENTITY_ENUM.MARKET_SNAPSHOTS })
export class MarketSnapshotsEntity {
  @PrimaryColumn({
    nullable: false,
    type: 'int',
    name: 'connected_realm_id',
  })
  connectedRealmId: number;

  @PrimaryColumn({
    nullable: false,
    type: 'bigint',
  })
  timestamp: number;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  source: string;
}
