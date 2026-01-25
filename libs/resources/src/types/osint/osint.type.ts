import { CharactersEntity, CharactersProfileEntity, GuildsEntity } from '@app/pg';
import { ICharacterRaiderIo } from '@app/resources/types';
import type {
  INameWithType,
  ISelfKeyHref,
  ISelfWithId,
  ISelfWithNameAndId,
  Locales,
} from './osint.interface';

export type CharacterStatus = {
  id: number;
  isValid: boolean;
  lastModified: Date;
  status: string;
};

export type CharacterExistsOrCreate = {
  characterEntity: CharactersEntity;
  isNew: boolean;
  isCreateOnlyUnique: boolean;
  isNotReadyToUpdate: boolean;
};

export type GuildExistsOrCreate = {
  guildEntity: GuildsEntity;
  isNew: boolean;
  isCreateOnlyUnique: boolean;
  isNotReadyToUpdate: boolean;
};

export type WowProgressProfile = Partial<
  Pick<
    CharactersProfileEntity,
    'battleTag' | 'readyToTransfer' | 'raidDays' | 'playRole' | 'languages'
  >
>;

export type WarcraftLogsProfile = Partial<
  Pick<CharactersProfileEntity, 'heroicLogs' | 'mythicLogs'>
>;

export type RaiderIoCharacterMappingKey = keyof Omit<
  ICharacterRaiderIo,
  | 'achievement_points'
  | 'honorable_kills'
  | 'thumbnail_url'
  | 'region'
  | 'last_crawled_at'
  | 'profile_url'
  | 'profile_banner'
>;

export type RaiderIoCharacterMappingField = keyof Pick<
  CharactersProfileEntity,
  'name' | 'realm' | 'race' | 'class' | 'gender' | 'activeSpec' | 'activeRole'
>;

export type CharactersHashType = keyof Pick<CharactersEntity, 'hashA' | 'hashB'>;

export type CharacterHashFieldType = 'a' | 'b';

/** -----------------------------------------------------------------------------
 * Blizzard API professions
 * ----------------------------------------------------------------------------- */
export interface IBlizzardNameField extends Partial<Locales> {}

export interface IBlizzardProfession extends ISelfWithNameAndId {}

export interface ProfessionIndex {
  _links: Record<string, ISelfKeyHref>;
  professions: IBlizzardProfession[];
}

export interface IBlizzardSkillTier {
  key: ISelfKeyHref;
  name: IBlizzardNameField;
  id: number;
  tier_number: number;
  minimum_skill_level: number;
  maximum_skill_level: number;
}

export interface ProfessionDetail {
  _links: Record<string, ISelfKeyHref>;
  id: number;
  name: IBlizzardNameField;
  type: INameWithType;
  skill_tiers: IBlizzardSkillTier[];
}

export interface IBlizzardRecipe extends ISelfWithId {}

export interface IBlizzardCategory extends ISelfWithNameAndId {
  recipes: IBlizzardRecipe[];
}

export interface SkillTierDetail {
  _links: Record<string, ISelfKeyHref>;
  id: number;
  tier_number: number;
  minimum_skill_level: number;
  maximum_skill_level: number;
  categories: IBlizzardCategory[];
}
