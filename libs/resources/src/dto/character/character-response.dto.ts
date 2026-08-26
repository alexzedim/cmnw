import { type AnalyticsEntity, CharactersEntity } from '@app/pg/entity';
import { BLIZZARD_EMPLOYEE_EVIDENCE, EXPANSIONS, LEVEL_BOOST_EVIDENCE } from '@app/resources/constants';
import { calculateCharacterPercentiles, toInsetImage, toMainImage } from '@app/resources/utils';
import { ApiProperty } from '@nestjs/swagger';

class PercentileStats {
  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Achievement points percentile rank',
    example: 75.5,
  })
  readonly achievementPoints: number | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Average item level percentile rank',
    example: 82.3,
  })
  readonly averageItemLevel: number | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Mounts count percentile rank',
    example: 68.5,
  })
  readonly mountsNumber: number | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Pets count percentile rank',
    example: 71.2,
  })
  readonly petsNumber: number | null;
}

class CharacterPercentiles {
  @ApiProperty({
    type: PercentileStats,
    description: 'Global percentile statistics across all characters',
  })
  readonly global: PercentileStats;

  @ApiProperty({
    type: PercentileStats,
    description: 'Realm-specific percentile statistics',
  })
  readonly realm: PercentileStats;
}

export class CharacterHashBlockRef {
  @ApiProperty({
    description: 'Block anchor hashB value',
    example: 'a99becec',
  })
  readonly hashValue: string;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the character hashA is corroborated by another member',
  })
  readonly isConfirmed: boolean;
}

export class CharacterResponseDto extends CharactersEntity {
  @ApiProperty({
    description: 'Character unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  readonly uuid: string;

  @ApiProperty({
    description: 'Character global unique identifier (GUID)',
    example: 'us-area-52-12345678',
  })
  declare readonly guid: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Character ID from Battle.net API',
    example: 12345,
  })
  declare readonly id?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character name',
    example: 'Thrallmaster',
  })
  declare readonly name: string;

  @ApiProperty({
    type: 'number',
    description: 'Realm ID from Battle.net API',
    example: 1,
  })
  declare readonly realmId: number;

  @ApiProperty({
    description: 'Realm name',
    example: 'Area 52',
  })
  declare readonly realmName: string;

  @ApiProperty({
    description: 'Realm slug/identifier',
    example: 'area-52',
  })
  declare readonly realm: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Guild name',
    example: 'Eternal Kingdom',
  })
  declare readonly guild?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Guild global unique identifier (GUID)',
    example: 'us-area-52-guild-12345',
  })
  declare readonly guildGuid?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Guild ID from Battle.net API',
    example: 98765,
  })
  declare readonly guildId?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Character rank in guild (0-based)',
    example: 0,
  })
  declare readonly guildRank?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Hash A for data integrity',
  })
  declare readonly hashA?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Hash B for data integrity',
  })
  declare readonly hashB?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character race',
    example: 'Orc',
  })
  declare readonly race?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character class',
    example: 'Warlock',
  })
  declare readonly class?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character specialization',
    example: 'Demonology',
  })
  declare readonly specialization?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character gender',
    enum: ['Male', 'Female'],
    example: 'Male',
  })
  declare readonly gender?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character faction',
    enum: ['Horde', 'Alliance'],
    example: 'Horde',
  })
  declare readonly faction?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Character level',
    example: 70,
  })
  declare readonly level?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Total achievement points',
    example: 13425,
  })
  declare readonly achievementPoints?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Average item level across all items',
    example: 489,
  })
  declare readonly averageItemLevel?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Equipped item level (only equipped items)',
    example: 496,
  })
  declare readonly equippedItemLevel?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'HTTP status code from last profile update',
    example: 200,
  })
  readonly statusCode?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Covenant ID (Shadowlands)',
    example: 1,
  })
  declare readonly covenantId?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Avatar image URL',
    example: 'https://render.worldofwarcraft.com/us/character/area-52/1/12345678/avatar.jpg',
  })
  declare readonly avatarImage?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Inset image URL',
  })
  declare readonly insetImage?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Main profile image URL',
  })
  declare readonly mainImage?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Total number of mounts collected',
    example: 256,
  })
  declare readonly mountsNumber?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Total number of pets collected',
    example: 892,
  })
  declare readonly petsNumber?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Service or process that created this record',
    example: 'OSINT-CHARACTER-GET',
  })
  declare readonly createdBy?: string;

  @ApiProperty({
    description: 'Service or process that last updated this record',
    example: 'OSINT-CHARACTER-INDEX',
  })
  declare readonly updatedBy: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Timestamp of last modification',
  })
  declare readonly lastModified?: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'Approximate character creation date recovered from leveling achievements (character was created on or before this date)',
  })
  declare readonly createdApprox?: Date;

  @ApiProperty({
    type: 'boolean',
    nullable: true,
    description:
      'Whether the character consumed a level boost (true = boosted, false = naturally leveled, null = undetermined)',
  })
  declare readonly isLevelBoosted?: boolean | null;

  @ApiProperty({
    type: 'string',
    enum: LEVEL_BOOST_EVIDENCE,
    nullable: true,
    description: 'Achievement pattern behind the level boost verdict',
  })
  declare readonly levelBoostEvidence?: LEVEL_BOOST_EVIDENCE | null;

  @ApiProperty({
    type: 'string',
    enum: EXPANSIONS,
    nullable: true,
    description: 'Expansion whose level boost was applied',
  })
  declare readonly levelBoostType?: EXPANSIONS | null;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Timestamp of the level boost (null when only inferred)',
  })
  declare readonly levelBoostedAt?: Date | null;

  @ApiProperty({
    type: 'boolean',
    nullable: true,
    description:
      "Whether the character carries the Blizzard employee collector's edition signature (true = employee, false = ruled out, null = undetermined)",
  })
  declare readonly isBlizzardEmployee?: boolean | null;

  @ApiProperty({
    type: 'string',
    enum: BLIZZARD_EMPLOYEE_EVIDENCE,
    nullable: true,
    description: 'Data pattern behind the Blizzard employee verdict',
  })
  declare readonly blizzardEmployeeEvidence?: BLIZZARD_EMPLOYEE_EVIDENCE | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    nullable: true,
    description: "Collector's Edition pets owned by the character",
  })
  declare readonly blizzardEmployeePets?: string[] | null;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: "Approximate hire date (UTC day of the collector's edition batch grant)",
  })
  declare readonly hiredApprox?: Date | null;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Record creation timestamp',
  })
  declare readonly createdAt?: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Record last update timestamp',
  })
  declare readonly updatedAt?: Date;

  @ApiProperty({
    type: CharacterPercentiles,
    description: 'Character percentile statistics for global and realm rankings',
  })
  readonly percentiles: CharacterPercentiles;

  @ApiProperty({
    type: CharacterHashBlockRef,
    nullable: true,
    description: 'Block reference if the character is a member of a hash block',
  })
  readonly hashBlock?: CharacterHashBlockRef | null;

  static fromCharacter(
    character: CharactersEntity,
    globalAnalytics?: AnalyticsEntity,
    realmAnalytics?: AnalyticsEntity,
    hashBlock?: CharacterHashBlockRef | null,
  ): CharacterResponseDto {
    const percentiles = calculateCharacterPercentiles(
      {
        achievementPoints: character.achievementPoints,
        averageItemLevel: character.averageItemLevel,
        mountsNumber: character.mountsNumber,
        petsNumber: character.petsNumber,
      },
      globalAnalytics,
      realmAnalytics,
    );

    return {
      ...character,
      insetImage: toInsetImage(character.avatarImage),
      mainImage: toMainImage(character.avatarImage),
      percentiles,
      hashBlock: hashBlock ?? null,
    } as CharacterResponseDto;
  }
}
