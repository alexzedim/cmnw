import { CharactersEntity, AnalyticsEntity } from '@app/pg/entity';
import { calculateCharacterPercentiles } from '../utils/percentile';

class PercentileStats {
  readonly achievementPoints: number | null;
  readonly averageItemLevel: number | null;
}

class CharacterPercentiles {
  readonly global: PercentileStats;
  readonly realm: PercentileStats;
}

export class CharacterResponseDto extends CharactersEntity {
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
      },
      globalAnalytics,
      realmAnalytics,
    );

    return {
      ...character,
      percentiles,
    } as CharacterResponseDto;
  }
}
