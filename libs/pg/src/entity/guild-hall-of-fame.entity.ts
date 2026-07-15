import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Index('uq__guild_hof__guid_raid', ['guildGuid', 'raidSlug'], { unique: true })
@Index('ix__guild_hof__guild_guid', ['guildGuid'], {})
@Index('ix__guild_hof__raid_slug', ['raidSlug'], {})
@Entity({ name: CMNW_ENTITY_ENUM.GUILD_HALL_OF_FAME })
export class GuildHallOfFameEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'guild_guid',
  })
  guildGuid!: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'raid_slug',
  })
  raidSlug!: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'raid_name',
  })
  raidName!: string;

  @Column({
    nullable: false,
    type: 'int',
  })
  rank!: number;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  faction!: string;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  region!: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'realm_slug',
  })
  realmSlug!: string;

  @Column({
    type: 'timestamp with time zone',
    name: 'completed_at',
    nullable: true,
  })
  completedAt?: Date;

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
