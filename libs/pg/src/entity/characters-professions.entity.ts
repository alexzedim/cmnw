import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('ix__cp__character_guid', ['characterGuid'], {})
@Index(
  'ix__cp__character_profession_tier',
  ['characterGuid', 'professionId', 'tierId'],
  {},
)
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_PROFESSIONS })
export class CharactersProfessionsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'character_guid',
  })
  characterGuid: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'profession_id',
  })
  professionId: number;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'profession_name',
  })
  professionName: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'tier_id',
  })
  tierId: number;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'tier_name',
  })
  tierName: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'skill_points',
  })
  skillPoints: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'max_skill_points',
  })
  maxSkillPoints: number;

  @Column({
    nullable: false,
    type: 'boolean',
    name: 'is_primary',
    default: false,
  })
  isPrimary: boolean;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'specialization',
  })
  specialization?: string;

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
