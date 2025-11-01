/**
 * BNet API Response Interfaces for Profession-related endpoints
 * Used for typing responses from /data/wow/profession/ endpoints
 */

export interface IBnetNameField {
  en_US?: string;
  en_GB?: string;
  de_DE?: string;
  fr_FR?: string;
  es_ES?: string;
  es_MX?: string;
  pt_BR?: string;
  it_IT?: string;
  ru_RU?: string;
  ko_KR?: string;
  zh_TW?: string;
  zh_CN?: string;
}

export interface IBnetLink {
  href: string;
}

export interface IBnetKeyReference {
  key: IBnetLink;
  name: string;
  id: number;
}

export interface IBnetSimpleKeyReference {
  key: IBnetLink;
  id: number;
}

/**
 * Profession Index Response
 * GET /data/wow/profession/index
 */
export interface IBnetProfession extends IBnetKeyReference {}

export interface IBnetProfessionIndexResponse {
  _links: Record<string, IBnetLink>;
  professions: IBnetProfession[];
}

/**
 * Profession Detail Response
 * GET /data/wow/profession/{professionId}
 */
export interface IBnetSkillTier {
  key: IBnetLink;
  name: IBnetNameField;
  id: number;
  tier_number: number;
  minimum_skill_level: number;
  maximum_skill_level: number;
}

export interface IBnetProfessionDetailResponse {
  _links: Record<string, IBnetLink>;
  id: number;
  name: IBnetNameField;
  type: {
    type: string;
    name: string;
  };
  skill_tiers: IBnetSkillTier[];
}

/**
 * Skill Tier Response
 * GET /data/wow/profession/{professionId}/skill-tier/{skillTierId}
 */
export interface IBnetRecipe extends IBnetSimpleKeyReference {}

export interface IBnetCategory {
  key: IBnetLink;
  name: string;
  id: number;
  recipes: IBnetRecipe[];
}

export interface IBnetSkillTierDetailResponse {
  _links: Record<string, IBnetLink>;
  id: number;
  tier_number: number;
  minimum_skill_level: number;
  maximum_skill_level: number;
  categories: IBnetCategory[];
}

/**
 * Response aggregation types for use in services
 */
export type BnetProfessionIndexQueryResponse =
  Readonly<IBnetProfessionIndexResponse>;

export type BnetProfessionDetailQueryResponse =
  Readonly<IBnetProfessionDetailResponse>;

export type BnetSkillTierDetailQueryResponse =
  Readonly<IBnetSkillTierDetailResponse>;
