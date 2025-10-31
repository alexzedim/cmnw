/**
 * DARKMOON DECKS CONVERSIONS - Card Combinations to Finished Decks
 * Combines 8 individual cards from a themed deck into 1 finished Darkmoon Deck
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

import { DMA_SOURCE, EXPANSION_TICKER, PROFESSION_TICKER } from '@app/resources/constants';

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
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Aces',
        target: 'Darkmoon Deck: Aces',
      },
      description: 'Darkmoon Card: Ace (8x) → Darkmoon Deck: Aces [8 → 1]',
      reagents: [
        { itemId: 173495, quantity: 8 },  // Darkmoon Card: Ace
      ],
      derivatives: [
        { itemId: 173495, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Twos',
        target: 'Darkmoon Deck: Twos',
      },
      description: 'Darkmoon Card: Two (8x) → Darkmoon Deck: Twos [8 → 1]',
      reagents: [
        { itemId: 173496, quantity: 8 },  // Darkmoon Card: Two
      ],
      derivatives: [
        { itemId: 173496, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Threes',
        target: 'Darkmoon Deck: Threes',
      },
      description: 'Darkmoon Card: Three (8x) → Darkmoon Deck: Threes [8 → 1]',
      reagents: [
        { itemId: 173497, quantity: 8 },  // Darkmoon Card: Three
      ],
      derivatives: [
        { itemId: 173497, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Fours',
        target: 'Darkmoon Deck: Fours',
      },
      description: 'Darkmoon Card: Four (8x) → Darkmoon Deck: Fours [8 → 1]',
      reagents: [
        { itemId: 173498, quantity: 8 },  // Darkmoon Card: Four
      ],
      derivatives: [
        { itemId: 173498, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Fives',
        target: 'Darkmoon Deck: Fives',
      },
      description: 'Darkmoon Card: Five (8x) → Darkmoon Deck: Fives [8 → 1]',
      reagents: [
        { itemId: 173499, quantity: 8 },  // Darkmoon Card: Five
      ],
      derivatives: [
        { itemId: 173499, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Sixes',
        target: 'Darkmoon Deck: Sixes',
      },
      description: 'Darkmoon Card: Six (8x) → Darkmoon Deck: Sixes [8 → 1]',
      reagents: [
        { itemId: 173500, quantity: 8 },  // Darkmoon Card: Six
      ],
      derivatives: [
        { itemId: 173500, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Sevens',
        target: 'Darkmoon Deck: Sevens',
      },
      description: 'Darkmoon Card: Seven (8x) → Darkmoon Deck: Sevens [8 → 1]',
      reagents: [
        { itemId: 173501, quantity: 8 },  // Darkmoon Card: Seven
      ],
      derivatives: [
        { itemId: 173501, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Eights',
        target: 'Darkmoon Deck: Eights',
      },
      description: 'Darkmoon Card: Eight (8x) → Darkmoon Deck: Eights [8 → 1]',
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
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: War (Rank 1)',
        target: 'Darkmoon Deck: War (Rank 1)',
      },
      description: 'Darkmoon Card: War * (8x) → Darkmoon Deck: War * [8 → 1]',
      reagents: [
        { itemId: 198880, quantity: 8 },  // Darkmoon Card: War (Rank 1)
      ],
      derivatives: [
        { itemId: 198880, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: War (Rank 2)',
        target: 'Darkmoon Deck: War (Rank 2)',
      },
      description: 'Darkmoon Card: War ** (8x) → Darkmoon Deck: War ** [8 → 1]',
      reagents: [
        { itemId: 198881, quantity: 8 },  // Darkmoon Card: War (Rank 2)
      ],
      derivatives: [
        { itemId: 198881, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Conquest (Rank 1)',
        target: 'Darkmoon Deck: Conquest (Rank 1)',
      },
      description: 'Darkmoon Card: Conquest * (8x) → Darkmoon Deck: Conquest * [8 → 1]',
      reagents: [
        { itemId: 198882, quantity: 8 },  // Darkmoon Card: Conquest (Rank 1)
      ],
      derivatives: [
        { itemId: 198882, quantity: 0 },  // Placeholder - actual deck itemId varies
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Conquest (Rank 2)',
        target: 'Darkmoon Deck: Conquest (Rank 2)',
      },
      description: 'Darkmoon Card: Conquest ** (8x) → Darkmoon Deck: Conquest ** [8 → 1]',
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
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Beasts',
        target: 'Darkmoon Deck: Beasts',
      },
      description: 'Darkmoon Card: Beast (8x) → Darkmoon Deck: Beasts [8 → 1]',
      reagents: [
        { itemId: 19271, quantity: 8 },  // Darkmoon Card: Beast
      ],
      derivatives: [
        { itemId: 19272, quantity: 1 },   // Darkmoon Deck: Beasts
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Elementals',
        target: 'Darkmoon Deck: Elementals',
      },
      description: 'Darkmoon Card: Elemental (8x) → Darkmoon Deck: Elementals [8 → 1]',
      reagents: [
        { itemId: 19273, quantity: 8 },  // Darkmoon Card: Elemental
      ],
      derivatives: [
        { itemId: 19274, quantity: 1 },   // Darkmoon Deck: Elementals
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: {
        source: 'Darkmoon Cards: Warlords',
        target: 'Darkmoon Deck: Warlords',
      },
      description: 'Darkmoon Card: Warlord (8x) → Darkmoon Deck: Warlords [8 → 1]',
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



