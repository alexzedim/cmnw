import { ApiProperty } from '@nestjs/swagger';
import { CharactersEntity, AnalyticsEntity } from '@app/pg/entity';
import { calculateCharacterPercentiles } from '../utils/percentile';

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
  readonly guid: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Character ID from Battle.net API',
    example: 12345,
  })
  readonly id?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character name',
    example: 'Thrallmaster',
  })
  readonly name: string;

  @ApiProperty({
    type: 'number',
    description: 'Realm ID from Battle.net API',
    example: 1,
  })
  readonly realmId: number;

  @ApiProperty({
    description: 'Realm name',
    example: 'Area 52',
  })
  readonly realmName: string;

  @ApiProperty({
    description: 'Realm slug/identifier',
    example: 'area-52',
  })
  readonly realm: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Guild name',
    example: 'Eternal Kingdom',
  })
  readonly guild?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Guild global unique identifier (GUID)',
    example: 'us-area-52-guild-12345',
  })
  readonly guildGuid?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Guild ID from Battle.net API',
    example: 98765,
  })
  readonly guildId?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Character rank in guild (0-based)',
    example: 0,
  })
  readonly guildRank?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Hash A for data integrity',
  })
  readonly hashA?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Hash B for data integrity',
  })
  readonly hashB?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character race',
    example: 'Orc',
  })
  readonly race?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character class',
    example: 'Warlock',
  })
  readonly class?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character specialization',
    example: 'Demonology',
  })
  readonly specialization?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character gender',
    enum: ['Male', 'Female'],
    example: 'Male',
  })
  readonly gender?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Character faction',
    enum: ['Horde', 'Alliance'],
    example: 'Horde',
  })
  readonly faction?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Character level',
    example: 70,
  })
  readonly level?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Total achievement points',
    example: 13425,
  })
  readonly achievementPoints?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Average item level across all items',
    example: 489,
  })
  readonly averageItemLevel?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Equipped item level (only equipped items)',
    example: 496,
  })
  readonly equippedItemLevel?: number;

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
  readonly covenantId?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Avatar image URL',
    example:
      'https://render.worldofwarcraft.com/us/character/area-52/1/12345678/avatar.jpg',
  })
  readonly avatarImage?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Inset image URL',
  })
  readonly insetImage?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Main profile image URL',
  })
  readonly mainImage?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Total number of mounts collected',
    example: 256,
  })
  readonly mountsNumber?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Total number of pets collected',
    example: 892,
  })
  readonly petsNumber?: number;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Service or process that created this record',
    example: 'OSINT-CHARACTER-GET',
  })
  readonly createdBy?: string;

  @ApiProperty({
    description: 'Service or process that last updated this record',
    example: 'OSINT-CHARACTER-INDEX',
  })
  readonly updatedBy: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Timestamp of last modification',
  })
  readonly lastModified?: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Record creation timestamp',
  })
  readonly createdAt?: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'Record last update timestamp',
  })
  readonly updatedAt?: Date;

  @ApiProperty({
    type: CharacterPercentiles,
    description:
      'Character percentile statistics for global and realm rankings',
  })
  readonly percentiles: CharacterPercentiles;

  static fromCharacter(
    character: CharactersEntity,
    globalAnalytics?: AnalyticsEntity,
    realmAnalytics?: AnalyticsEntity,
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
    console.log('percentiles', percentiles);

    return {
      ...character,
      percentiles,
    } as CharacterResponseDto;
  }
}
