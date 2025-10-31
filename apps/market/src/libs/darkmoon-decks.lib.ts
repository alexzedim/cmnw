/**
 * DARKMOON DECKS CONVERSIONS - Card Combinations to Finished Decks
 * Combines 8 individual cards from a themed deck into 1 finished Darkmoon Deck
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

import { DMA_SOURCE, PROFESSION_TICKER } from '@app/resources/constants';

// Profession ID for Inscription is 773
const PROF_INSC = PROFESSION_TICKER.get(773) || 'INSC';

export const DARKMOON_DECKS = {
  name: PROF_INSC,
  profession: 'Inscription',
  media: 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_card_tarotmaelstrom_01.jpg',
  spellId: 89546,
  methods: [
    // ========================================================================
    // SHADOWLANDS - Darkmoon Decks of Fortune
    // ========================================================================
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Aces',
        target: 'Darkmoon Deck: Aces',
      },
      description: 'Combine 8 Darkmoon Cards: Ace into 1 Darkmoon Deck: Aces (100% success rate)',
      venue: 'Darkmoon Card: Ace (8x) → Darkmoon Deck: Aces [8 → 1]',
      reagents: [
        { itemId: 173495, quantity: 8 },  // Darkmoon Card: Ace
      ],
      derivatives: [
        { itemId: 173495, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Twos',
        target: 'Darkmoon Deck: Twos',
      },
      description: 'Combine 8 Darkmoon Cards: Two into 1 Darkmoon Deck: Twos (100% success rate)',
      venue: 'Darkmoon Card: Two (8x) → Darkmoon Deck: Twos [8 → 1]',
      reagents: [
        { itemId: 173496, quantity: 8 },  // Darkmoon Card: Two
      ],
      derivatives: [
        { itemId: 173496, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Threes',
        target: 'Darkmoon Deck: Threes',
      },
      description: 'Combine 8 Darkmoon Cards: Three into 1 Darkmoon Deck: Threes (100% success rate)',
      venue: 'Darkmoon Card: Three (8x) → Darkmoon Deck: Threes [8 → 1]',
      reagents: [
        { itemId: 173497, quantity: 8 },  // Darkmoon Card: Three
      ],
      derivatives: [
        { itemId: 173497, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Fours',
        target: 'Darkmoon Deck: Fours',
      },
      description: 'Combine 8 Darkmoon Cards: Four into 1 Darkmoon Deck: Fours (100% success rate)',
      venue: 'Darkmoon Card: Four (8x) → Darkmoon Deck: Fours [8 → 1]',
      reagents: [
        { itemId: 173498, quantity: 8 },  // Darkmoon Card: Four
      ],
      derivatives: [
        { itemId: 173498, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Fives',
        target: 'Darkmoon Deck: Fives',
      },
      description: 'Combine 8 Darkmoon Cards: Five into 1 Darkmoon Deck: Fives (100% success rate)',
      venue: 'Darkmoon Card: Five (8x) → Darkmoon Deck: Fives [8 → 1]',
      reagents: [
        { itemId: 173499, quantity: 8 },  // Darkmoon Card: Five
      ],
      derivatives: [
        { itemId: 173499, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Sixes',
        target: 'Darkmoon Deck: Sixes',
      },
      description: 'Combine 8 Darkmoon Cards: Six into 1 Darkmoon Deck: Sixes (100% success rate)',
      venue: 'Darkmoon Card: Six (8x) → Darkmoon Deck: Sixes [8 → 1]',
      reagents: [
        { itemId: 173500, quantity: 8 },  // Darkmoon Card: Six
      ],
      derivatives: [
        { itemId: 173500, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Sevens',
        target: 'Darkmoon Deck: Sevens',
      },
      description: 'Combine 8 Darkmoon Cards: Seven into 1 Darkmoon Deck: Sevens (100% success rate)',
      venue: 'Darkmoon Card: Seven (8x) → Darkmoon Deck: Sevens [8 → 1]',
      reagents: [
        { itemId: 173501, quantity: 8 },  // Darkmoon Card: Seven
      ],
      derivatives: [
        { itemId: 173501, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Eights',
        target: 'Darkmoon Deck: Eights',
      },
      description: 'Combine 8 Darkmoon Cards: Eight into 1 Darkmoon Deck: Eights (100% success rate)',
      venue: 'Darkmoon Card: Eight (8x) → Darkmoon Deck: Eights [8 → 1]',
      reagents: [
        { itemId: 173502, quantity: 8 },  // Darkmoon Card: Eight
      ],
      derivatives: [
        { itemId: 173502, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Darkmoon Decks of War
    // ========================================================================
    {
      expansion: 'DF',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: War (Rank 1)',
        target: 'Darkmoon Deck: War (Rank 1)',
      },
      description: 'Combine 8 Darkmoon Cards: War (Rank 1) into 1 Darkmoon Deck: War (Rank 1) (100% success rate)',
      venue: 'Darkmoon Card: War * (8x) → Darkmoon Deck: War * [8 → 1]',
      reagents: [
        { itemId: 198880, quantity: 8 },  // Darkmoon Card: War (Rank 1)
      ],
      derivatives: [
        { itemId: 198880, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'DF',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: War (Rank 2)',
        target: 'Darkmoon Deck: War (Rank 2)',
      },
      description: 'Combine 8 Darkmoon Cards: War (Rank 2) into 1 Darkmoon Deck: War (Rank 2) (100% success rate)',
      venue: 'Darkmoon Card: War ** (8x) → Darkmoon Deck: War ** [8 → 1]',
      reagents: [
        { itemId: 198881, quantity: 8 },  // Darkmoon Card: War (Rank 2)
      ],
      derivatives: [
        { itemId: 198881, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'DF',
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Conquest (Rank 1)',
        target: 'Darkmoon Deck: Conquest (Rank 1)',
      },
      description: 'Combine 8 Darkmoon Cards: Conquest (Rank 1) into 1 Darkmoon Deck: Conquest (Rank 1) (100% success rate)',
      venue: 'Darkmoon Card: Conquest * (8x) → Darkmoon Deck: Conquest * [8 → 1]',
      reagents: [
        { itemId: 198882, quantity: 8 },  // Darkmoon Card: Conquest (Rank 1)
      ],
      derivatives: [
        { itemId: 198882, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: 'DF',
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Conquest (Rank 2)',
        target: 'Darkmoon Deck: Conquest (Rank 2)',
      },
      description: 'Combine 8 Darkmoon Cards: Conquest (Rank 2) into 1 Darkmoon Deck: Conquest (Rank 2) (100% success rate)',
      venue: 'Darkmoon Card: Conquest ** (8x) → Darkmoon Deck: Conquest ** [8 → 1]',
      reagents: [
        { itemId: 198883, quantity: 8 },  // Darkmoon Card: Conquest (Rank 2)
      ],
      derivatives: [
        { itemId: 198883, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },

    // ========================================================================
    // CLASSIC ERA - Original Darkmoon Decks
    // ========================================================================
    {
      expansion: 'CLSC',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Beasts',
        target: 'Darkmoon Deck: Beasts',
      },
      description: 'Combine 8 Darkmoon Cards: Beast into 1 Darkmoon Deck: Beasts (100% success rate, legacy)',
      venue: 'Darkmoon Card: Beast (8x) → Darkmoon Deck: Beasts [8 → 1]',
      reagents: [
        { itemId: 19271, quantity: 8 },  // Darkmoon Card: Beast
      ],
      derivatives: [
        { itemId: 19272, quantity: 1 },   // Darkmoon Deck: Beasts
      ],
    },
    {
      expansion: 'CLSC',
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Elementals',
        target: 'Darkmoon Deck: Elementals',
      },
      description: 'Combine 8 Darkmoon Cards: Elemental into 1 Darkmoon Deck: Elementals (100% success rate, legacy)',
      venue: 'Darkmoon Card: Elemental (8x) → Darkmoon Deck: Elementals [8 → 1]',
      reagents: [
        { itemId: 19273, quantity: 8 },  // Darkmoon Card: Elemental
      ],
      derivatives: [
        { itemId: 19274, quantity: 1 },   // Darkmoon Deck: Elementals
      ],
    },
    {
      expansion: 'CLSC',
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Warlords',
        target: 'Darkmoon Deck: Warlords',
      },
      description: 'Combine 8 Darkmoon Cards: Warlord into 1 Darkmoon Deck: Warlords (100% success rate, legacy)',
      venue: 'Darkmoon Card: Warlord (8x) → Darkmoon Deck: Warlords [8 → 1]',
      reagents: [
        { itemId: 19275, quantity: 8 },  // Darkmoon Card: Warlord
      ],
      derivatives: [
        { itemId: 19276, quantity: 1 },   // Darkmoon Deck: Warlords
      ],
    },

    // ========================================================================
    // NOTES ON DARKMOON DECK MECHANICS
    // ========================================================================
    // - Each Darkmoon Deck is created by combining exactly 8 matching cards
    // - There is no skill requirement increase or rank progression for deck assembly
    // - Decks are static items with fixed attributes based on their type
    // - Shadowlands (SL) decks: Aces through Eights (8 decks total)
    // - Dragonflight (DF) decks: War & Conquest with rank tiers (Rank 1 & Rank 2)
    // - Decks can be sold on the auction house or used by the crafter
    // - The actual card items are consumed in the combination process
  ],
};


