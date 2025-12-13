import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('ix__analytics__category_type_date', ['category', 'metricType', 'snapshotDate'])
@Index('ix__analytics__date', ['snapshotDate'])
@Index('ix__analytics__realm_date', ['realmId', 'snapshotDate'])
@Index('ix__analytics__category_date', ['category', 'snapshotDate'])
@Entity({ name: CMNW_ENTITY_ENUM.ANALYTICS })
export class AnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  category: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'metric_type',
  })
  metricType: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'realm_id',
  })
  realmId?: number;

  @Column({
    nullable: false,
    type: 'jsonb',
  })
  value: Record<string, any>;

  @Column({
    nullable: false,
    type: 'date',
    name: 'snapshot_date',
  })
  snapshotDate: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
