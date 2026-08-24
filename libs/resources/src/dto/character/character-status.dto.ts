import { ApiProperty } from '@nestjs/swagger';

/**
 * Character Status DTO
 * Represents the status of character data collection endpoints
 * Status string format: 7 characters representing [STATUS, SUMMARY, MEDIA, PETS, MOUNTS, PROFESSIONS, ACHIEVEMENTS]
 * - Uppercase letter = Success (S, U, V, P, M, R, A)
 * - Lowercase letter = Error (s, u, v, p, m, r, a)
 * - Hyphen (-) = Pending/Not attempted
 */
export class CharacterStatusDto {
  @ApiProperty({
    type: 'string',
    description: 'Status string representing endpoint statuses (7 characters)',
    example: 'SUPMVR-',
    pattern: '^[SUVPMRsuvrpmAa-]{7}$',
  })
  readonly status: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Detailed status description',
    example: 'Status and Summary succeeded, Media pending, Pets and Mounts succeeded, Professions pending',
  })
  readonly statusDescription?: string;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Completion percentage (0-100)',
    example: 83,
  })
  readonly completionPercentage?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Success percentage (0-100)',
    example: 83,
  })
  readonly successPercentage?: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Error percentage (0-100)',
    example: 0,
  })
  readonly errorPercentage?: number;
}
