/**
 * Type guards for Battle.net World of Warcraft Profession API responses
 * Used to validate response structures and narrow types in the pricing service
 */

import {
  IBnetProfessionIndexResponse,
  IBnetProfessionDetailResponse,
  IBnetSkillTierDetailResponse,
  IBnetProfession,
  IBnetSkillTier,
  IBnetCategory,
  IBnetRecipe,
  IBnetNameField,
} from '@app/resources/types';

/**
 * Validates if response is a successful profession index response
 * GET /data/wow/profession/index
 */
export const isBnetProfessionIndexResponse = (
  response: unknown,
): response is Readonly<IBnetProfessionIndexResponse> =>
  typeof response === 'object' &&
  response !== null &&
  '_links' in response &&
  'professions' in response &&
  Array.isArray((response as any).professions) &&
  (response as any).professions.length > 0 &&
  (response as any).professions.every(
    (p: any) =>
      typeof p === 'object' &&
      'id' in p &&
      'name' in p &&
      'key' in p &&
      typeof p.id === 'number' &&
      typeof p.name === 'string',
  );

/**
 * Validates profession object from profession index response
 */
export const isBnetProfession = (
  profession: unknown,
): profession is Readonly<IBnetProfession> =>
  typeof profession === 'object' &&
  profession !== null &&
  'id' in profession &&
  'name' in profession &&
  'key' in profession &&
  typeof (profession as any).id === 'number' &&
  typeof (profession as any).name === 'string' &&
  typeof (profession as any).key === 'object';

/**
 * Validates if response is a successful profession detail response
 * GET /data/wow/profession/{professionId}
 */
export const isBnetProfessionDetailResponse = (
  response: unknown,
): response is Readonly<IBnetProfessionDetailResponse> =>
  typeof response === 'object' &&
  response !== null &&
  '_links' in response &&
  'id' in response &&
  'name' in response &&
  'type' in response &&
  'skill_tiers' in response &&
  Array.isArray((response as any).skill_tiers) &&
  (response as any).skill_tiers.length > 0 &&
  typeof (response as any).id === 'number' &&
  (response as any).skill_tiers.every((tier: any) =>
    isBnetSkillTier(tier),
  );

/**
 * Validates if response has skill_tiers (may be undefined in some cases)
 */
export const hasBnetSkillTiers = (
  response: unknown,
): response is { skill_tiers: readonly any[] } =>
  typeof response === 'object' &&
  response !== null &&
  'skill_tiers' in response &&
  Array.isArray((response as any).skill_tiers);

/**
 * Validates skill tier object
 */
export const isBnetSkillTier = (
  tier: unknown,
): tier is Readonly<IBnetSkillTier> =>
  typeof tier === 'object' &&
  tier !== null &&
  'id' in tier &&
  'tier_number' in tier &&
  'name' in tier &&
  'minimum_skill_level' in tier &&
  'maximum_skill_level' in tier &&
  'key' in tier &&
  typeof (tier as any).id === 'number' &&
  typeof (tier as any).tier_number === 'number' &&
  typeof (tier as any).minimum_skill_level === 'number' &&
  typeof (tier as any).maximum_skill_level === 'number' &&
  isNameField((tier as any).name);

/**
 * Validates if object is a multilingual name field
 */
export const isNameField = (name: unknown): name is Readonly<IBnetNameField> =>
  typeof name === 'object' &&
  name !== null &&
  (('en_US' in name && typeof (name as any).en_US === 'string') ||
    ('en_GB' in name && typeof (name as any).en_GB === 'string') ||
    ('de_DE' in name && typeof (name as any).de_DE === 'string'));

/**
 * Validates if response is a successful skill tier detail response
 * GET /data/wow/profession/{professionId}/skill-tier/{skillTierId}
 */
export const isBnetSkillTierDetailResponse = (
  response: unknown,
): response is Readonly<IBnetSkillTierDetailResponse> =>
  typeof response === 'object' &&
  response !== null &&
  '_links' in response &&
  'id' in response &&
  'tier_number' in response &&
  'minimum_skill_level' in response &&
  'maximum_skill_level' in response &&
  'categories' in response &&
  Array.isArray((response as any).categories) &&
  (response as any).categories.length > 0 &&
  typeof (response as any).id === 'number' &&
  typeof (response as any).tier_number === 'number' &&
  (response as any).categories.every((cat: any) =>
    isBnetCategory(cat),
  );

/**
 * Validates if response has categories (may be undefined in some cases)
 */
export const hasBnetCategories = (
  response: unknown,
): response is { categories: readonly any[] } =>
  typeof response === 'object' &&
  response !== null &&
  'categories' in response &&
  Array.isArray((response as any).categories);

/**
 * Validates category object
 */
export const isBnetCategory = (
  category: unknown,
): category is Readonly<IBnetCategory> =>
  typeof category === 'object' &&
  category !== null &&
  'id' in category &&
  'name' in category &&
  'key' in category &&
  'recipes' in category &&
  Array.isArray((category as any).recipes) &&
  typeof (category as any).id === 'number' &&
  typeof (category as any).name === 'string' &&
  (category as any).recipes.every((recipe: any) =>
    isBnetRecipe(recipe),
  );

/**
 * Validates if category has recipes (may be undefined in some cases)
 */
export const hasBnetRecipes = (
  category: unknown,
): category is { recipes: readonly any[] } =>
  typeof category === 'object' &&
  category !== null &&
  'recipes' in category &&
  Array.isArray((category as any).recipes) &&
  (category as any).recipes.length > 0;

/**
 * Validates recipe object
 */
export const isBnetRecipe = (
  recipe: unknown,
): recipe is Readonly<IBnetRecipe> =>
  typeof recipe === 'object' &&
  recipe !== null &&
  'id' in recipe &&
  'key' in recipe &&
  typeof (recipe as any).id === 'number' &&
  typeof (recipe as any).key === 'object';
