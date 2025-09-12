import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuthProvider {
  DISCORD = 'discord',
  BATTLENET = 'battlenet',
}

@Index('ix__users__discord_id', ['discordId'], { where: 'discord_id IS NOT NULL' })
@Index('ix__users__battlenet_id', ['battlenetId'], { where: 'battlenet_id IS NOT NULL' })
@Index('ix__users__email', ['email'], { where: 'email IS NOT NULL' })
@Entity({ name: 'users' })
export class UsersEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 255,
  })
  username?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 320,
  })
  email?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 255,
  })
  avatar?: string;

  // Discord OAuth fields
  @Column({
    nullable: true,
    type: 'varchar',
    length: 50,
    name: 'discord_id',
  })
  discordId?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 100,
    name: 'discord_username',
  })
  discordUsername?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 10,
    name: 'discord_discriminator',
  })
  discordDiscriminator?: string;

  // Battle.net OAuth fields
  @Column({
    nullable: true,
    type: 'varchar',
    length: 50,
    name: 'battlenet_id',
  })
  battlenetId?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    length: 100,
    name: 'battlenet_battletag',
  })
  battlenetBattletag?: string;

  // OAuth metadata
  @Column({
    type: 'enum',
    enum: AuthProvider,
    name: 'primary_provider',
  })
  primaryProvider: AuthProvider;

  @Column({
    array: true,
    type: 'enum',
    enum: AuthProvider,
    default: [],
    name: 'linked_providers',
  })
  linkedProviders: AuthProvider[];

  @Column({
    nullable: true,
    type: 'varchar',
    length: 10,
  })
  locale?: string;

  @Column({
    default: true,
    type: 'boolean',
    name: 'is_active',
  })
  isActive: boolean;

  @Column({
    nullable: true,
    type: 'timestamp with time zone',
    name: 'last_login_at',
  })
  lastLoginAt?: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}