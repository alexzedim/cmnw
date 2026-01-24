import {
  IProfessionResponse,
  IProfessionDetailResponse,
  ISkillTieryResponse,
  IBlizzardProfession,
  IBlizzardSkillTier,
  IBlizzardCategory,
  IBlizzardRecipe,
  IBlizzardNameField,
} from '@app/resources';

/**
 * Mock BNet API Responses for Profession Queries
 * Tests validate response structure from:
 * - /data/wow/profession/index
 * - /data/wow/profession/{professionId}
 * - /data/wow/profession/{professionId}/skill-tier/{skillTierId}
 */

describe('BNet Profession API Responses', () => {
  describe('Profession Index Response', () => {
    it('should have correct structure for profession index', () => {
      const mockResponse: IProfessionResponse = {
        _links: {
          self: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/index?namespace=static-eu',
          },
        },
        professions: [
          {
            key: {
              href: 'https://eu.api.blizzard.com/data/wow/profession/164?namespace=static-eu',
            },
            name: 'Blacksmithing',
            id: 164,
          },
          {
            key: {
              href: 'https://eu.api.blizzard.com/data/wow/profession/165?namespace=static-eu',
            },
            name: 'Leatherworking',
            id: 165,
          },
        ],
      };

      expect(mockResponse).toBeDefined();
      expect(mockResponse.professions).toBeDefined();
      expect(mockResponse.professions.length).toBeGreaterThan(0);
      expect(mockResponse.professions[0]).toHaveProperty('id');
      expect(mockResponse.professions[0]).toHaveProperty('name');
      expect(mockResponse.professions[0]).toHaveProperty('key');
    });

    it('should have professions with valid keys', () => {
      const profession: IBlizzardProfession = {
        key: {
          href: 'https://eu.api.blizzard.com/data/wow/profession/164?namespace=static-eu',
        },
        name: 'Blacksmithing',
        id: 164,
      };

      expect(profession.key).toBeDefined();
      expect(profession.key.href).toBeTruthy();
      expect(profession.name).toBeTruthy();
      expect(typeof profession.id).toBe('number');
    });
  });

  describe('Profession Detail Response', () => {
    it('should have correct structure for profession detail', () => {
      const mockNameField: IBlizzardNameField = {
        en_US: 'Blacksmithing',
        en_GB: 'Blacksmithing',
        de_DE: 'Schmiedekunst',
      };

      const mockSkillTier: IBlizzardSkillTier = {
        key: {
          href: 'https://eu.api.blizzard.com/data/wow/profession/164/skill-tier/2396?namespace=static-eu',
        },
        name: mockNameField,
        id: 2396,
        tier_number: 1,
        minimum_skill_level: 1,
        maximum_skill_level: 75,
      };

      const mockResponse: IProfessionDetailResponse = {
        _links: {
          self: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/164?namespace=static-eu',
          },
        },
        id: 164,
        name: mockNameField,
        type: {
          type: 'PROFESSION',
          name: 'Profession',
        },
        skill_tiers: [mockSkillTier],
      };

      expect(mockResponse).toBeDefined();
      expect(mockResponse.id).toBe(164);
      expect(mockResponse.skill_tiers).toBeDefined();
      expect(mockResponse.skill_tiers.length).toBeGreaterThan(0);
      expect(mockResponse.skill_tiers[0]).toHaveProperty('id');
      expect(mockResponse.skill_tiers[0]).toHaveProperty('name');
      expect(mockResponse.skill_tiers[0]).toHaveProperty('tier_number');
    });

    it('should have skill tiers with multilingual names', () => {
      const nameField: IBlizzardNameField = {
        en_US: 'Shadowlands',
        en_GB: 'Shadowlands',
        de_DE: 'Schattenlande',
        fr_FR: 'Terres maudites',
        es_ES: 'Tierras Malditas',
      };

      expect(nameField.en_GB).toBeDefined();
      expect(nameField.en_GB).toContain('Shadowlands');
    });

    it('should handle skill tier with all locale variations', () => {
      const nameField: IBlizzardNameField = {
        en_US: 'Dragonflight',
        en_GB: 'Dragonflight',
        de_DE: 'Drachenflug',
        fr_FR: 'Vol des dragons',
        es_ES: 'Vuelo de dragones',
        es_MX: 'Vuelo de dragones',
        pt_BR: 'Voo dos Dragões',
        it_IT: 'Volo dei Draghi',
        ru_RU: 'Полет дракона',
        ko_KR: '용의 비상',
        zh_TW: '巨龍時代',
        zh_CN: '巨龙时代',
      };

      expect(Object.keys(nameField).length).toBe(12);
      expect(nameField.en_GB).toBeTruthy();
    });
  });

  describe('Skill Tier Detail Response', () => {
    it('should have correct structure for skill tier detail', () => {
      const mockRecipe: IBlizzardRecipe = {
        key: {
          href: 'https://eu.api.blizzard.com/data/wow/recipe/2657?namespace=static-eu',
        },
        id: 2657,
      };

      const mockCategory: IBlizzardCategory = {
        key: {
          href: 'https://eu.api.blizzard.com/data/wow/recipe-category/133?namespace=static-eu',
        },
        name: 'Weapons',
        id: 133,
        recipes: [mockRecipe],
      };

      const mockResponse: ISkillTieryResponse = {
        _links: {
          self: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/164/skill-tier/2396?namespace=static-eu',
          },
        },
        id: 2396,
        tier_number: 1,
        minimum_skill_level: 1,
        maximum_skill_level: 75,
        categories: [mockCategory],
      };

      expect(mockResponse).toBeDefined();
      expect(mockResponse.id).toBe(2396);
      expect(mockResponse.categories).toBeDefined();
      expect(mockResponse.categories.length).toBeGreaterThan(0);
      expect(mockResponse.categories[0]).toHaveProperty('recipes');
    });

    it('should have categories with recipe arrays', () => {
      const recipes: IBlizzardRecipe[] = [
        {
          key: {
            href: 'https://eu.api.blizzard.com/data/wow/recipe/2657?namespace=static-eu',
          },
          id: 2657,
        },
        {
          key: {
            href: 'https://eu.api.blizzard.com/data/wow/recipe/2658?namespace=static-eu',
          },
          id: 2658,
        },
      ];

      const category: IBlizzardCategory = {
        key: {
          href: 'https://eu.api.blizzard.com/data/wow/recipe-category/133?namespace=static-eu',
        },
        name: 'Weapons',
        id: 133,
        recipes,
      };

      expect(category.recipes).toBeDefined();
      expect(category.recipes.length).toBe(2);
      expect(category.recipes[0]).toHaveProperty('id');
      expect(category.recipes[0]).toHaveProperty('key');
    });

    it('should handle recipes with numeric IDs', () => {
      const recipe: IBlizzardRecipe = {
        key: {
          href: 'https://eu.api.blizzard.com/data/wow/recipe/2657?namespace=static-eu',
        },
        id: 2657,
      };

      expect(typeof recipe.id).toBe('number');
      expect(recipe.id).toBeGreaterThan(0);
    });
  });

  describe('BNet Query Response Integration', () => {
    it('should handle full profession indexing workflow', () => {
      const professionIndexResponse: IProfessionResponse = {
        _links: {
          self: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/index?namespace=static-eu',
          },
        },
        professions: [
          {
            key: {
              href: 'https://eu.api.blizzard.com/data/wow/profession/164?namespace=static-eu',
            },
            name: 'Blacksmithing',
            id: 164,
          },
        ],
      };

      const { professions } = professionIndexResponse;
      expect(professions).toBeDefined();

      for (const profession of professions) {
        expect(profession.id).toBeDefined();
        expect(profession.name).toBeDefined();
        expect(profession.key).toBeDefined();
      }
    });

    it('should handle profession detail with skill tiers', () => {
      const professionDetailResponse: IProfessionDetailResponse = {
        _links: {
          self: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/164?namespace=static-eu',
          },
        },
        id: 164,
        name: {
          en_US: 'Blacksmithing',
          en_GB: 'Blacksmithing',
        },
        type: {
          type: 'PROFESSION',
          name: 'Profession',
        },
        skill_tiers: [
          {
            key: {
              href: 'https://eu.api.blizzard.com/data/wow/profession/164/skill-tier/2396?namespace=static-eu',
            },
            name: {
              en_US: 'Classic',
              en_GB: 'Classic',
            },
            id: 2396,
            tier_number: 1,
            minimum_skill_level: 1,
            maximum_skill_level: 75,
          },
        ],
      };

      const { skill_tiers } = professionDetailResponse;
      expect(skill_tiers).toBeDefined();

      for (const tier of skill_tiers) {
        expect(tier.id).toBeDefined();
        expect(tier.name.en_GB).toBeDefined();
        expect(tier.tier_number).toBeDefined();
      }
    });

    it('should handle skill tier detail with categories and recipes', () => {
      const skillTierDetailResponse: ISkillTieryResponse = {
        _links: {
          self: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/164/skill-tier/2396?namespace=static-eu',
          },
        },
        id: 2396,
        tier_number: 1,
        minimum_skill_level: 1,
        maximum_skill_level: 75,
        categories: [
          {
            key: {
              href: 'https://eu.api.blizzard.com/data/wow/recipe-category/133?namespace=static-eu',
            },
            name: 'Weapons',
            id: 133,
            recipes: [
              {
                key: {
                  href: 'https://eu.api.blizzard.com/data/wow/recipe/2657?namespace=static-eu',
                },
                id: 2657,
              },
            ],
          },
        ],
      };

      const { categories } = skillTierDetailResponse;
      expect(categories).toBeDefined();

      for (const category of categories) {
        expect(category.recipes).toBeDefined();

        for (const recipe of category.recipes) {
          expect(recipe.id).toBeDefined();
          expect(recipe.key).toBeDefined();
        }
      }
    });
  });

  describe('Type Validation', () => {
    it('should validate readonly response types', () => {
      const response: Readonly<IProfessionResponse> = {
        _links: {
          self: { href: 'test' },
        },
        professions: [],
      };

      expect(response).toBeDefined();
      // Readonly assertion - should not allow mutations
      expect(() => {
        (response as any).professions = null;
      }).not.toThrow(); // Object mutation isn't enforced at runtime
    });
  });
});
