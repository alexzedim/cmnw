/**
 * MILLING CONVERSIONS - Herb to Pigment
 * Extracted from TradeSkillMaster with comprehensive metadata
 *
 * Data Structure Enhancement:
 * - matRate: Drop rate chance (0.03 = 3%, 1.0 = 100%)
 * - minAmount: Minimum pigments received per herb
 * - maxAmount: Maximum pigments received per herb
 * - amountOfMats: Average expected output per herb (calculated from matRate and amounts)
 *
 * Example:
 * { matRate: 0.03, minAmount: 1, maxAmount: 1, amountOfMats: 0.03 }
 * = 3% chance to get 1 pigment, averaging 0.03 pigments per herb
 *
 * Quality Tiers (Dragonflight+):
 * - sourceQuality: Input herb quality (1=Poor, 2=Common, 3=Rare)
 * - targetQuality: Output pigment quality (1=Poor, 2=Common, 3=Rare)
 */

import {
  DMA_SOURCE,
  EXPANSION_TICKER,
  EXPANSION_TICKER_ID,
  PROFESSION_TICKER,
} from '@app/resources/constants';

// Profession ID for Inscription is 773
const PROF_INSC = PROFESSION_TICKER.INSC;

export const MILLING = {
  name: PROF_INSC,
  profession: PROF_INSC,
  media: 'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg',
  spellId: 51005,
  methods: [
    // ========================================================================
    // CLASSIC ERA - Common Pigments (100% drop, 2-4 per herb)
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Silverleaf', target: 'Alabaster Pigment' },
      description:
        'Silverleaf (i:765) → Alabaster Pigment (i:39151) [1 → 0.578] (100% drop, common)',
      reagents: [{ itemId: 765, quantity: 1 }],
      derivatives: [
        {
          itemId: 39151,
          quantity: 0.578, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output (2-4 per herb for classic commons)
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Peacebloom', target: 'Alabaster Pigment' },
      description:
        'Peacebloom (i:2447) → Alabaster Pigment (i:39151) [1 → 0.578] (100% drop, common)',
      reagents: [{ itemId: 2447, quantity: 1 }],
      derivatives: [
        {
          itemId: 39151,
          quantity: 0.578, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Earthroot', target: 'Alabaster Pigment' },
      description:
        'Earthroot (i:2449) → Alabaster Pigment (i:39151) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 2449, quantity: 1 }],
      derivatives: [
        {
          itemId: 39151,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Mageroyal', target: 'Dusky Pigment' },
      description:
        'Mageroyal (i:785) → Dusky Pigment (i:39334) [1 → 0.566] (100% drop, common)',
      reagents: [{ itemId: 785, quantity: 1 }],
      derivatives: [
        {
          itemId: 39334,
          quantity: 0.566, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Briarthorn', target: 'Dusky Pigment' },
      description:
        'Briarthorn (i:2450) → Dusky Pigment (i:39334) [1 → 0.5765] (100% drop, common)',
      reagents: [{ itemId: 2450, quantity: 1 }],
      derivatives: [
        {
          itemId: 39334,
          quantity: 0.5765, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Swiftthistle', target: 'Dusky Pigment' },
      description:
        'Swiftthistle (i:2452) → Dusky Pigment (i:39334) [1 → 0.5855] (100% drop, common)',
      reagents: [{ itemId: 2452, quantity: 1 }],
      derivatives: [
        {
          itemId: 39334,
          quantity: 0.5855, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Stranglekelp', target: 'Dusky Pigment' },
      description:
        'Stranglekelp (i:3820) → Dusky Pigment (i:39334) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 3820, quantity: 1 }],
      derivatives: [
        {
          itemId: 39334,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bruiseweed', target: 'Dusky Pigment' },
      description:
        'Bruiseweed (i:2453) → Dusky Pigment (i:39334) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 2453, quantity: 1 }],
      derivatives: [
        {
          itemId: 39334,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Wild Steelbloom', target: 'Burnt Pigment' },
      description:
        'Wild Steelbloom (i:3355) → Burnt Pigment (i:43104) [1 → 0.0545]',
      reagents: [{ itemId: 3355, quantity: 1 }],
      derivatives: [{ itemId: 43104, quantity: 0.0545 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Indigo Pigment', target: 'Indigo Pigment' },
      description:
        "Indigo Pigment group (Fadeleaf, Goldthorn, Khadgar's Whisker, Wintersbite)",
      reagents: [{ itemId: 3818, quantity: 1 }],
      derivatives: [{ itemId: 43105, quantity: 0.0545 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Goldthorn', target: 'Indigo Pigment' },
      description: 'Goldthorn (i:3821) → Indigo Pigment (i:43105) [1 → 0.0545]',
      reagents: [{ itemId: 3821, quantity: 1 }],
      derivatives: [{ itemId: 43105, quantity: 0.0545 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Khadgar's Whisker", target: 'Indigo Pigment' },
      description:
        "Khadgar's Whisker (i:3358) → Indigo Pigment (i:43105) [1 → 0.1075]",
      reagents: [{ itemId: 3358, quantity: 1 }],
      derivatives: [{ itemId: 43105, quantity: 0.1075 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Wintersbite', target: 'Indigo Pigment' },
      description:
        'Wintersbite (i:3819) → Indigo Pigment (i:43105) [1 → 0.1075]',
      reagents: [{ itemId: 3819, quantity: 1 }],
      derivatives: [{ itemId: 43105, quantity: 0.1075 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Grave Moss', target: 'Golden Pigment' },
      description:
        'Grave Moss (i:3369) → Golden Pigment (i:39338) [1 → 0.5765]',
      reagents: [{ itemId: 3369, quantity: 1 }],
      derivatives: [{ itemId: 39338, quantity: 0.5765 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Kingsblood', target: 'Golden Pigment' },
      description: 'Kingsblood (i:3356) → Golden Pigment (i:39338) [1 → 0.6]',
      reagents: [{ itemId: 3356, quantity: 1 }],
      derivatives: [{ itemId: 39338, quantity: 0.6 }],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Liferoot', target: 'Golden Pigment' },
      description: 'Liferoot (i:3357) → Golden Pigment (i:39338) [1 → 0.6]',
      reagents: [{ itemId: 3357, quantity: 1 }],
      derivatives: [{ itemId: 39338, quantity: 0.6 }],
    },

    // ========================================================================
    // CLASSIC ERA - Uncommon Pigments (42-50% drop, 1-3 per herb)
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Mageroyal', target: 'Verdant Pigment' },
      description:
        'Mageroyal (i:785) → Verdant Pigment (i:43103) [1 → 0.0545] (42% drop, uncommon)',
      reagents: [{ itemId: 785, quantity: 1 }],
      derivatives: [
        {
          itemId: 43103,
          quantity: 0.0545, // amountOfMats
          matRate: 0.42, // 42% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Briarthorn', target: 'Verdant Pigment' },
      description:
        'Briarthorn (i:2450) → Verdant Pigment (i:43103) [1 → 0.0545] (46.5% drop, uncommon)',
      reagents: [{ itemId: 2450, quantity: 1 }],
      derivatives: [
        {
          itemId: 43103,
          quantity: 0.0545, // amountOfMats
          matRate: 0.465, // 46.5% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Swiftthistle', target: 'Verdant Pigment' },
      description:
        'Swiftthistle (i:2452) → Verdant Pigment (i:43103) [1 → 0.0545] (50% drop, uncommon)',
      reagents: [{ itemId: 2452, quantity: 1 }],
      derivatives: [
        {
          itemId: 43103,
          quantity: 0.0545, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Stranglekelp', target: 'Verdant Pigment' },
      description:
        'Stranglekelp (i:3820) → Verdant Pigment (i:43103) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 3820, quantity: 1 }],
      derivatives: [
        {
          itemId: 43103,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bruiseweed', target: 'Verdant Pigment' },
      description:
        'Bruiseweed (i:2453) → Verdant Pigment (i:43103) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 2453, quantity: 1 }],
      derivatives: [
        {
          itemId: 43103,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },

    // ========================================================================
    // SHADOWLANDS - Umbral & Luminous Pigments (complete coverage)
    // ========================================================================
    // Umbral Pigment - Rising Glory
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Rising Glory', target: 'Umbral Pigment' },
      description:
        'Rising Glory (i:168586) → Umbral Pigment (i:173056) [1 → 0.195]',
      reagents: [{ itemId: 168586, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.195 }],
    },
    // Umbral Pigment - Vigil's Torch
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Vigil's Torch", target: 'Umbral Pigment' },
      description:
        "Vigil's Torch (i:170554) → Umbral Pigment (i:173056) [1 → 0.195]",
      reagents: [{ itemId: 170554, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.195 }],
    },
    // Umbral Pigment - Death Blossom
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Death Blossom', target: 'Umbral Pigment' },
      description:
        'Death Blossom (i:169701) → Umbral Pigment (i:173056) [1 → 0.15]',
      reagents: [{ itemId: 169701, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.15 }],
    },
    // Umbral Pigment - Marrowroot
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Marrowroot', target: 'Umbral Pigment' },
      description:
        'Marrowroot (i:168589) → Umbral Pigment (i:173056) [1 → 0.195]',
      reagents: [{ itemId: 168589, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.195 }],
    },
    // Umbral Pigment - Widowbloom
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Widowbloom', target: 'Umbral Pigment' },
      description:
        'Widowbloom (i:168583) → Umbral Pigment (i:173056) [1 → 0.195]',
      reagents: [{ itemId: 168583, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.195 }],
    },
    // Umbral Pigment - Nightshade
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Nightshade', target: 'Umbral Pigment' },
      description:
        'Nightshade (i:171315) → Umbral Pigment (i:173056) [1 → 0.25]',
      reagents: [{ itemId: 171315, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.25 }],
    },
    // Umbral Pigment - First Flower
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'First Flower', target: 'Umbral Pigment' },
      description:
        'First Flower (i:187699) → Umbral Pigment (i:173056) [1 → 0.25]',
      reagents: [{ itemId: 187699, quantity: 1 }],
      derivatives: [{ itemId: 173056, quantity: 0.25 }],
    },
    // Luminous Pigment - Widowbloom
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Widowbloom', target: 'Luminous Pigment' },
      description:
        'Widowbloom (i:168583) → Luminous Pigment (i:173057) [1 → 0.105]',
      reagents: [{ itemId: 168583, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.105 }],
    },
    // Luminous Pigment - Marrowroot
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Marrowroot', target: 'Luminous Pigment' },
      description:
        'Marrowroot (i:168589) → Luminous Pigment (i:173057) [1 → 0.105]',
      reagents: [{ itemId: 168589, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.105 }],
    },
    // Luminous Pigment - Death Blossom
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Death Blossom', target: 'Luminous Pigment' },
      description:
        'Death Blossom (i:169701) → Luminous Pigment (i:173057) [1 → 0.15]',
      reagents: [{ itemId: 169701, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.15 }],
    },
    // Luminous Pigment - Rising Glory
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Rising Glory', target: 'Luminous Pigment' },
      description:
        'Rising Glory (i:168586) → Luminous Pigment (i:173057) [1 → 0.195]',
      reagents: [{ itemId: 168586, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.195 }],
    },
    // Luminous Pigment - Vigil's Torch
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Vigil's Torch", target: 'Luminous Pigment' },
      description:
        "Vigil's Torch (i:170554) → Luminous Pigment (i:173057) [1 → 0.195]",
      reagents: [{ itemId: 170554, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.195 }],
    },
    // Luminous Pigment - Nightshade
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Nightshade', target: 'Luminous Pigment' },
      description:
        'Nightshade (i:171315) → Luminous Pigment (i:173057) [1 → 0.25]',
      reagents: [{ itemId: 171315, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.25 }],
    },
    // Luminous Pigment - First Flower
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'First Flower', target: 'Luminous Pigment' },
      description:
        'First Flower (i:187699) → Luminous Pigment (i:173057) [1 → 0.5]',
      reagents: [{ itemId: 187699, quantity: 1 }],
      derivatives: [{ itemId: 173057, quantity: 0.5 }],
    },
    // Tranquil Pigment - Widowbloom (3% drop, rare specialty)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Widowbloom', target: 'Tranquil Pigment' },
      description:
        'Widowbloom (i:168583) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
      reagents: [{ itemId: 168583, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.03, // 3% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Tranquil Pigment - Marrowroot (3% drop, rare specialty)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Marrowroot', target: 'Tranquil Pigment' },
      description:
        'Marrowroot (i:168589) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
      reagents: [{ itemId: 168589, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.03, // 3% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Tranquil Pigment - Rising Glory (3% drop, rare specialty)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Rising Glory', target: 'Tranquil Pigment' },
      description:
        'Rising Glory (i:168586) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
      reagents: [{ itemId: 168586, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.03, // 3% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Tranquil Pigment - Vigil's Torch (3% drop, rare specialty)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Vigil's Torch", target: 'Tranquil Pigment' },
      description:
        "Vigil's Torch (i:170554) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)",
      reagents: [{ itemId: 170554, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.03, // 3% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Tranquil Pigment - Death Blossom (3% drop, rare specialty)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Death Blossom', target: 'Tranquil Pigment' },
      description:
        'Death Blossom (i:169701) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
      reagents: [{ itemId: 169701, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.03, // 3% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Tranquil Pigment - Nightshade (100% drop, guaranteed but lower yield)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Nightshade', target: 'Tranquil Pigment' },
      description:
        'Nightshade (i:171315) → Tranquil Pigment (i:175788) [1 → 0.3] (100% drop, best specialist herb)',
      reagents: [{ itemId: 171315, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.3, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 1, // min output
          maxAmount: 2, // max output
        },
      ],
    },
    // Tranquil Pigment - First Flower (100% drop, highest yield)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'First Flower', target: 'Tranquil Pigment' },
      description:
        'First Flower (i:187699) → Tranquil Pigment (i:175788) [1 → 0.5] (100% drop, highest yield)',
      reagents: [{ itemId: 187699, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.5, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Multi-Quality Pigments
    // ========================================================================
    // ========================================================================
    // DRAGONFLIGHT - Shimmering, Blazing, Serene, Flourishing Pigments
    // ========================================================================
    // Shimmering Pigment * (Hochenblume *)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume *', target: 'Shimmering Pigment *' },
      description:
        'Hochenblume * (i:191460) → Shimmering Pigment * (i:198421) [1 → 0.7]',
      reagents: [{ itemId: 191460, quantity: 1 }],
      derivatives: [
        { itemId: 198421, quantity: 0.7, targetQuality: 1, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume **', target: 'Shimmering Pigment *' },
      description:
        'Hochenblume ** (i:191461) → Shimmering Pigment * (i:198421) [1 → 0.7]',
      reagents: [{ itemId: 191461, quantity: 1 }],
      derivatives: [
        { itemId: 198421, quantity: 0.7, targetQuality: 1, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume ***', target: 'Shimmering Pigment *' },
      description:
        'Hochenblume *** (i:191462) → Shimmering Pigment * (i:198421) [1 → 0.7]',
      reagents: [{ itemId: 191462, quantity: 1 }],
      derivatives: [
        { itemId: 198421, quantity: 0.7, targetQuality: 1, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Shimmering Pigment *' },
      description:
        'Prismatic Leaper (i:200061) → Shimmering Pigment * (i:198421) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198421,
          quantity: 0.1723,
          targetQuality: 1,
          sourceQuality: 1,
        },
      ],
    },
    // Shimmering Pigment ** (Hochenblume *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume *', target: 'Shimmering Pigment **' },
      description:
        'Hochenblume * (i:191460) → Shimmering Pigment ** (i:198422) [1 → 0.7]',
      reagents: [{ itemId: 191460, quantity: 1 }],
      derivatives: [
        { itemId: 198422, quantity: 0.7, targetQuality: 2, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume **', target: 'Shimmering Pigment **' },
      description:
        'Hochenblume ** (i:191461) → Shimmering Pigment ** (i:198422) [1 → 0.7]',
      reagents: [{ itemId: 191461, quantity: 1 }],
      derivatives: [
        { itemId: 198422, quantity: 0.7, targetQuality: 2, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume ***', target: 'Shimmering Pigment **' },
      description:
        'Hochenblume *** (i:191462) → Shimmering Pigment ** (i:198422) [1 → 0.7]',
      reagents: [{ itemId: 191462, quantity: 1 }],
      derivatives: [
        { itemId: 198422, quantity: 0.7, targetQuality: 2, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Shimmering Pigment **' },
      description:
        'Prismatic Leaper (i:200061) → Shimmering Pigment ** (i:198422) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198422,
          quantity: 0.1723,
          targetQuality: 2,
          sourceQuality: 1,
        },
      ],
    },
    // Shimmering Pigment *** (Hochenblume *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume *', target: 'Shimmering Pigment ***' },
      description:
        'Hochenblume * (i:191460) → Shimmering Pigment *** (i:198423) [1 → 0.7]',
      reagents: [{ itemId: 191460, quantity: 1 }],
      derivatives: [
        { itemId: 198423, quantity: 0.7, targetQuality: 3, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume **', target: 'Shimmering Pigment ***' },
      description:
        'Hochenblume ** (i:191461) → Shimmering Pigment *** (i:198423) [1 → 0.7]',
      reagents: [{ itemId: 191461, quantity: 1 }],
      derivatives: [
        { itemId: 198423, quantity: 0.7, targetQuality: 3, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume ***', target: 'Shimmering Pigment ***' },
      description:
        'Hochenblume *** (i:191462) → Shimmering Pigment *** (i:198423) [1 → 0.7]',
      reagents: [{ itemId: 191462, quantity: 1 }],
      derivatives: [
        { itemId: 198423, quantity: 0.7, targetQuality: 3, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Shimmering Pigment ***' },
      description:
        'Prismatic Leaper (i:200061) → Shimmering Pigment *** (i:198423) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198423,
          quantity: 0.1723,
          targetQuality: 3,
          sourceQuality: 1,
        },
      ],
    },
    // Blazing Pigment * (Saxifrage *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage *', target: 'Blazing Pigment *' },
      description:
        'Saxifrage * (i:191464) → Blazing Pigment * (i:198418) [1 → 0.7]',
      reagents: [{ itemId: 191464, quantity: 1 }],
      derivatives: [
        { itemId: 198418, quantity: 0.7, targetQuality: 1, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage **', target: 'Blazing Pigment *' },
      description:
        'Saxifrage ** (i:191465) → Blazing Pigment * (i:198418) [1 → 0.7]',
      reagents: [{ itemId: 191465, quantity: 1 }],
      derivatives: [
        { itemId: 198418, quantity: 0.7, targetQuality: 1, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage ***', target: 'Blazing Pigment *' },
      description:
        'Saxifrage *** (i:191466) → Blazing Pigment * (i:198418) [1 → 0.7]',
      reagents: [{ itemId: 191466, quantity: 1 }],
      derivatives: [
        { itemId: 198418, quantity: 0.7, targetQuality: 1, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Blazing Pigment *' },
      description:
        'Prismatic Leaper (i:200061) → Blazing Pigment * (i:198418) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198418,
          quantity: 0.1723,
          targetQuality: 1,
          sourceQuality: 1,
        },
      ],
    },
    // Blazing Pigment ** (Saxifrage *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage *', target: 'Blazing Pigment **' },
      description:
        'Saxifrage * (i:191464) → Blazing Pigment ** (i:198419) [1 → 0.7]',
      reagents: [{ itemId: 191464, quantity: 1 }],
      derivatives: [
        { itemId: 198419, quantity: 0.7, targetQuality: 2, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage **', target: 'Blazing Pigment **' },
      description:
        'Saxifrage ** (i:191465) → Blazing Pigment ** (i:198419) [1 → 0.7]',
      reagents: [{ itemId: 191465, quantity: 1 }],
      derivatives: [
        { itemId: 198419, quantity: 0.7, targetQuality: 2, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage ***', target: 'Blazing Pigment **' },
      description:
        'Saxifrage *** (i:191466) → Blazing Pigment ** (i:198419) [1 → 0.7]',
      reagents: [{ itemId: 191466, quantity: 1 }],
      derivatives: [
        { itemId: 198419, quantity: 0.7, targetQuality: 2, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Blazing Pigment **' },
      description:
        'Prismatic Leaper (i:200061) → Blazing Pigment ** (i:198419) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198419,
          quantity: 0.1723,
          targetQuality: 2,
          sourceQuality: 1,
        },
      ],
    },
    // Blazing Pigment *** (Saxifrage *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage *', target: 'Blazing Pigment ***' },
      description:
        'Saxifrage * (i:191464) → Blazing Pigment *** (i:198420) [1 → 0.7]',
      reagents: [{ itemId: 191464, quantity: 1 }],
      derivatives: [
        { itemId: 198420, quantity: 0.7, targetQuality: 3, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage **', target: 'Blazing Pigment ***' },
      description:
        'Saxifrage ** (i:191465) → Blazing Pigment *** (i:198420) [1 → 0.7]',
      reagents: [{ itemId: 191465, quantity: 1 }],
      derivatives: [
        { itemId: 198420, quantity: 0.7, targetQuality: 3, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage ***', target: 'Blazing Pigment ***' },
      description:
        'Saxifrage *** (i:191466) → Blazing Pigment *** (i:198420) [1 → 0.7]',
      reagents: [{ itemId: 191466, quantity: 1 }],
      derivatives: [
        { itemId: 198420, quantity: 0.7, targetQuality: 3, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Blazing Pigment ***' },
      description:
        'Prismatic Leaper (i:200061) → Blazing Pigment *** (i:198420) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198420,
          quantity: 0.1723,
          targetQuality: 3,
          sourceQuality: 1,
        },
      ],
    },
    // Serene Pigment * (Bubble Poppy *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy *', target: 'Serene Pigment *' },
      description:
        'Bubble Poppy * (i:191467) → Serene Pigment * (i:198412) [1 → 0.7]',
      reagents: [{ itemId: 191467, quantity: 1 }],
      derivatives: [
        { itemId: 198412, quantity: 0.7, targetQuality: 1, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy **', target: 'Serene Pigment *' },
      description:
        'Bubble Poppy ** (i:191468) → Serene Pigment * (i:198412) [1 → 0.7]',
      reagents: [{ itemId: 191468, quantity: 1 }],
      derivatives: [
        { itemId: 198412, quantity: 0.7, targetQuality: 1, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy ***', target: 'Serene Pigment *' },
      description:
        'Bubble Poppy *** (i:191469) → Serene Pigment * (i:198412) [1 → 0.7]',
      reagents: [{ itemId: 191469, quantity: 1 }],
      derivatives: [
        { itemId: 198412, quantity: 0.7, targetQuality: 1, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Serene Pigment *' },
      description:
        'Prismatic Leaper (i:200061) → Serene Pigment * (i:198412) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198412,
          quantity: 0.1723,
          targetQuality: 1,
          sourceQuality: 1,
        },
      ],
    },
    // Serene Pigment ** (Bubble Poppy *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy *', target: 'Serene Pigment **' },
      description:
        'Bubble Poppy * (i:191467) → Serene Pigment ** (i:198413) [1 → 0.7]',
      reagents: [{ itemId: 191467, quantity: 1 }],
      derivatives: [
        { itemId: 198413, quantity: 0.7, targetQuality: 2, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy **', target: 'Serene Pigment **' },
      description:
        'Bubble Poppy ** (i:191468) → Serene Pigment ** (i:198413) [1 → 0.7]',
      reagents: [{ itemId: 191468, quantity: 1 }],
      derivatives: [
        { itemId: 198413, quantity: 0.7, targetQuality: 2, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy ***', target: 'Serene Pigment **' },
      description:
        'Bubble Poppy *** (i:191469) → Serene Pigment ** (i:198413) [1 → 0.7]',
      reagents: [{ itemId: 191469, quantity: 1 }],
      derivatives: [
        { itemId: 198413, quantity: 0.7, targetQuality: 2, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Serene Pigment **' },
      description:
        'Prismatic Leaper (i:200061) → Serene Pigment ** (i:198413) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198413,
          quantity: 0.1723,
          targetQuality: 2,
          sourceQuality: 1,
        },
      ],
    },
    // Serene Pigment *** (Bubble Poppy *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy *', target: 'Serene Pigment ***' },
      description:
        'Bubble Poppy * (i:191467) → Serene Pigment *** (i:198414) [1 → 0.7]',
      reagents: [{ itemId: 191467, quantity: 1 }],
      derivatives: [
        { itemId: 198414, quantity: 0.7, targetQuality: 3, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy **', target: 'Serene Pigment ***' },
      description:
        'Bubble Poppy ** (i:191468) → Serene Pigment *** (i:198414) [1 → 0.7]',
      reagents: [{ itemId: 191468, quantity: 1 }],
      derivatives: [
        { itemId: 198414, quantity: 0.7, targetQuality: 3, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy ***', target: 'Serene Pigment ***' },
      description:
        'Bubble Poppy *** (i:191469) → Serene Pigment *** (i:198414) [1 → 0.7]',
      reagents: [{ itemId: 191469, quantity: 1 }],
      derivatives: [
        { itemId: 198414, quantity: 0.7, targetQuality: 3, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Serene Pigment ***' },
      description:
        'Prismatic Leaper (i:200061) → Serene Pigment *** (i:198414) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198414,
          quantity: 0.1723,
          targetQuality: 3,
          sourceQuality: 1,
        },
      ],
    },
    // Flourishing Pigment * (Writhebark *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark *', target: 'Flourishing Pigment *' },
      description:
        'Writhebark * (i:191470) → Flourishing Pigment * (i:198415) [1 → 0.7]',
      reagents: [{ itemId: 191470, quantity: 1 }],
      derivatives: [
        { itemId: 198415, quantity: 0.7, targetQuality: 1, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark **', target: 'Flourishing Pigment *' },
      description:
        'Writhebark ** (i:191471) → Flourishing Pigment * (i:198415) [1 → 0.7]',
      reagents: [{ itemId: 191471, quantity: 1 }],
      derivatives: [
        { itemId: 198415, quantity: 0.7, targetQuality: 1, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark ***', target: 'Flourishing Pigment *' },
      description:
        'Writhebark *** (i:191472) → Flourishing Pigment * (i:198415) [1 → 0.7]',
      reagents: [{ itemId: 191472, quantity: 1 }],
      derivatives: [
        { itemId: 198415, quantity: 0.7, targetQuality: 1, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Flourishing Pigment *' },
      description:
        'Prismatic Leaper (i:200061) → Flourishing Pigment * (i:198415) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198415,
          quantity: 0.1723,
          targetQuality: 1,
          sourceQuality: 1,
        },
      ],
    },
    // Flourishing Pigment ** (Writhebark *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark *', target: 'Flourishing Pigment **' },
      description:
        'Writhebark * (i:191470) → Flourishing Pigment ** (i:198416) [1 → 0.7]',
      reagents: [{ itemId: 191470, quantity: 1 }],
      derivatives: [
        { itemId: 198416, quantity: 0.7, targetQuality: 2, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark **', target: 'Flourishing Pigment **' },
      description:
        'Writhebark ** (i:191471) → Flourishing Pigment ** (i:198416) [1 → 0.7]',
      reagents: [{ itemId: 191471, quantity: 1 }],
      derivatives: [
        { itemId: 198416, quantity: 0.7, targetQuality: 2, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark ***', target: 'Flourishing Pigment **' },
      description:
        'Writhebark *** (i:191472) → Flourishing Pigment ** (i:198416) [1 → 0.7]',
      reagents: [{ itemId: 191472, quantity: 1 }],
      derivatives: [
        { itemId: 198416, quantity: 0.7, targetQuality: 2, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Flourishing Pigment **' },
      description:
        'Prismatic Leaper (i:200061) → Flourishing Pigment ** (i:198416) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198416,
          quantity: 0.1723,
          targetQuality: 2,
          sourceQuality: 1,
        },
      ],
    },
    // Flourishing Pigment *** (Writhebark *,**,***)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark *', target: 'Flourishing Pigment ***' },
      description:
        'Writhebark * (i:191470) → Flourishing Pigment *** (i:198417) [1 → 0.7]',
      reagents: [{ itemId: 191470, quantity: 1 }],
      derivatives: [
        { itemId: 198417, quantity: 0.7, targetQuality: 3, sourceQuality: 1 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark **', target: 'Flourishing Pigment ***' },
      description:
        'Writhebark ** (i:191471) → Flourishing Pigment *** (i:198417) [1 → 0.7]',
      reagents: [{ itemId: 191471, quantity: 1 }],
      derivatives: [
        { itemId: 198417, quantity: 0.7, targetQuality: 3, sourceQuality: 2 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark ***', target: 'Flourishing Pigment ***' },
      description:
        'Writhebark *** (i:191472) → Flourishing Pigment *** (i:198417) [1 → 0.7]',
      reagents: [{ itemId: 191472, quantity: 1 }],
      derivatives: [
        { itemId: 198417, quantity: 0.7, targetQuality: 3, sourceQuality: 3 },
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Flourishing Pigment ***' },
      description:
        'Prismatic Leaper (i:200061) → Flourishing Pigment *** (i:198417) [1 → 0.1723]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [
        {
          itemId: 198417,
          quantity: 0.1723,
          targetQuality: 3,
          sourceQuality: 1,
        },
      ],
    },
    // Rousing elementals from Prismatic Leaper (Dragonflight)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Rousing Fire' },
      description:
        'Prismatic Leaper (i:200061) → Rousing Fire (i:190320) [1 → 0.0019]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [{ itemId: 190320, quantity: 0.0019 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Rousing Frost' },
      description:
        'Prismatic Leaper (i:200061) → Rousing Frost (i:190328) [1 → 0.0019]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [{ itemId: 190328, quantity: 0.0019 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Rousing Order' },
      description:
        'Prismatic Leaper (i:200061) → Rousing Order (i:190322) [1 → 0.001]',
      reagents: [{ itemId: 200061, quantity: 1 }],
      derivatives: [{ itemId: 190322, quantity: 0.001 }],
    },

    // ========================================================================
    // BURNING CRUSADE - Nether Pigment (Ethereal Ink) (100% drop, 2-4 per herb)
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Terocone', target: 'Nether Pigment' },
      description:
        'Terocone (i:22789) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
      reagents: [{ itemId: 22789, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.56, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Ragveil', target: 'Nether Pigment' },
      description:
        'Ragveil (i:22787) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
      reagents: [{ itemId: 22787, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.56, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Felweed', target: 'Nether Pigment' },
      description:
        'Felweed (i:22785) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
      reagents: [{ itemId: 22785, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.56, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Dreaming Glory', target: 'Nether Pigment' },
      description:
        'Dreaming Glory (i:22786) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
      reagents: [{ itemId: 22786, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.56, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Nightmare Vine', target: 'Nether Pigment' },
      description:
        'Nightmare Vine (i:22792) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 22792, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Ancient Lichen', target: 'Nether Pigment' },
      description:
        'Ancient Lichen (i:22790) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 22790, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Netherbloom', target: 'Nether Pigment' },
      description:
        'Netherbloom (i:22791) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 22791, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Mana Thistle', target: 'Nether Pigment' },
      description:
        'Mana Thistle (i:22793) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 22793, quantity: 1 }],
      derivatives: [
        {
          itemId: 39342,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    // Ebon Pigment (Darkflame Ink) - TBC uncommon (40-50% drop, 1-3 per herb)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Terocone', target: 'Ebon Pigment' },
      description:
        'Terocone (i:22789) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
      reagents: [{ itemId: 22789, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.0875, // amountOfMats
          matRate: 0.4, // 40% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Ragveil', target: 'Ebon Pigment' },
      description:
        'Ragveil (i:22787) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
      reagents: [{ itemId: 22787, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.0875, // amountOfMats
          matRate: 0.4, // 40% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Felweed', target: 'Ebon Pigment' },
      description:
        'Felweed (i:22785) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
      reagents: [{ itemId: 22785, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.0875, // amountOfMats
          matRate: 0.4, // 40% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Dreaming Glory', target: 'Ebon Pigment' },
      description:
        'Dreaming Glory (i:22786) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
      reagents: [{ itemId: 22786, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.0875, // amountOfMats
          matRate: 0.4, // 40% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Ancient Lichen', target: 'Ebon Pigment' },
      description:
        'Ancient Lichen (i:22790) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 22790, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Netherbloom', target: 'Ebon Pigment' },
      description:
        'Netherbloom (i:22791) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 22791, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Nightmare Vine', target: 'Ebon Pigment' },
      description:
        'Nightmare Vine (i:22792) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 22792, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Mana Thistle', target: 'Ebon Pigment' },
      description:
        'Mana Thistle (i:22793) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 22793, quantity: 1 }],
      derivatives: [
        {
          itemId: 43108,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },

    // ========================================================================
    // WRATH OF THE LICH KING - Azure & Icy Pigments (100% drop, 2-4 per herb)
    // ========================================================================
    // Azure Pigment (Ink of the Sea) - WOTLK common
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Talandra's Rose", target: 'Azure Pigment' },
      description:
        "Talandra's Rose (i:36907) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)",
      reagents: [{ itemId: 36907, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.536, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Fire Leaf', target: 'Azure Pigment' },
      description:
        'Fire Leaf (i:39970) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
      reagents: [{ itemId: 39970, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.536, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Tiger Lily', target: 'Azure Pigment' },
      description:
        'Tiger Lily (i:36904) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
      reagents: [{ itemId: 36904, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.536, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Deadnettle', target: 'Azure Pigment' },
      description:
        'Deadnettle (i:37921) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
      reagents: [{ itemId: 37921, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.536, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Goldclover', target: 'Azure Pigment' },
      description:
        'Goldclover (i:36901) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
      reagents: [{ itemId: 36901, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.536, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Icethorn', target: 'Azure Pigment' },
      description:
        'Icethorn (i:36906) → Azure Pigment (i:39343) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 36906, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Lichbloom', target: 'Azure Pigment' },
      description:
        'Lichbloom (i:36905) → Azure Pigment (i:39343) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 36905, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Adder's Tongue", target: 'Azure Pigment' },
      description:
        "Adder's Tongue (i:36903) → Azure Pigment (i:39343) [1 → 0.6] (100% drop, common)",
      reagents: [{ itemId: 36903, quantity: 1 }],
      derivatives: [
        {
          itemId: 39343,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    // Icy Pigment (Snowfall Ink) - WOTLK uncommon (33-50% drop, 1-3 per herb)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Talandra's Rose", target: 'Icy Pigment' },
      description:
        "Talandra's Rose (i:36907) → Icy Pigment (i:43109) [1 → 0.0755] (33% drop, uncommon)",
      reagents: [{ itemId: 36907, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.0755, // amountOfMats
          matRate: 0.33, // 33% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Fire Leaf', target: 'Icy Pigment' },
      description:
        'Fire Leaf (i:39970) → Icy Pigment (i:43109) [1 → 0.0795] (33% drop, uncommon)',
      reagents: [{ itemId: 39970, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.0795, // amountOfMats
          matRate: 0.33, // 33% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Tiger Lily', target: 'Icy Pigment' },
      description:
        'Tiger Lily (i:36904) → Icy Pigment (i:43109) [1 → 0.0835] (33% drop, uncommon)',
      reagents: [{ itemId: 36904, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.0835, // amountOfMats
          matRate: 0.33, // 33% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Deadnettle', target: 'Icy Pigment' },
      description:
        'Deadnettle (i:37921) → Icy Pigment (i:43109) [1 → 0.0875] (40% drop, uncommon)',
      reagents: [{ itemId: 37921, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.0875, // amountOfMats
          matRate: 0.4, // 40% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Goldclover', target: 'Icy Pigment' },
      description:
        'Goldclover (i:36901) → Icy Pigment (i:43109) [1 → 0.0875] (40% drop, uncommon)',
      reagents: [{ itemId: 36901, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.0875, // amountOfMats
          matRate: 0.4, // 40% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Adder's Tongue", target: 'Icy Pigment' },
      description:
        "Adder's Tongue (i:36903) → Icy Pigment (i:43109) [1 → 0.1075] (50% drop, uncommon)",
      reagents: [{ itemId: 36903, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Lichbloom', target: 'Icy Pigment' },
      description:
        'Lichbloom (i:36905) → Icy Pigment (i:43109) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 36905, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Icethorn', target: 'Icy Pigment' },
      description:
        'Icethorn (i:36906) → Icy Pigment (i:43109) [1 → 0.1075] (50% drop, uncommon)',
      reagents: [{ itemId: 36906, quantity: 1 }],
      derivatives: [
        {
          itemId: 43109,
          quantity: 0.1075, // amountOfMats
          matRate: 0.5, // 50% drop chance
          minAmount: 1, // min output
          maxAmount: 3, // max output
        },
      ],
    },

    // ========================================================================
    // CATAACLYSM - Ashen & Burning Pigments (100% drop, 2-4 per herb)
    // ========================================================================
    // Ashen Pigment (Blackfallow Ink) - CATAaclysm common
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Azshara's Veil", target: 'Ashen Pigment' },
      description:
        "Azshara's Veil (i:52985) → Ashen Pigment (i:61979) [1 → 0.56] (100% drop, common)",
      reagents: [{ itemId: 52985, quantity: 1 }],
      derivatives: [
        {
          itemId: 61979,
          quantity: 0.56, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Cinderbloom', target: 'Ashen Pigment' },
      description:
        'Cinderbloom (i:52983) → Ashen Pigment (i:61979) [1 → 0.56] (100% drop, common)',
      reagents: [{ itemId: 52983, quantity: 1 }],
      derivatives: [
        {
          itemId: 61979,
          quantity: 0.56, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Stormvine', target: 'Ashen Pigment' },
      description:
        'Stormvine (i:52984) → Ashen Pigment (i:61979) [1 → 0.5855] (100% drop, common)',
      reagents: [{ itemId: 52984, quantity: 1 }],
      derivatives: [
        {
          itemId: 61979,
          quantity: 0.5855, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Heartblossom', target: 'Ashen Pigment' },
      description:
        'Heartblossom (i:52986) → Ashen Pigment (i:61979) [1 → 0.5855] (100% drop, common)',
      reagents: [{ itemId: 52986, quantity: 1 }],
      derivatives: [
        {
          itemId: 61979,
          quantity: 0.5855, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Whiptail', target: 'Ashen Pigment' },
      description:
        'Whiptail (i:52988) → Ashen Pigment (i:61979) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 52988, quantity: 1 }],
      derivatives: [
        {
          itemId: 61979,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Twilight Jasmine', target: 'Ashen Pigment' },
      description:
        'Twilight Jasmine (i:52987) → Ashen Pigment (i:61979) [1 → 0.6] (100% drop, common)',
      reagents: [{ itemId: 52987, quantity: 1 }],
      derivatives: [
        {
          itemId: 61979,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    // Burning Embers (Inferno Ink) - CATAaclysm uncommon (10% drop, 1 per herb)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Azshara's Veil", target: 'Burning Embers' },
      description:
        "Azshara's Veil (i:52985) → Burning Embers (i:61980) [1 → 0.0875] (10% drop, uncommon)",
      reagents: [{ itemId: 52985, quantity: 1 }],
      derivatives: [
        {
          itemId: 61980,
          quantity: 0.0875, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Cinderbloom', target: 'Burning Embers' },
      description:
        'Cinderbloom (i:52983) → Burning Embers (i:61980) [1 → 0.0915] (10% drop, uncommon)',
      reagents: [{ itemId: 52983, quantity: 1 }],
      derivatives: [
        {
          itemId: 61980,
          quantity: 0.0915, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Stormvine', target: 'Burning Embers' },
      description:
        'Stormvine (i:52984) → Burning Embers (i:61980) [1 → 0.0995] (10% drop, uncommon)',
      reagents: [{ itemId: 52984, quantity: 1 }],
      derivatives: [
        {
          itemId: 61980,
          quantity: 0.0995, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Heartblossom', target: 'Burning Embers' },
      description:
        'Heartblossom (i:52986) → Burning Embers (i:61980) [1 → 0.0955] (10% drop, uncommon)',
      reagents: [{ itemId: 52986, quantity: 1 }],
      derivatives: [
        {
          itemId: 61980,
          quantity: 0.0955, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Whiptail', target: 'Burning Embers' },
      description:
        'Whiptail (i:52988) → Burning Embers (i:61980) [1 → 0.1075] (10% drop, uncommon)',
      reagents: [{ itemId: 52988, quantity: 1 }],
      derivatives: [
        {
          itemId: 61980,
          quantity: 0.1075, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Twilight Jasmine', target: 'Burning Embers' },
      description:
        'Twilight Jasmine (i:52987) → Burning Embers (i:61980) [1 → 0.1075] (10% drop, uncommon)',
      reagents: [{ itemId: 52987, quantity: 1 }],
      derivatives: [
        {
          itemId: 61980,
          quantity: 0.1075, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },

    // ========================================================================
    // MISTS OF PANDARIA - Shadow & Misty Pigments (100% drop, 2-4 per herb)
    // ========================================================================
    // Shadow Pigment (Ink of Dreams) - MoP common
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Green Tea Leaf', target: 'Shadow Pigment' },
      description:
        'Green Tea Leaf (i:72234) → Shadow Pigment (i:79251) [1 → 0.566] (100% drop, common)',
      reagents: [{ itemId: 72234, quantity: 1 }],
      derivatives: [
        {
          itemId: 79251,
          quantity: 0.566, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Rain Poppy', target: 'Shadow Pigment' },
      description:
        'Rain Poppy (i:72237) → Shadow Pigment (i:79251) [1 → 0.572] (100% drop, common)',
      reagents: [{ itemId: 72237, quantity: 1 }],
      derivatives: [
        {
          itemId: 79251,
          quantity: 0.572, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Silkweed', target: 'Shadow Pigment' },
      description:
        'Silkweed (i:72235) → Shadow Pigment (i:79251) [1 → 0.572] (100% drop, common)',
      reagents: [{ itemId: 72235, quantity: 1 }],
      derivatives: [
        {
          itemId: 79251,
          quantity: 0.572, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Desecrated Herb', target: 'Shadow Pigment' },
      description:
        'Desecrated Herb (i:89639) → Shadow Pigment (i:79251) [1 → 0.578] (100% drop, common)',
      reagents: [{ itemId: 89639, quantity: 1 }],
      derivatives: [
        {
          itemId: 79251,
          quantity: 0.578, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Snow Lily', target: 'Shadow Pigment' },
      description:
        'Snow Lily (i:79010) → Shadow Pigment (i:79251) [1 → 0.578] (100% drop, common)',
      reagents: [{ itemId: 79010, quantity: 1 }],
      derivatives: [
        {
          itemId: 79251,
          quantity: 0.578, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Fool's Cap", target: 'Shadow Pigment' },
      description:
        "Fool's Cap (i:79011) → Shadow Pigment (i:79251) [1 → 0.6] (100% drop, common)",
      reagents: [{ itemId: 79011, quantity: 1 }],
      derivatives: [
        {
          itemId: 79251,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    // Misty Pigment (Starlight Ink) - MoP uncommon (10% drop, 1 per herb)
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Green Tea Leaf', target: 'Misty Pigment' },
      description:
        'Green Tea Leaf (i:72234) → Misty Pigment (i:79253) [1 → 0.086] (10% drop, uncommon)',
      reagents: [{ itemId: 72234, quantity: 1 }],
      derivatives: [
        {
          itemId: 79253,
          quantity: 0.086, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Rain Poppy', target: 'Misty Pigment' },
      description:
        'Rain Poppy (i:72237) → Misty Pigment (i:79253) [1 → 0.09] (10% drop, uncommon)',
      reagents: [{ itemId: 72237, quantity: 1 }],
      derivatives: [
        {
          itemId: 79253,
          quantity: 0.09, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Silkweed', target: 'Misty Pigment' },
      description:
        'Silkweed (i:72235) → Misty Pigment (i:79253) [1 → 0.09] (10% drop, uncommon)',
      reagents: [{ itemId: 72235, quantity: 1 }],
      derivatives: [
        {
          itemId: 79253,
          quantity: 0.09, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Desecrated Herb', target: 'Misty Pigment' },
      description:
        'Desecrated Herb (i:89639) → Misty Pigment (i:79253) [1 → 0.094] (10% drop, uncommon)',
      reagents: [{ itemId: 89639, quantity: 1 }],
      derivatives: [
        {
          itemId: 79253,
          quantity: 0.094, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Snow Lily', target: 'Misty Pigment' },
      description:
        'Snow Lily (i:79010) → Misty Pigment (i:79253) [1 → 0.094] (10% drop, uncommon)',
      reagents: [{ itemId: 79010, quantity: 1 }],
      derivatives: [
        {
          itemId: 79253,
          quantity: 0.094, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Fool's Cap", target: 'Misty Pigment' },
      description:
        "Fool's Cap (i:79011) → Misty Pigment (i:79253) [1 → 0.1075] (10% drop, uncommon)",
      reagents: [{ itemId: 79011, quantity: 1 }],
      derivatives: [
        {
          itemId: 79253,
          quantity: 0.1075, // amountOfMats
          matRate: 0.1, // 10% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },

    // ========================================================================
    // WARLORDS OF DRAENOR - Cerulean Pigment (100% drop, 2-3 per herb)
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Frostweed', target: 'Cerulean Pigment' },
      description:
        'Frostweed (i:109124) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 109124, quantity: 1 }],
      derivatives: [
        {
          itemId: 114931,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Fireweed', target: 'Cerulean Pigment' },
      description:
        'Fireweed (i:109125) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 109125, quantity: 1 }],
      derivatives: [
        {
          itemId: 114931,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Gorgrond Flytrap', target: 'Cerulean Pigment' },
      description:
        'Gorgrond Flytrap (i:109126) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 109126, quantity: 1 }],
      derivatives: [
        {
          itemId: 114931,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Starflower', target: 'Cerulean Pigment' },
      description:
        'Starflower (i:109127) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 109127, quantity: 1 }],
      derivatives: [
        {
          itemId: 114931,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Nagrand Arrowbloom', target: 'Cerulean Pigment' },
      description:
        'Nagrand Arrowbloom (i:109128) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 109128, quantity: 1 }],
      derivatives: [
        {
          itemId: 114931,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Talador Orchid', target: 'Cerulean Pigment' },
      description:
        'Talador Orchid (i:109129) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 109129, quantity: 1 }],
      derivatives: [
        {
          itemId: 114931,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },

    // ========================================================================
    // LEGION - Roseate & Sallow Pigments (100% drop for common, 5% for uncommon)
    // ========================================================================
    // Roseate Pigment - Legion common (100% drop, 2-3 per herb)
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Aethril', target: 'Roseate Pigment' },
      description:
        'Aethril (i:124101) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 124101, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Astral Glory', target: 'Roseate Pigment' },
      description:
        'Astral Glory (i:151565) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 151565, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Dreamleaf', target: 'Roseate Pigment' },
      description:
        'Dreamleaf (i:124102) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 124102, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Foxflower', target: 'Roseate Pigment' },
      description:
        'Foxflower (i:124103) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 124103, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Felwort', target: 'Roseate Pigment' },
      description:
        'Felwort (i:124106) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
      reagents: [{ itemId: 124106, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 0.42, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Fjarnskaggl', target: 'Roseate Pigment' },
      description:
        'Fjarnskaggl (i:124104) → Roseate Pigment (i:129032) [1 → 0.466] (100% drop, common)',
      reagents: [{ itemId: 124104, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 0.466, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Starlight Rose', target: 'Roseate Pigment' },
      description:
        'Starlight Rose (i:124105) → Roseate Pigment (i:129032) [1 → 1.212] (100% drop, common)',
      reagents: [{ itemId: 124105, quantity: 1 }],
      derivatives: [
        {
          itemId: 129032,
          quantity: 1.212, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },
    // Sallow Pigment - Legion uncommon (5% drop, 1 per herb)
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Aethril', target: 'Sallow Pigment' },
      description:
        'Aethril (i:124101) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
      reagents: [{ itemId: 124101, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 0.044, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Astral Glory', target: 'Sallow Pigment' },
      description:
        'Astral Glory (i:151565) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
      reagents: [{ itemId: 151565, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 0.044, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Dreamleaf', target: 'Sallow Pigment' },
      description:
        'Dreamleaf (i:124102) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
      reagents: [{ itemId: 124102, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 0.044, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Foxflower', target: 'Sallow Pigment' },
      description:
        'Foxflower (i:124103) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
      reagents: [{ itemId: 124103, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 0.044, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Starlight Rose', target: 'Sallow Pigment' },
      description:
        'Starlight Rose (i:124105) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
      reagents: [{ itemId: 124105, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 0.044, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Fjarnskaggl', target: 'Sallow Pigment' },
      description:
        'Fjarnskaggl (i:124104) → Sallow Pigment (i:129034) [1 → 0.0495] (5% drop, uncommon)',
      reagents: [{ itemId: 124104, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 0.0495, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Felwort', target: 'Sallow Pigment' },
      description:
        'Felwort (i:124106) → Sallow Pigment (i:129034) [1 → 2.148] (5% drop, uncommon)',
      reagents: [{ itemId: 124106, quantity: 1 }],
      derivatives: [
        {
          itemId: 129034,
          quantity: 2.148, // amountOfMats
          matRate: 0.05, // 5% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },

    // ========================================================================
    // BATTLE FOR AZEROTH - Ultramarine & Crimson Pigments (100% drop for common, 25% for uncommon)
    // ========================================================================
    // Ultramarine Pigment - BfA common (100% drop, 3-4 per herb)
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Akunda's Bite", target: 'Ultramarine Pigment' },
      description:
        "Akunda's Bite (i:152507) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)",
      reagents: [{ itemId: 152507, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Riverbud', target: 'Ultramarine Pigment' },
      description:
        'Riverbud (i:152505) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
      reagents: [{ itemId: 152505, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Sea Stalk', target: 'Ultramarine Pigment' },
      description:
        'Sea Stalk (i:152511) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
      reagents: [{ itemId: 152511, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Siren's Pollen", target: 'Ultramarine Pigment' },
      description:
        "Siren's Pollen (i:152509) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)",
      reagents: [{ itemId: 152509, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Star Moss', target: 'Ultramarine Pigment' },
      description:
        'Star Moss (i:152506) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
      reagents: [{ itemId: 152506, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Winter's Kiss", target: 'Ultramarine Pigment' },
      description:
        "Winter's Kiss (i:152508) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)",
      reagents: [{ itemId: 152508, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Anchor Weed', target: 'Ultramarine Pigment' },
      description:
        'Anchor Weed (i:152510) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
      reagents: [{ itemId: 152510, quantity: 1 }],
      derivatives: [
        {
          itemId: 153635,
          quantity: 0.75, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 3, // min output
          maxAmount: 4, // max output
        },
      ],
    },
    // Crimson Pigment - BfA uncommon (25% drop, 1 per herb)
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Akunda's Bite", target: 'Crimson Pigment' },
      description:
        "Akunda's Bite (i:152507) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)",
      reagents: [{ itemId: 152507, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Riverbud', target: 'Crimson Pigment' },
      description:
        'Riverbud (i:152505) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
      reagents: [{ itemId: 152505, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Sea Stalk', target: 'Crimson Pigment' },
      description:
        'Sea Stalk (i:152511) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
      reagents: [{ itemId: 152511, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Siren's Pollen", target: 'Crimson Pigment' },
      description:
        "Siren's Pollen (i:152509) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)",
      reagents: [{ itemId: 152509, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Star Moss', target: 'Crimson Pigment' },
      description:
        'Star Moss (i:152506) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
      reagents: [{ itemId: 152506, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Winter's Kiss", target: 'Crimson Pigment' },
      description:
        "Winter's Kiss (i:152508) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)",
      reagents: [{ itemId: 152508, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Anchor Weed', target: 'Crimson Pigment' },
      description:
        'Anchor Weed (i:152510) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
      reagents: [{ itemId: 152510, quantity: 1 }],
      derivatives: [
        {
          itemId: 153636,
          quantity: 0.272, // amountOfMats
          matRate: 0.25, // 25% drop chance
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Maroon Pigment - Mechagon (100% drop, 2-3 per herb)
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Zin'anthid", target: 'Maroon Pigment' },
      description:
        "Zin'anthid (i:168487) → Maroon Pigment (i:168662) [1 → 0.6] (100% drop, common)",
      reagents: [{ itemId: 168487, quantity: 1 }],
      derivatives: [
        {
          itemId: 168662,
          quantity: 0.6, // amountOfMats
          matRate: 1.0, // 100% drop chance
          minAmount: 2, // min output
          maxAmount: 3, // max output
        },
      ],
    },

    // ========================================================================
    // SHADOWLANDS - Viridescent & Tranquil Pigments (uncommon, 3% drop, rare items)
    // ========================================================================
    // Viridescent Pigment - Shadowlands uncommon (3% drop, 1 per herb)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Riverbud', target: 'Viridescent Pigment' },
      description:
        'Riverbud (i:152505) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)',
      reagents: [{ itemId: 152505, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.111, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Star Moss', target: 'Viridescent Pigment' },
      description:
        'Star Moss (i:152506) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)',
      reagents: [{ itemId: 152506, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.111, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Akunda's Bite", target: 'Viridescent Pigment' },
      description:
        "Akunda's Bite (i:152507) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)",
      reagents: [{ itemId: 152507, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.111, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Winter's Kiss", target: 'Viridescent Pigment' },
      description:
        "Winter's Kiss (i:152508) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)",
      reagents: [{ itemId: 152508, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.111, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Siren's Pollen", target: 'Viridescent Pigment' },
      description:
        "Siren's Pollen (i:152509) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)",
      reagents: [{ itemId: 152509, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.111, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Sea Stalk', target: 'Viridescent Pigment' },
      description:
        'Sea Stalk (i:152511) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)',
      reagents: [{ itemId: 152511, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.111, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Anchor Weed', target: 'Viridescent Pigment' },
      description:
        'Anchor Weed (i:152510) → Viridescent Pigment (i:153669) [1 → 0.315] (3% drop, uncommon)',
      reagents: [{ itemId: 152510, quantity: 1 }],
      derivatives: [
        {
          itemId: 153669,
          quantity: 0.315, // amountOfMats
          matRate: 0.03, // 3% drop chance (rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    // Tranquil Pigment - remaining herbs (1% drop, 1 per herb - ultra-rare item)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Widowbloom', target: 'Tranquil Pigment' },
      description:
        'Widowbloom (i:168583) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
      reagents: [{ itemId: 168583, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.01, // 1% drop chance (ultra-rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Marrowroot', target: 'Tranquil Pigment' },
      description:
        'Marrowroot (i:168589) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
      reagents: [{ itemId: 168589, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.01, // 1% drop chance (ultra-rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Rising Glory', target: 'Tranquil Pigment' },
      description:
        'Rising Glory (i:168586) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
      reagents: [{ itemId: 168586, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.01, // 1% drop chance (ultra-rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: "Vigil's Torch", target: 'Tranquil Pigment' },
      description:
        "Vigil's Torch (i:170554) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)",
      reagents: [{ itemId: 170554, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.01, // 1% drop chance (ultra-rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Death Blossom', target: 'Tranquil Pigment' },
      description:
        'Death Blossom (i:169701) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
      reagents: [{ itemId: 169701, quantity: 1 }],
      derivatives: [
        {
          itemId: 175788,
          quantity: 0.006, // amountOfMats
          matRate: 0.01, // 1% drop chance (ultra-rare item)
          minAmount: 1, // min output
          maxAmount: 1, // max output
        },
      ],
    },
  ],
};
