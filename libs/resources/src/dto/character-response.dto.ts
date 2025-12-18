import { CharactersEntity } from '@app/pg/entity';

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
}
