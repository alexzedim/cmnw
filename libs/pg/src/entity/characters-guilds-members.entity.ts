import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { OSINT_SOURCE } from '@app/resources';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('ix__characters_guilds_members__guild_guid', ['guildGuid'], {})
@Index('ix__characters_guilds_members__character_guid', ['characterGuid'], {})
@Index('ix__characters_guilds_members__realm', ['realm'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_GUILDS_MEMBERS })
export class CharactersGuildsMembersEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'guild_guid',
  })
  guildGuid: string;

  @Column({
    nullable: true,
    default: null,
    type: 'int',
    name: 'guild_id',
  })
  guildId: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'character_id',
  })
  characterId: number;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'character_guid',
  })
  characterGuid: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'realm_id',
  })
  realmId: number;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'realm_name',
  })
  realmName: string;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  realm: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'rank',
  })
  rank: number;

  @Column({
    default: OSINT_SOURCE.CHARACTER_GET,
    nullable: true,
    type: 'varchar',
    name: 'created_by',
  })
  createdBy: string;

  @Column({
    default: OSINT_SOURCE.CHARACTER_INDEX,
    nullable: true,
    type: 'varchar',
    name: 'updated_by',
  })
  updatedBy: string;

  @Column('timestamp with time zone', {
    name: 'last_modified',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastModified: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
