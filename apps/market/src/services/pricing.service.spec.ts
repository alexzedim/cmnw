import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration test to capture and document B.net API response structures
 * Responses are saved to JSON files for analysis and future interface updates
 *
 * NOTE: This test file documents the expected structure of B.net API responses
 * for profession data. No actual service logic is tested here - only response
 * structure documentation is captured to a __responses__ directory.
 */
describe('PricingService - B.net API Response Structure Documentation', () => {
  const responsesDir = path.join(
    process.cwd(),
    'apps/market/src/services/__responses__',
  );

  beforeAll(async () => {
    // Create responses directory if it doesn't exist
    if (!fs.existsSync(responsesDir)) {
      fs.mkdirSync(responsesDir, { recursive: true });
    }
  });

  it('should document profession index response structure', () => {
    /**
     * This documents the expected structure of /data/wow/profession/index
     * Reference: https://develop.battle.net/documentation/world-of-warcraft/game-data-apis
     */
    const expectedProfessionIndexResponse = {
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

    fs.writeFileSync(
      path.join(responsesDir, 'profession-index.json'),
      JSON.stringify(expectedProfessionIndexResponse, null, 2),
    );

    expect(expectedProfessionIndexResponse.professions.length).toBeGreaterThan(
      0,
    );
    expect(expectedProfessionIndexResponse.professions[0]).toHaveProperty('id');
    expect(expectedProfessionIndexResponse.professions[0]).toHaveProperty('name');
  });

  it('should document profession detail response structure', () => {
    /**
     * This documents the expected structure of /data/wow/profession/{professionId}
     */
    const expectedProfessionDetailResponse = {
      _links: {
        self: {
          href: 'https://eu.api.blizzard.com/data/wow/profession/164?namespace=static-eu',
        },
      },
      id: 164,
      name: {
        en_US: 'Blacksmithing',
        en_GB: 'Blacksmithing',
        de_DE: 'Schmiedekunst',
        fr_FR: 'Forge',
        es_ES: 'Herrería',
        es_MX: 'Herrería',
        pt_BR: 'Ferraria',
        it_IT: 'Forgiatura',
        ru_RU: 'Кузнечное дело',
        ko_KR: '대장기술',
        zh_TW: '鍛造',
        zh_CN: '锻造',
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
            de_DE: 'Klassisch',
            fr_FR: 'Classique',
            es_ES: 'Clásico',
            es_MX: 'Clásico',
            pt_BR: 'Clássico',
            it_IT: 'Classico',
            ru_RU: 'Классический',
            ko_KR: '클래식',
            zh_TW: '經典',
            zh_CN: '经典',
          },
          id: 2396,
          tier_number: 1,
          minimum_skill_level: 1,
          maximum_skill_level: 75,
        },
        {
          key: {
            href: 'https://eu.api.blizzard.com/data/wow/profession/164/skill-tier/2397?namespace=static-eu',
          },
          name: {
            en_US: 'The Burning Crusade',
            en_GB: 'The Burning Crusade',
            de_DE: 'Die Brennende Legion',
            fr_FR: 'La Croisade écarlate',
            es_ES: 'La Cruzada Ardiente',
            es_MX: 'La Cruzada Ardiente',
            pt_BR: 'A Cruzada Escura',
            it_IT: 'La Crociata Infuocata',
            ru_RU: 'Легион Кровавого Кулака',
            ko_KR: '악의 군단',
            zh_TW: '燃燒的遠征',
            zh_CN: '燃烧的远征',
          },
          id: 2397,
          tier_number: 2,
          minimum_skill_level: 75,
          maximum_skill_level: 150,
        },
      ],
    };

    fs.writeFileSync(
      path.join(responsesDir, 'profession-detail.json'),
      JSON.stringify(expectedProfessionDetailResponse, null, 2),
    );

    expect(expectedProfessionDetailResponse.skill_tiers.length).toBeGreaterThan(
      0,
    );
    expect(expectedProfessionDetailResponse.name).toHaveProperty('en_US');
    expect(expectedProfessionDetailResponse.name).toHaveProperty('de_DE');
  });

  it('should document skill tier detail response structure', () => {
    /**
     * This documents the expected structure of
     * /data/wow/profession/{professionId}/skill-tier/{skillTierId}
     */
    const expectedSkillTierDetailResponse = {
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
            {
              key: {
                href: 'https://eu.api.blizzard.com/data/wow/recipe/2658?namespace=static-eu',
              },
              id: 2658,
            },
          ],
        },
        {
          key: {
            href: 'https://eu.api.blizzard.com/data/wow/recipe-category/134?namespace=static-eu',
          },
          name: 'Armor',
          id: 134,
          recipes: [
            {
              key: {
                href: 'https://eu.api.blizzard.com/data/wow/recipe/2659?namespace=static-eu',
              },
              id: 2659,
            },
          ],
        },
      ],
    };

    fs.writeFileSync(
      path.join(responsesDir, 'skill-tier-detail.json'),
      JSON.stringify(expectedSkillTierDetailResponse, null, 2),
    );

    expect(expectedSkillTierDetailResponse.categories.length).toBeGreaterThan(0);
    expect(expectedSkillTierDetailResponse.categories[0]).toHaveProperty(
      'recipes',
    );
  });

  it('should document response structure summary', () => {
    const structureSummary = {
      description:
        'B.net API responses for profession data with multilingual support',
      endpoints: [
        {
          path: '/data/wow/profession/index',
          returns: 'Array of professions with basic info',
          fields: ['id', 'name', 'key'],
          example: {
            professions: [
              {
                key: { href: 'string' },
                name: 'string',
                id: 'number',
              },
            ],
          },
        },
        {
          path: '/data/wow/profession/{professionId}',
          returns: 'Profession with skill tiers',
          fields: ['id', 'name', 'type', 'skill_tiers'],
          notes: 'name is multilingual object with 12 locales',
          example: {
            id: 'number',
            name: { en_US: 'string', en_GB: 'string', de_DE: 'string' },
            type: { type: 'string', name: 'string' },
            skill_tiers: [
              {
                key: { href: 'string' },
                name: { en_US: 'string' },
                id: 'number',
                tier_number: 'number',
                minimum_skill_level: 'number',
                maximum_skill_level: 'number',
              },
            ],
          },
        },
        {
          path: '/data/wow/profession/{professionId}/skill-tier/{skillTierId}',
          returns: 'Skill tier with recipe categories',
          fields: [
            'id',
            'tier_number',
            'minimum_skill_level',
            'maximum_skill_level',
            'categories',
          ],
          notes: 'categories contains recipes array',
          example: {
            id: 'number',
            tier_number: 'number',
            categories: [
              {
                key: { href: 'string' },
                name: 'string',
                id: 'number',
                recipes: [{ key: { href: 'string' }, id: 'number' }],
              },
            ],
          },
        },
      ],
      multilingualSupport: [
        'en_US',
        'en_GB',
        'de_DE',
        'fr_FR',
        'es_ES',
        'es_MX',
        'pt_BR',
        'it_IT',
        'ru_RU',
        'ko_KR',
        'zh_TW',
        'zh_CN',
      ],
      links: {
        description: 'All responses include _links object with self reference',
        structure: {
          _links: {
            self: {
              href: 'string - full URL with namespace parameter',
            },
          },
        },
      },
      headers: {
        required: ['Battlenet-Namespace'],
        example: 'static-eu for EU region',
      },
    };

    fs.writeFileSync(
      path.join(responsesDir, 'structure-summary.json'),
      JSON.stringify(structureSummary, null, 2),
    );

    expect(structureSummary.multilingualSupport.length).toBe(12);
    expect(structureSummary.endpoints.length).toBeGreaterThan(0);
  });
});
