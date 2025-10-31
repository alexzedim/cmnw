/**
 * DISENCHANTING CONVERSIONS - Gear to Enchanting Materials
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

import { DMA_SOURCE, PROFESSION_TICKER } from '@app/resources/constants';

// Profession ID for Enchanting is 333
const PROF_ENCH = PROFESSION_TICKER.get(333) || 'ENCH';

export const DISENCHANTING = {
  name: PROF_ENCH,
  profession: 'Enchanting',
  media: 'https://render-eu.worldofwarcraft.com/icons/56/spell_holy_sealblessingoflight.jpg',
  spellId: 13262,
  methods: [
    // ========================================================================
    // CLASSIC ERA - Green Items (Level 16-25)
    // ========================================================================
    {
      expansion: 'CLSC',
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Green Item (Lvl 16-25)', target: 'Illumated Shards' },
      description: 'Disenchant green quality items (level 16-25) for Illumated Shards (average yield: 1.2)',
      venue: 'Green Item → Illumated Shards [1 → 1.2]',
      reagents: [{ itemId: 1, quantity: 1 }],  // Placeholder for green item
      derivatives: [{ itemId: 10940, quantity: 1.2 }],  // Illumated Shard
    },
    {
      expansion: 'CLSC',
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Blue Item (Lvl 16-25)', target: 'Illumated Shards' },
      description: 'Disenchant blue quality items (level 16-25) for Illumated Shards (average yield: 1.8)',
      venue: 'Blue Item → Illumated Shards [1 → 1.8]',
      reagents: [{ itemId: 2, quantity: 1 }],  // Placeholder for blue item
      derivatives: [{ itemId: 10940, quantity: 1.8 }],  // Illumated Shard
    },

    // ========================================================================
    // CLASSIC ERA - Green Items (Level 26-35)
    // ========================================================================
    {
      expansion: 'CLSC',
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Green Item (Lvl 26-35)', target: 'Glowing Shards' },
      description: 'Disenchant green quality items (level 26-35) for Glowing Shards (average yield: 1.2)',
      venue: 'Green Item → Glowing Shards [1 → 1.2]',
      reagents: [{ itemId: 3, quantity: 1 }],  // Placeholder for green item
      derivatives: [{ itemId: 11084, quantity: 1.2 }],  // Glowing Shard
    },
    {
      expansion: 'CLSC',
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Blue Item (Lvl 26-35)', target: 'Glowing Shards' },
      description: 'Disenchant blue quality items (level 26-35) for Glowing Shards (average yield: 1.8)',
      venue: 'Blue Item → Glowing Shards [1 → 1.8]',
      reagents: [{ itemId: 4, quantity: 1 }],  // Placeholder for blue item
      derivatives: [{ itemId: 11084, quantity: 1.8 }],  // Glowing Shard
    },

    // ========================================================================
    // SHADOWLANDS - Greens to Shards
    // ========================================================================
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Green Item (SL)', target: 'Shards' },
      description: 'Disenchant green quality Shadowlands items for Enchanting Shards (average yield: 1.5)',
      venue: 'Green SL Item → Enchanting Shard [1 → 1.5]',
      reagents: [{ itemId: 5, quantity: 1 }],  // Placeholder for SL green
      derivatives: [{ itemId: 172230, quantity: 1.5 }],  // Enchanting Shard
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Blue Item (SL)', target: 'Shards' },
      description: 'Disenchant blue quality Shadowlands items for Enchanting Shards (average yield: 2.5)',
      venue: 'Blue SL Item → Enchanting Shard [1 → 2.5]',
      reagents: [{ itemId: 6, quantity: 1 }],  // Placeholder for SL blue
      derivatives: [{ itemId: 172230, quantity: 2.5 }],  // Enchanting Shard
    },
    {
      expansion: 'SL',
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Purple Item (SL)', target: 'Vibrant Shards & Dust' },
      description: 'Disenchant purple quality Shadowlands items for Vibrant Shards and Vibrant Dust (average: 2 shards + 8 dust)',
      venue: 'Purple SL Item → Vibrant Shard + Vibrant Dust [1 → 2 shards + 8 dust]',
      reagents: [{ itemId: 7, quantity: 1 }],  // Placeholder for SL purple
      derivatives: [
        { itemId: 172231, quantity: 2.0 },     // Vibrant Shard
        { itemId: 172232, quantity: 8.0 },     // Vibrant Dust
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Multi-Quality Disenchanting
    // ========================================================================
    {
      expansion: 'DF',
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Green Item (DF) *', target: 'Chromatic Dust *' },
      description: 'Disenchant green quality Dragonflight items (Quality 1) for Chromatic Dust (average yield: 1.0)',
      venue: 'Green DF Item * → Chromatic Dust * [1 → 1.0]',
      reagents: [{ itemId: 8, quantity: 1 }],  // Placeholder for DF green *
      derivatives: [{ itemId: 194457, quantity: 1.0 }],  // Chromatic Dust
    },
    {
      expansion: 'DF',
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Green Item (DF) **', target: 'Chromatic Dust **' },
      description: 'Disenchant green quality Dragonflight items (Quality 2) for Chromatic Dust (average yield: 1.5)',
      venue: 'Green DF Item ** → Chromatic Dust ** [1 → 1.5]',
      reagents: [{ itemId: 9, quantity: 1 }],  // Placeholder for DF green **
      derivatives: [{ itemId: 194458, quantity: 1.5 }],  // Chromatic Dust **
    },
    {
      expansion: 'DF',
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Blue Item (DF) *', target: 'Chromatic Shards *' },
      description: 'Disenchant blue quality Dragonflight items (Quality 1) for Chromatic Shards (average yield: 2.0)',
      venue: 'Blue DF Item * → Chromatic Shard * [1 → 2.0]',
      reagents: [{ itemId: 10, quantity: 1 }],  // Placeholder for DF blue *
      derivatives: [{ itemId: 194459, quantity: 2.0 }],  // Chromatic Shard
    },
    {
      expansion: 'DF',
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Blue Item (DF) **', target: 'Chromatic Shards **' },
      description: 'Disenchant blue quality Dragonflight items (Quality 2) for Chromatic Shards (average yield: 3.0)',
      venue: 'Blue DF Item ** → Chromatic Shard ** [1 → 3.0]',
      reagents: [{ itemId: 11, quantity: 1 }],  // Placeholder for DF blue **
      derivatives: [{ itemId: 194460, quantity: 3.0 }],  // Chromatic Shard **
    },
    {
      expansion: 'DF',
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Purple Item (DF) **', target: 'Resonant Crystals' },
      description: 'Disenchant purple quality Dragonflight items (Quality 2) for Resonant Crystals (average yield: 2.0)',
      venue: 'Purple DF Item ** → Resonant Crystal ** [1 → 2.0]',
      reagents: [{ itemId: 12, quantity: 1 }],  // Placeholder for DF purple **
      derivatives: [{ itemId: 194458, quantity: 2.0 }],  // Resonant Crystal
    },
    {
      expansion: 'DF',
      rank: 3,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Purple Item (DF) ***', target: 'Vibrant Shards' },
      description: 'Disenchant purple quality Dragonflight items (Quality 3) for Vibrant Shards (average yield: 3.0)',
      venue: 'Purple DF Item *** → Vibrant Shard *** [1 → 3.0]',
      reagents: [{ itemId: 13, quantity: 1 }],  // Placeholder for DF purple ***
      derivatives: [{ itemId: 194461, quantity: 3.0 }],  // Vibrant Shard
    },
  ],
};


