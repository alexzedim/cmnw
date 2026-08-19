import { DMA_SOURCE, EXPANSION_TICKER, PROFESSION_TICKER } from './dma.constants';

export enum CsvFileName {
  SkillLineAbility = 'skilllineability.csv',
  SpellEffect = 'spelleffect.csv',
  SpellReagents = 'spellreagents.csv',
}

/**
 * DARKMOON DECKS CONVERSIONS - Card Combinations to Finished Decks
 * Combines 8 individual cards from a themed deck into 1 finished Darkmoon Deck
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

// Profession ID for Inscription is 773
const PROF_INSC = PROFESSION_TICKER.INSC;

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
        { itemId: 173495, quantity: 8 }, // Darkmoon Card: Ace
      ],
      derivatives: [
        { itemId: 173495, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173496, quantity: 8 }, // Darkmoon Card: Two
      ],
      derivatives: [
        { itemId: 173496, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173497, quantity: 8 }, // Darkmoon Card: Three
      ],
      derivatives: [
        { itemId: 173497, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173498, quantity: 8 }, // Darkmoon Card: Four
      ],
      derivatives: [
        { itemId: 173498, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173499, quantity: 8 }, // Darkmoon Card: Five
      ],
      derivatives: [
        { itemId: 173499, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173500, quantity: 8 }, // Darkmoon Card: Six
      ],
      derivatives: [
        { itemId: 173500, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173501, quantity: 8 }, // Darkmoon Card: Seven
      ],
      derivatives: [
        { itemId: 173501, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 173502, quantity: 8 }, // Darkmoon Card: Eight
      ],
      derivatives: [
        { itemId: 173502, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 198880, quantity: 8 }, // Darkmoon Card: War (Rank 1)
      ],
      derivatives: [
        { itemId: 198880, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 198881, quantity: 8 }, // Darkmoon Card: War (Rank 2)
      ],
      derivatives: [
        { itemId: 198881, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 198882, quantity: 8 }, // Darkmoon Card: Conquest (Rank 1)
      ],
      derivatives: [
        { itemId: 198882, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 198883, quantity: 8 }, // Darkmoon Card: Conquest (Rank 2)
      ],
      derivatives: [
        { itemId: 198883, quantity: 0 }, // Placeholder - actual deck itemId varies
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
        { itemId: 19271, quantity: 8 }, // Darkmoon Card: Beast
      ],
      derivatives: [
        { itemId: 19272, quantity: 1 }, // Darkmoon Deck: Beasts
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
        { itemId: 19273, quantity: 8 }, // Darkmoon Card: Elemental
      ],
      derivatives: [
        { itemId: 19274, quantity: 1 }, // Darkmoon Deck: Elementals
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
        { itemId: 19275, quantity: 8 }, // Darkmoon Card: Warlord
      ],
      derivatives: [
        { itemId: 19276, quantity: 1 }, // Darkmoon Deck: Warlords
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

/**
 * DISENCHANTING CONVERSIONS - Gear to Enchanting Materials
 * Data sourced from TradeSkillMaster Retail Disenchant.lua
 * Items are disenchanted based on item class, quality, and item level
 */

const PROF_ENCH = PROFESSION_TICKER.ENCH;

export const DISENCHANTING = {
  name: PROF_ENCH,
  profession: 'Enchanting',
  media: 'https://render-eu.worldofwarcraft.com/icons/56/spell_holy_sealblessingoflight.jpg',
  spellId: 13262,
  methods: [
    // ========================================================================
    // DUST MATERIALS - Available across expansions
    // ========================================================================
    // Strange Dust (Classic - Expansion 0)
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Low Level Armor/Weapon (Lvl 2-15)',
        target: 'Strange Dust',
      },
      description: 'Disenchant low level armor/weapon → Strange Dust (i:10940)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Various Low Level Gear' }],
      derivatives: [
        {
          itemId: 10940,
          quantity: 1.22,
          matRate: 0.98,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 2,
        },
      ],
    },
    // Light Illusion Dust (Classic - Expansion 0)
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Level 16-24 Armor/Weapon',
        target: 'Light Illusion Dust',
      },
      description: 'Disenchant level 16-24 gear → Light Illusion Dust (i:16204)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 16-24 Gear' }],
      derivatives: [
        {
          itemId: 16204,
          quantity: 1.08,
          matRate: 0.98,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 2,
        },
      ],
    },
    // Rich Illusion Dust (Classic - Expansion 0)
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Level 20+ Rare/Legendary',
        target: 'Rich Illusion Dust',
      },
      description: 'Disenchant level 20+ rare/legendary gear → Rich Illusion Dust (i:156930)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 20+ Rare/Legendary Gear' }],
      derivatives: [
        {
          itemId: 156930,
          quantity: 0.73,
          matRate: 0.97,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 3,
        },
      ],
    },
    // Arcane Dust (Burning Crusade - Expansion 1)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 4,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'TBC Level Armor/Weapon', target: 'Arcane Dust' },
      description: 'Disenchant TBC level gear → Arcane Dust (i:22445)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Level Gear' }],
      derivatives: [
        {
          itemId: 22445,
          quantity: 1.79,
          matRate: 0.99,
          minAmount: 1,
          maxAmount: 3,
          itemQuality: 2,
        },
      ],
    },
    // Infinite Dust (Wrath of the Lich King - Expansion 2)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 5,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'WoTLK Level Armor/Weapon', target: 'Infinite Dust' },
      description: 'Disenchant WoTLK level gear → Infinite Dust (i:34054)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WoTLK Level Gear' }],
      derivatives: [
        {
          itemId: 34054,
          quantity: 2.33,
          matRate: 0.99,
          minAmount: 2,
          maxAmount: 3,
          itemQuality: 2,
        },
      ],
    },
    // Hypnotic Dust (Cataclysm - Expansion 3)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 6,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Cataclysm Level Armor/Weapon',
        target: 'Hypnotic Dust',
      },
      description: 'Disenchant Cataclysm level gear → Hypnotic Dust (i:52555)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Level Gear' }],
      derivatives: [
        {
          itemId: 52555,
          quantity: 1.86,
          matRate: 0.98,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 2,
        },
      ],
    },
    // Spirit Dust (Pandaria - Expansion 4)
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 7,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Pandaria Level Armor/Weapon', target: 'Spirit Dust' },
      description: 'Disenchant Pandaria level gear → Spirit Dust (i:74249)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Pandaria Level Gear' }],
      derivatives: [
        {
          itemId: 74249,
          quantity: 2.58,
          matRate: 0.98,
          minAmount: 2,
          maxAmount: 3,
          itemQuality: 2,
        },
      ],
    },
    // Draenic Dust (Draenor - Expansion 5)
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 8,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Draenor Level Armor/Weapon', target: 'Draenic Dust' },
      description: 'Disenchant Draenor level gear → Draenic Dust (i:109693)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Level Gear' }],
      derivatives: [
        {
          itemId: 109693,
          quantity: 2.82,
          matRate: 0.99,
          minAmount: 2,
          maxAmount: 3,
          itemQuality: 2,
        },
      ],
    },
    // Arkhana (Legion - Expansion 6)
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 9,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Legion Level Armor/Weapon', target: 'Arkhana' },
      description: 'Disenchant Legion level gear → Arkhana (i:124440)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Legion Level Gear' }],
      derivatives: [
        {
          itemId: 124440,
          quantity: 4.75,
          matRate: 1.0,
          minAmount: 2,
          maxAmount: 4,
          itemQuality: 2,
        },
      ],
    },
    // Gloom Dust (Battle for Azeroth - Expansion 7)
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 10,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'BfA Level Armor/Weapon', target: 'Gloom Dust' },
      description: 'Disenchant BfA level gear → Gloom Dust (i:152875)',
      reagents: [{ itemId: 0, quantity: 1, label: 'BfA Level Gear' }],
      derivatives: [
        {
          itemId: 152875,
          quantity: 4.36,
          matRate: 1.0,
          minAmount: 2,
          maxAmount: 4,
          itemQuality: 2,
        },
      ],
    },
    // Soul Dust (Shadowlands - Expansion 8)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 11,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Shadowlands Level Armor/Weapon', target: 'Soul Dust' },
      description: 'Disenchant Shadowlands level gear → Soul Dust (i:172230)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Shadowlands Level Gear' }],
      derivatives: [
        {
          itemId: 172230,
          quantity: 2.17,
          matRate: 0.98,
          minAmount: 1,
          maxAmount: 3,
          itemQuality: 2,
        },
      ],
    },
    // Chromatic Dust (Dragonflight - Expansion 9)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 12,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Dragonflight Level Armor/Weapon/Profession Items',
        target: 'Chromatic Dust',
      },
      description: 'Disenchant Dragonflight level gear → Chromatic Dust (i:194123)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Dragonflight Level Gear' }],
      derivatives: [
        {
          itemId: 194123,
          quantity: 1.38,
          matRate: 0.95,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 2,
        },
      ],
    },

    // ========================================================================
    // ESSENCE MATERIALS
    // ========================================================================
    // Lesser Magic Essence
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Low Level Weapons', target: 'Lesser Magic Essence' },
      description: 'Disenchant low level weapons → Lesser Magic Essence (i:10938)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Low Level Weapons' }],
      derivatives: [
        {
          itemId: 10938,
          quantity: 0.98,
          matRate: 0.95,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        },
      ],
    },
    // Greater Magic Essence
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Mid-Level Weapons', target: 'Greater Magic Essence' },
      description: 'Disenchant mid-level weapons → Greater Magic Essence (i:10939)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Mid-Level Weapons' }],
      derivatives: [
        {
          itemId: 10939,
          quantity: 1.11,
          matRate: 0.95,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        },
      ],
    },
    // Lesser Eternal Essence
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Level 16-24 Weapons',
        target: 'Lesser Eternal Essence',
      },
      description: 'Disenchant level 16-24 weapons → Lesser Eternal Essence (i:16202)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 16-24 Weapons' }],
      derivatives: [
        {
          itemId: 16202,
          quantity: 1.05,
          matRate: 0.93,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        },
      ],
    },
    // Greater Eternal Essence
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 4,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Level 25+ Weapons/Rare Items',
        target: 'Greater Eternal Essence',
      },
      description: 'Disenchant level 25+ weapons/rare items → Greater Eternal Essence (i:16203)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 25+ Weapons/Rare Items' }],
      derivatives: [
        {
          itemId: 16203,
          quantity: 0.91,
          matRate: 0.9,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Lesser Planar Essence (TBC)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 5,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'TBC Low-Level Gear', target: 'Lesser Planar Essence' },
      description: 'Disenchant TBC low-level gear → Lesser Planar Essence (i:22447)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Low-Level Gear' }],
      derivatives: [
        {
          itemId: 22447,
          quantity: 1.0,
          matRate: 0.92,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        },
      ],
    },
    // Greater Planar Essence (TBC)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 6,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'TBC Mid-Level+ Gear',
        target: 'Greater Planar Essence',
      },
      description: 'Disenchant TBC mid-level+ gear → Greater Planar Essence (i:22446)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Mid-Level+ Gear' }],
      derivatives: [
        {
          itemId: 22446,
          quantity: 0.76,
          matRate: 0.88,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Lesser Cosmic Essence (WotLK)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 7,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'WotLK Low-Level Gear',
        target: 'Lesser Cosmic Essence',
      },
      description: 'Disenchant WotLK low-level gear → Lesser Cosmic Essence (i:34056)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Low-Level Gear' }],
      derivatives: [
        {
          itemId: 34056,
          quantity: 0.98,
          matRate: 0.92,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        },
      ],
    },
    // Greater Cosmic Essence (WotLK)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 8,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'WotLK Mid-Level+ Gear',
        target: 'Greater Cosmic Essence',
      },
      description: 'Disenchant WotLK mid-level+ gear → Greater Cosmic Essence (i:34055)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Mid-Level+ Gear' }],
      derivatives: [
        {
          itemId: 34055,
          quantity: 0.76,
          matRate: 0.88,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Lesser Celestial Essence (Cataclysm)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 9,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Cataclysm Low-Level Gear',
        target: 'Lesser Celestial Essence',
      },
      description: 'Disenchant Cataclysm low-level gear → Lesser Celestial Essence (i:52718)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Low-Level Gear' }],
      derivatives: [
        {
          itemId: 52718,
          quantity: 0.88,
          matRate: 0.91,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        },
      ],
    },
    // Greater Celestial Essence (Cataclysm)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 10,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Cataclysm Mid-Level+ Gear',
        target: 'Greater Celestial Essence',
      },
      description: 'Disenchant Cataclysm mid-level+ gear → Greater Celestial Essence (i:52719)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Mid-Level+ Gear' }],
      derivatives: [
        {
          itemId: 52719,
          quantity: 1.21,
          matRate: 0.89,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Mysterious Essence (Pandaria)
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 11,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Pandaria Level Gear', target: 'Mysterious Essence' },
      description: 'Disenchant Pandaria level gear → Mysterious Essence (i:74250)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Pandaria Level Gear' }],
      derivatives: [
        {
          itemId: 74250,
          quantity: 0.24,
          matRate: 0.85,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // SHARD MATERIALS
    // ========================================================================
    // Small Brilliant Shard
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Level 16-24 Rare Items',
        target: 'Small Brilliant Shard',
      },
      description: 'Disenchant level 16-24 rare items → Small Brilliant Shard (i:14343)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 16-24 Rare Items' }],
      derivatives: [
        {
          itemId: 14343,
          quantity: 0.74,
          matRate: 0.85,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 4,
        },
      ],
    },
    // Large Brilliant Shard
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Level 25+ Rare/Legendary Items',
        target: 'Large Brilliant Shard',
      },
      description: 'Disenchant level 25+ rare/legendary items → Large Brilliant Shard (i:14344)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 25+ Rare/Legendary Items' }],
      derivatives: [
        {
          itemId: 14344,
          quantity: 1.49,
          matRate: 0.87,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 4,
        },
      ],
    },
    // Small Prismatic Shard (TBC)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 3,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'TBC Low-Level Rare Items',
        target: 'Small Prismatic Shard',
      },
      description: 'Disenchant TBC low-level rare items → Small Prismatic Shard (i:22448)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Low-Level Rare Items' }],
      derivatives: [
        {
          itemId: 22448,
          quantity: 0.55,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Large Prismatic Shard (TBC)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 4,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'TBC Mid-Level+ Rare Items',
        target: 'Large Prismatic Shard',
      },
      description: 'Disenchant TBC mid-level+ rare items → Large Prismatic Shard (i:22449)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Mid-Level+ Rare Items' }],
      derivatives: [
        {
          itemId: 22449,
          quantity: 0.55,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Small Dream Shard (WotLK)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 5,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'WotLK Low-Level Rare Items',
        target: 'Small Dream Shard',
      },
      description: 'Disenchant WotLK low-level rare items → Small Dream Shard (i:34053)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Low-Level Rare Items' }],
      derivatives: [
        {
          itemId: 34053,
          quantity: 0.55,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Dream Shard (WotLK)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 6,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'WotLK Mid-Level+ Rare Items', target: 'Dream Shard' },
      description: 'Disenchant WotLK mid-level+ rare items → Dream Shard (i:34052)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Mid-Level+ Rare Items' }],
      derivatives: [
        {
          itemId: 34052,
          quantity: 0.54,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Small Heavenly Shard (Cataclysm)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 7,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Cataclysm Low-Level Rare Items',
        target: 'Small Heavenly Shard',
      },
      description: 'Disenchant Cataclysm low-level rare items → Small Heavenly Shard (i:52720)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Low-Level Rare Items' }],
      derivatives: [
        {
          itemId: 52720,
          quantity: 1.03,
          matRate: 0.83,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Heavenly Shard (Cataclysm)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 8,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Cataclysm Mid-Level+ Rare Items',
        target: 'Heavenly Shard',
      },
      description: 'Disenchant Cataclysm mid-level+ rare items → Heavenly Shard (i:52721)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Mid-Level+ Rare Items' }],
      derivatives: [
        {
          itemId: 52721,
          quantity: 1.0,
          matRate: 0.83,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Small Ethereal Shard (Pandaria)
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 9,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Pandaria Low-Level Rare Items',
        target: 'Small Ethereal Shard',
      },
      description: 'Disenchant Pandaria low-level rare items → Small Ethereal Shard (i:74252)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Pandaria Low-Level Rare Items' }],
      derivatives: [
        {
          itemId: 74252,
          quantity: 0.57,
          matRate: 0.83,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Ethereal Shard (Pandaria)
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 10,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Pandaria Mid-Level+ Rare Items',
        target: 'Ethereal Shard',
      },
      description: 'Disenchant Pandaria mid-level+ rare items → Ethereal Shard (i:74247)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Pandaria Mid-Level+ Rare Items' }],
      derivatives: [
        {
          itemId: 74247,
          quantity: 0.57,
          matRate: 0.83,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Small Luminous Shard (Draenor)
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 11,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Draenor Rare Items', target: 'Small Luminous Shard' },
      description: 'Disenchant Draenor rare items → Small Luminous Shard (i:115502)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Rare Items' }],
      derivatives: [
        {
          itemId: 115502,
          quantity: 0.22,
          matRate: 0.78,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Luminous Shard (Draenor)
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 12,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Draenor Rare Items', target: 'Luminous Shard' },
      description: 'Disenchant Draenor rare items → Luminous Shard (i:111245)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Rare Items' }],
      derivatives: [
        {
          itemId: 111245,
          quantity: 0.11,
          matRate: 0.75,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Leylight Shard (Legion)
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 13,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Legion Rare Items', target: 'Leylight Shard' },
      description: 'Disenchant Legion rare items → Leylight Shard (i:124441)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Legion Rare Items' }],
      derivatives: [
        {
          itemId: 124441,
          quantity: 1.0,
          matRate: 0.85,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Umbra Shard (Battle for Azeroth)
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 14,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'BfA Rare Items', target: 'Umbra Shard' },
      description: 'Disenchant BfA rare items → Umbra Shard (i:152876)',
      reagents: [{ itemId: 0, quantity: 1, label: 'BfA Rare Items' }],
      derivatives: [
        {
          itemId: 152876,
          quantity: 1.13,
          matRate: 0.85,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Sacred Shard (Shadowlands)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 15,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Shadowlands Rare Items', target: 'Sacred Shard' },
      description: 'Disenchant Shadowlands rare items → Sacred Shard (i:172231)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Shadowlands Rare Items' }],
      derivatives: [
        {
          itemId: 172231,
          quantity: 1.09,
          matRate: 0.85,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Vibrant Shard (Dragonflight)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 16,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Dragonflight Rare Items', target: 'Vibrant Shard' },
      description: 'Disenchant Dragonflight rare items → Vibrant Shard (i:194124)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Dragonflight Rare Items' }],
      derivatives: [
        {
          itemId: 194124,
          quantity: 0.65,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // CRYSTAL MATERIALS (Epic/Legendary Items)
    // ========================================================================
    // Void Crystal (TBC)
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 17,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'TBC Epic Items', target: 'Void Crystal' },
      description: 'Disenchant TBC epic items → Void Crystal (i:22450)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Epic Items' }],
      derivatives: [
        {
          itemId: 22450,
          quantity: 1.27,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Abyss Crystal (WotLK)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 18,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'WotLK Epic Items', target: 'Abyss Crystal' },
      description: 'Disenchant WotLK epic items → Abyss Crystal (i:34057)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Epic Items' }],
      derivatives: [
        {
          itemId: 34057,
          quantity: 1.0,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Maelstrom Crystal (Cataclysm)
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 19,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Cataclysm Epic Items', target: 'Maelstrom Crystal' },
      description: 'Disenchant Cataclysm epic items → Maelstrom Crystal (i:52722)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Epic Items' }],
      derivatives: [
        {
          itemId: 52722,
          quantity: 1.0,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Sha Crystal (Pandaria)
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 20,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Pandaria Epic Items', target: 'Sha Crystal' },
      description: 'Disenchant Pandaria epic items → Sha Crystal (i:74248)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Pandaria Epic Items' }],
      derivatives: [
        {
          itemId: 74248,
          quantity: 1.0,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Fractured Temporal Crystal (Draenor)
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 21,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: {
        source: 'Draenor Rare Enchanting Items',
        target: 'Fractured Temporal Crystal',
      },
      description: 'Disenchant Draenor rare enchanting items → Fractured Temporal Crystal (i:115504)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Rare Enchanting Items' }],
      derivatives: [
        {
          itemId: 115504,
          quantity: 0.38,
          matRate: 0.75,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Temporal Crystal (Draenor)
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 22,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Draenor Epic Items', target: 'Temporal Crystal' },
      description: 'Disenchant Draenor epic items → Temporal Crystal (i:113588)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Epic Items' }],
      derivatives: [
        {
          itemId: 113588,
          quantity: 0.43,
          matRate: 0.75,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Chaos Crystal (Legion)
    {
      expansion: EXPANSION_TICKER.LGN,
      rank: 23,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Legion Epic Items', target: 'Chaos Crystal' },
      description: 'Disenchant Legion epic items → Chaos Crystal (i:124442)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Legion Epic Items' }],
      derivatives: [
        {
          itemId: 124442,
          quantity: 1.0,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Veiled Crystal (Battle for Azeroth)
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 24,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'BfA Epic Items', target: 'Veiled Crystal' },
      description: 'Disenchant BfA epic items → Veiled Crystal (i:152877)',
      reagents: [{ itemId: 0, quantity: 1, label: 'BfA Epic Items' }],
      derivatives: [
        {
          itemId: 152877,
          quantity: 1.0,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Eternal Crystal (Shadowlands)
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 25,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Shadowlands Epic Items', target: 'Eternal Crystal' },
      description: 'Disenchant Shadowlands epic items → Eternal Crystal (i:177648)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Shadowlands Epic Items' }],
      derivatives: [
        {
          itemId: 177648,
          quantity: 1.0,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Vibrant Crystal (Dragonflight)
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 26,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Dragonflight Epic Items', target: 'Vibrant Crystal' },
      description: 'Disenchant Dragonflight epic items → Vibrant Crystal (i:204731)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Dragonflight Epic Items' }],
      derivatives: [
        {
          itemId: 204731,
          quantity: 0.9,
          matRate: 0.78,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
  ],
};

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
      description: 'Silverleaf (i:765) → Alabaster Pigment (i:39151) [1 → 0.578] (100% drop, common)',
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
      description: 'Peacebloom (i:2447) → Alabaster Pigment (i:39151) [1 → 0.578] (100% drop, common)',
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
      description: 'Earthroot (i:2449) → Alabaster Pigment (i:39151) [1 → 0.6] (100% drop, common)',
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
      description: 'Mageroyal (i:785) → Dusky Pigment (i:39334) [1 → 0.566] (100% drop, common)',
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
      description: 'Briarthorn (i:2450) → Dusky Pigment (i:39334) [1 → 0.5765] (100% drop, common)',
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
      description: 'Swiftthistle (i:2452) → Dusky Pigment (i:39334) [1 → 0.5855] (100% drop, common)',
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
      description: 'Stranglekelp (i:3820) → Dusky Pigment (i:39334) [1 → 0.6] (100% drop, common)',
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
      description: 'Bruiseweed (i:2453) → Dusky Pigment (i:39334) [1 → 0.6] (100% drop, common)',
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
      description: 'Wild Steelbloom (i:3355) → Burnt Pigment (i:43104) [1 → 0.0545]',
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
      description: "Indigo Pigment group (Fadeleaf, Goldthorn, Khadgar's Whisker, Wintersbite)",
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
      description: "Khadgar's Whisker (i:3358) → Indigo Pigment (i:43105) [1 → 0.1075]",
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
      description: 'Wintersbite (i:3819) → Indigo Pigment (i:43105) [1 → 0.1075]',
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
      description: 'Grave Moss (i:3369) → Golden Pigment (i:39338) [1 → 0.5765]',
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
      description: 'Mageroyal (i:785) → Verdant Pigment (i:43103) [1 → 0.0545] (42% drop, uncommon)',
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
      description: 'Briarthorn (i:2450) → Verdant Pigment (i:43103) [1 → 0.0545] (46.5% drop, uncommon)',
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
      description: 'Swiftthistle (i:2452) → Verdant Pigment (i:43103) [1 → 0.0545] (50% drop, uncommon)',
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
      description: 'Stranglekelp (i:3820) → Verdant Pigment (i:43103) [1 → 0.1075] (50% drop, uncommon)',
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
      description: 'Bruiseweed (i:2453) → Verdant Pigment (i:43103) [1 → 0.1075] (50% drop, uncommon)',
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
      description: 'Rising Glory (i:168586) → Umbral Pigment (i:173056) [1 → 0.195]',
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
      description: "Vigil's Torch (i:170554) → Umbral Pigment (i:173056) [1 → 0.195]",
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
      description: 'Death Blossom (i:169701) → Umbral Pigment (i:173056) [1 → 0.15]',
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
      description: 'Marrowroot (i:168589) → Umbral Pigment (i:173056) [1 → 0.195]',
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
      description: 'Widowbloom (i:168583) → Umbral Pigment (i:173056) [1 → 0.195]',
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
      description: 'Nightshade (i:171315) → Umbral Pigment (i:173056) [1 → 0.25]',
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
      description: 'First Flower (i:187699) → Umbral Pigment (i:173056) [1 → 0.25]',
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
      description: 'Widowbloom (i:168583) → Luminous Pigment (i:173057) [1 → 0.105]',
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
      description: 'Marrowroot (i:168589) → Luminous Pigment (i:173057) [1 → 0.105]',
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
      description: 'Death Blossom (i:169701) → Luminous Pigment (i:173057) [1 → 0.15]',
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
      description: 'Rising Glory (i:168586) → Luminous Pigment (i:173057) [1 → 0.195]',
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
      description: "Vigil's Torch (i:170554) → Luminous Pigment (i:173057) [1 → 0.195]",
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
      description: 'Nightshade (i:171315) → Luminous Pigment (i:173057) [1 → 0.25]',
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
      description: 'First Flower (i:187699) → Luminous Pigment (i:173057) [1 → 0.5]',
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
      description: 'Widowbloom (i:168583) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
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
      description: 'Marrowroot (i:168589) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
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
      description: 'Rising Glory (i:168586) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
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
      description: "Vigil's Torch (i:170554) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)",
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
      description: 'Death Blossom (i:169701) → Tranquil Pigment (i:175788) [1 → 0.006] (3% drop, low yield)',
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
      description: 'Nightshade (i:171315) → Tranquil Pigment (i:175788) [1 → 0.3] (100% drop, best specialist herb)',
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
      description: 'First Flower (i:187699) → Tranquil Pigment (i:175788) [1 → 0.5] (100% drop, highest yield)',
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
      description: 'Hochenblume * (i:191460) → Shimmering Pigment * (i:198421) [1 → 0.7]',
      reagents: [{ itemId: 191460, quantity: 1 }],
      derivatives: [{ itemId: 198421, quantity: 0.7, targetQuality: 1, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume **', target: 'Shimmering Pigment *' },
      description: 'Hochenblume ** (i:191461) → Shimmering Pigment * (i:198421) [1 → 0.7]',
      reagents: [{ itemId: 191461, quantity: 1 }],
      derivatives: [{ itemId: 198421, quantity: 0.7, targetQuality: 1, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume ***', target: 'Shimmering Pigment *' },
      description: 'Hochenblume *** (i:191462) → Shimmering Pigment * (i:198421) [1 → 0.7]',
      reagents: [{ itemId: 191462, quantity: 1 }],
      derivatives: [{ itemId: 198421, quantity: 0.7, targetQuality: 1, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Shimmering Pigment *' },
      description: 'Prismatic Leaper (i:200061) → Shimmering Pigment * (i:198421) [1 → 0.1723]',
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
      description: 'Hochenblume * (i:191460) → Shimmering Pigment ** (i:198422) [1 → 0.7]',
      reagents: [{ itemId: 191460, quantity: 1 }],
      derivatives: [{ itemId: 198422, quantity: 0.7, targetQuality: 2, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume **', target: 'Shimmering Pigment **' },
      description: 'Hochenblume ** (i:191461) → Shimmering Pigment ** (i:198422) [1 → 0.7]',
      reagents: [{ itemId: 191461, quantity: 1 }],
      derivatives: [{ itemId: 198422, quantity: 0.7, targetQuality: 2, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume ***', target: 'Shimmering Pigment **' },
      description: 'Hochenblume *** (i:191462) → Shimmering Pigment ** (i:198422) [1 → 0.7]',
      reagents: [{ itemId: 191462, quantity: 1 }],
      derivatives: [{ itemId: 198422, quantity: 0.7, targetQuality: 2, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Shimmering Pigment **' },
      description: 'Prismatic Leaper (i:200061) → Shimmering Pigment ** (i:198422) [1 → 0.1723]',
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
      description: 'Hochenblume * (i:191460) → Shimmering Pigment *** (i:198423) [1 → 0.7]',
      reagents: [{ itemId: 191460, quantity: 1 }],
      derivatives: [{ itemId: 198423, quantity: 0.7, targetQuality: 3, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume **', target: 'Shimmering Pigment ***' },
      description: 'Hochenblume ** (i:191461) → Shimmering Pigment *** (i:198423) [1 → 0.7]',
      reagents: [{ itemId: 191461, quantity: 1 }],
      derivatives: [{ itemId: 198423, quantity: 0.7, targetQuality: 3, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Hochenblume ***', target: 'Shimmering Pigment ***' },
      description: 'Hochenblume *** (i:191462) → Shimmering Pigment *** (i:198423) [1 → 0.7]',
      reagents: [{ itemId: 191462, quantity: 1 }],
      derivatives: [{ itemId: 198423, quantity: 0.7, targetQuality: 3, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Shimmering Pigment ***' },
      description: 'Prismatic Leaper (i:200061) → Shimmering Pigment *** (i:198423) [1 → 0.1723]',
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
      description: 'Saxifrage * (i:191464) → Blazing Pigment * (i:198418) [1 → 0.7]',
      reagents: [{ itemId: 191464, quantity: 1 }],
      derivatives: [{ itemId: 198418, quantity: 0.7, targetQuality: 1, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage **', target: 'Blazing Pigment *' },
      description: 'Saxifrage ** (i:191465) → Blazing Pigment * (i:198418) [1 → 0.7]',
      reagents: [{ itemId: 191465, quantity: 1 }],
      derivatives: [{ itemId: 198418, quantity: 0.7, targetQuality: 1, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage ***', target: 'Blazing Pigment *' },
      description: 'Saxifrage *** (i:191466) → Blazing Pigment * (i:198418) [1 → 0.7]',
      reagents: [{ itemId: 191466, quantity: 1 }],
      derivatives: [{ itemId: 198418, quantity: 0.7, targetQuality: 1, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Blazing Pigment *' },
      description: 'Prismatic Leaper (i:200061) → Blazing Pigment * (i:198418) [1 → 0.1723]',
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
      description: 'Saxifrage * (i:191464) → Blazing Pigment ** (i:198419) [1 → 0.7]',
      reagents: [{ itemId: 191464, quantity: 1 }],
      derivatives: [{ itemId: 198419, quantity: 0.7, targetQuality: 2, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage **', target: 'Blazing Pigment **' },
      description: 'Saxifrage ** (i:191465) → Blazing Pigment ** (i:198419) [1 → 0.7]',
      reagents: [{ itemId: 191465, quantity: 1 }],
      derivatives: [{ itemId: 198419, quantity: 0.7, targetQuality: 2, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage ***', target: 'Blazing Pigment **' },
      description: 'Saxifrage *** (i:191466) → Blazing Pigment ** (i:198419) [1 → 0.7]',
      reagents: [{ itemId: 191466, quantity: 1 }],
      derivatives: [{ itemId: 198419, quantity: 0.7, targetQuality: 2, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Blazing Pigment **' },
      description: 'Prismatic Leaper (i:200061) → Blazing Pigment ** (i:198419) [1 → 0.1723]',
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
      description: 'Saxifrage * (i:191464) → Blazing Pigment *** (i:198420) [1 → 0.7]',
      reagents: [{ itemId: 191464, quantity: 1 }],
      derivatives: [{ itemId: 198420, quantity: 0.7, targetQuality: 3, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage **', target: 'Blazing Pigment ***' },
      description: 'Saxifrage ** (i:191465) → Blazing Pigment *** (i:198420) [1 → 0.7]',
      reagents: [{ itemId: 191465, quantity: 1 }],
      derivatives: [{ itemId: 198420, quantity: 0.7, targetQuality: 3, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Saxifrage ***', target: 'Blazing Pigment ***' },
      description: 'Saxifrage *** (i:191466) → Blazing Pigment *** (i:198420) [1 → 0.7]',
      reagents: [{ itemId: 191466, quantity: 1 }],
      derivatives: [{ itemId: 198420, quantity: 0.7, targetQuality: 3, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Blazing Pigment ***' },
      description: 'Prismatic Leaper (i:200061) → Blazing Pigment *** (i:198420) [1 → 0.1723]',
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
      description: 'Bubble Poppy * (i:191467) → Serene Pigment * (i:198412) [1 → 0.7]',
      reagents: [{ itemId: 191467, quantity: 1 }],
      derivatives: [{ itemId: 198412, quantity: 0.7, targetQuality: 1, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy **', target: 'Serene Pigment *' },
      description: 'Bubble Poppy ** (i:191468) → Serene Pigment * (i:198412) [1 → 0.7]',
      reagents: [{ itemId: 191468, quantity: 1 }],
      derivatives: [{ itemId: 198412, quantity: 0.7, targetQuality: 1, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy ***', target: 'Serene Pigment *' },
      description: 'Bubble Poppy *** (i:191469) → Serene Pigment * (i:198412) [1 → 0.7]',
      reagents: [{ itemId: 191469, quantity: 1 }],
      derivatives: [{ itemId: 198412, quantity: 0.7, targetQuality: 1, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Serene Pigment *' },
      description: 'Prismatic Leaper (i:200061) → Serene Pigment * (i:198412) [1 → 0.1723]',
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
      description: 'Bubble Poppy * (i:191467) → Serene Pigment ** (i:198413) [1 → 0.7]',
      reagents: [{ itemId: 191467, quantity: 1 }],
      derivatives: [{ itemId: 198413, quantity: 0.7, targetQuality: 2, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy **', target: 'Serene Pigment **' },
      description: 'Bubble Poppy ** (i:191468) → Serene Pigment ** (i:198413) [1 → 0.7]',
      reagents: [{ itemId: 191468, quantity: 1 }],
      derivatives: [{ itemId: 198413, quantity: 0.7, targetQuality: 2, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy ***', target: 'Serene Pigment **' },
      description: 'Bubble Poppy *** (i:191469) → Serene Pigment ** (i:198413) [1 → 0.7]',
      reagents: [{ itemId: 191469, quantity: 1 }],
      derivatives: [{ itemId: 198413, quantity: 0.7, targetQuality: 2, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Serene Pigment **' },
      description: 'Prismatic Leaper (i:200061) → Serene Pigment ** (i:198413) [1 → 0.1723]',
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
      description: 'Bubble Poppy * (i:191467) → Serene Pigment *** (i:198414) [1 → 0.7]',
      reagents: [{ itemId: 191467, quantity: 1 }],
      derivatives: [{ itemId: 198414, quantity: 0.7, targetQuality: 3, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy **', target: 'Serene Pigment ***' },
      description: 'Bubble Poppy ** (i:191468) → Serene Pigment *** (i:198414) [1 → 0.7]',
      reagents: [{ itemId: 191468, quantity: 1 }],
      derivatives: [{ itemId: 198414, quantity: 0.7, targetQuality: 3, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Bubble Poppy ***', target: 'Serene Pigment ***' },
      description: 'Bubble Poppy *** (i:191469) → Serene Pigment *** (i:198414) [1 → 0.7]',
      reagents: [{ itemId: 191469, quantity: 1 }],
      derivatives: [{ itemId: 198414, quantity: 0.7, targetQuality: 3, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Serene Pigment ***' },
      description: 'Prismatic Leaper (i:200061) → Serene Pigment *** (i:198414) [1 → 0.1723]',
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
      description: 'Writhebark * (i:191470) → Flourishing Pigment * (i:198415) [1 → 0.7]',
      reagents: [{ itemId: 191470, quantity: 1 }],
      derivatives: [{ itemId: 198415, quantity: 0.7, targetQuality: 1, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark **', target: 'Flourishing Pigment *' },
      description: 'Writhebark ** (i:191471) → Flourishing Pigment * (i:198415) [1 → 0.7]',
      reagents: [{ itemId: 191471, quantity: 1 }],
      derivatives: [{ itemId: 198415, quantity: 0.7, targetQuality: 1, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark ***', target: 'Flourishing Pigment *' },
      description: 'Writhebark *** (i:191472) → Flourishing Pigment * (i:198415) [1 → 0.7]',
      reagents: [{ itemId: 191472, quantity: 1 }],
      derivatives: [{ itemId: 198415, quantity: 0.7, targetQuality: 1, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Flourishing Pigment *' },
      description: 'Prismatic Leaper (i:200061) → Flourishing Pigment * (i:198415) [1 → 0.1723]',
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
      description: 'Writhebark * (i:191470) → Flourishing Pigment ** (i:198416) [1 → 0.7]',
      reagents: [{ itemId: 191470, quantity: 1 }],
      derivatives: [{ itemId: 198416, quantity: 0.7, targetQuality: 2, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark **', target: 'Flourishing Pigment **' },
      description: 'Writhebark ** (i:191471) → Flourishing Pigment ** (i:198416) [1 → 0.7]',
      reagents: [{ itemId: 191471, quantity: 1 }],
      derivatives: [{ itemId: 198416, quantity: 0.7, targetQuality: 2, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark ***', target: 'Flourishing Pigment **' },
      description: 'Writhebark *** (i:191472) → Flourishing Pigment ** (i:198416) [1 → 0.7]',
      reagents: [{ itemId: 191472, quantity: 1 }],
      derivatives: [{ itemId: 198416, quantity: 0.7, targetQuality: 2, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Flourishing Pigment **' },
      description: 'Prismatic Leaper (i:200061) → Flourishing Pigment ** (i:198416) [1 → 0.1723]',
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
      description: 'Writhebark * (i:191470) → Flourishing Pigment *** (i:198417) [1 → 0.7]',
      reagents: [{ itemId: 191470, quantity: 1 }],
      derivatives: [{ itemId: 198417, quantity: 0.7, targetQuality: 3, sourceQuality: 1 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark **', target: 'Flourishing Pigment ***' },
      description: 'Writhebark ** (i:191471) → Flourishing Pigment *** (i:198417) [1 → 0.7]',
      reagents: [{ itemId: 191471, quantity: 1 }],
      derivatives: [{ itemId: 198417, quantity: 0.7, targetQuality: 3, sourceQuality: 2 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Writhebark ***', target: 'Flourishing Pigment ***' },
      description: 'Writhebark *** (i:191472) → Flourishing Pigment *** (i:198417) [1 → 0.7]',
      reagents: [{ itemId: 191472, quantity: 1 }],
      derivatives: [{ itemId: 198417, quantity: 0.7, targetQuality: 3, sourceQuality: 3 }],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_INSC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_INSC,
      names: { source: 'Prismatic Leaper', target: 'Flourishing Pigment ***' },
      description: 'Prismatic Leaper (i:200061) → Flourishing Pigment *** (i:198417) [1 → 0.1723]',
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
      description: 'Prismatic Leaper (i:200061) → Rousing Fire (i:190320) [1 → 0.0019]',
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
      description: 'Prismatic Leaper (i:200061) → Rousing Frost (i:190328) [1 → 0.0019]',
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
      description: 'Prismatic Leaper (i:200061) → Rousing Order (i:190322) [1 → 0.001]',
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
      description: 'Terocone (i:22789) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
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
      description: 'Ragveil (i:22787) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
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
      description: 'Felweed (i:22785) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
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
      description: 'Dreaming Glory (i:22786) → Nether Pigment (i:39342) [1 → 0.56] (100% drop, common)',
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
      description: 'Nightmare Vine (i:22792) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
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
      description: 'Ancient Lichen (i:22790) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
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
      description: 'Netherbloom (i:22791) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
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
      description: 'Mana Thistle (i:22793) → Nether Pigment (i:39342) [1 → 0.6] (100% drop, common)',
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
      description: 'Terocone (i:22789) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
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
      description: 'Ragveil (i:22787) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
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
      description: 'Felweed (i:22785) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
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
      description: 'Dreaming Glory (i:22786) → Ebon Pigment (i:43108) [1 → 0.0875] (40% drop, uncommon)',
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
      description: 'Ancient Lichen (i:22790) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
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
      description: 'Netherbloom (i:22791) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
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
      description: 'Nightmare Vine (i:22792) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
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
      description: 'Mana Thistle (i:22793) → Ebon Pigment (i:43108) [1 → 0.1075] (50% drop, uncommon)',
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
      description: "Talandra's Rose (i:36907) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)",
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
      description: 'Fire Leaf (i:39970) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
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
      description: 'Tiger Lily (i:36904) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
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
      description: 'Deadnettle (i:37921) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
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
      description: 'Goldclover (i:36901) → Azure Pigment (i:39343) [1 → 0.5360] (100% drop, common)',
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
      description: 'Icethorn (i:36906) → Azure Pigment (i:39343) [1 → 0.6] (100% drop, common)',
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
      description: 'Lichbloom (i:36905) → Azure Pigment (i:39343) [1 → 0.6] (100% drop, common)',
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
      description: "Adder's Tongue (i:36903) → Azure Pigment (i:39343) [1 → 0.6] (100% drop, common)",
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
      description: "Talandra's Rose (i:36907) → Icy Pigment (i:43109) [1 → 0.0755] (33% drop, uncommon)",
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
      description: 'Fire Leaf (i:39970) → Icy Pigment (i:43109) [1 → 0.0795] (33% drop, uncommon)',
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
      description: 'Tiger Lily (i:36904) → Icy Pigment (i:43109) [1 → 0.0835] (33% drop, uncommon)',
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
      description: 'Deadnettle (i:37921) → Icy Pigment (i:43109) [1 → 0.0875] (40% drop, uncommon)',
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
      description: 'Goldclover (i:36901) → Icy Pigment (i:43109) [1 → 0.0875] (40% drop, uncommon)',
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
      description: "Adder's Tongue (i:36903) → Icy Pigment (i:43109) [1 → 0.1075] (50% drop, uncommon)",
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
      description: 'Lichbloom (i:36905) → Icy Pigment (i:43109) [1 → 0.1075] (50% drop, uncommon)',
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
      description: 'Icethorn (i:36906) → Icy Pigment (i:43109) [1 → 0.1075] (50% drop, uncommon)',
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
      description: "Azshara's Veil (i:52985) → Ashen Pigment (i:61979) [1 → 0.56] (100% drop, common)",
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
      description: 'Cinderbloom (i:52983) → Ashen Pigment (i:61979) [1 → 0.56] (100% drop, common)',
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
      description: 'Stormvine (i:52984) → Ashen Pigment (i:61979) [1 → 0.5855] (100% drop, common)',
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
      description: 'Heartblossom (i:52986) → Ashen Pigment (i:61979) [1 → 0.5855] (100% drop, common)',
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
      description: 'Whiptail (i:52988) → Ashen Pigment (i:61979) [1 → 0.6] (100% drop, common)',
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
      description: 'Twilight Jasmine (i:52987) → Ashen Pigment (i:61979) [1 → 0.6] (100% drop, common)',
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
      description: "Azshara's Veil (i:52985) → Burning Embers (i:61980) [1 → 0.0875] (10% drop, uncommon)",
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
      description: 'Cinderbloom (i:52983) → Burning Embers (i:61980) [1 → 0.0915] (10% drop, uncommon)',
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
      description: 'Stormvine (i:52984) → Burning Embers (i:61980) [1 → 0.0995] (10% drop, uncommon)',
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
      description: 'Heartblossom (i:52986) → Burning Embers (i:61980) [1 → 0.0955] (10% drop, uncommon)',
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
      description: 'Whiptail (i:52988) → Burning Embers (i:61980) [1 → 0.1075] (10% drop, uncommon)',
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
      description: 'Twilight Jasmine (i:52987) → Burning Embers (i:61980) [1 → 0.1075] (10% drop, uncommon)',
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
      description: 'Green Tea Leaf (i:72234) → Shadow Pigment (i:79251) [1 → 0.566] (100% drop, common)',
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
      description: 'Rain Poppy (i:72237) → Shadow Pigment (i:79251) [1 → 0.572] (100% drop, common)',
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
      description: 'Silkweed (i:72235) → Shadow Pigment (i:79251) [1 → 0.572] (100% drop, common)',
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
      description: 'Desecrated Herb (i:89639) → Shadow Pigment (i:79251) [1 → 0.578] (100% drop, common)',
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
      description: 'Snow Lily (i:79010) → Shadow Pigment (i:79251) [1 → 0.578] (100% drop, common)',
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
      description: "Fool's Cap (i:79011) → Shadow Pigment (i:79251) [1 → 0.6] (100% drop, common)",
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
      description: 'Green Tea Leaf (i:72234) → Misty Pigment (i:79253) [1 → 0.086] (10% drop, uncommon)',
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
      description: 'Rain Poppy (i:72237) → Misty Pigment (i:79253) [1 → 0.09] (10% drop, uncommon)',
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
      description: 'Silkweed (i:72235) → Misty Pigment (i:79253) [1 → 0.09] (10% drop, uncommon)',
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
      description: 'Desecrated Herb (i:89639) → Misty Pigment (i:79253) [1 → 0.094] (10% drop, uncommon)',
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
      description: 'Snow Lily (i:79010) → Misty Pigment (i:79253) [1 → 0.094] (10% drop, uncommon)',
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
      description: "Fool's Cap (i:79011) → Misty Pigment (i:79253) [1 → 0.1075] (10% drop, uncommon)",
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
      description: 'Frostweed (i:109124) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
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
      description: 'Fireweed (i:109125) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
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
      description: 'Gorgrond Flytrap (i:109126) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
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
      description: 'Starflower (i:109127) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
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
      description: 'Nagrand Arrowbloom (i:109128) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
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
      description: 'Talador Orchid (i:109129) → Cerulean Pigment (i:114931) [1 → 0.42] (100% drop, common)',
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
      description: 'Aethril (i:124101) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
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
      description: 'Astral Glory (i:151565) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
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
      description: 'Dreamleaf (i:124102) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
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
      description: 'Foxflower (i:124103) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
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
      description: 'Felwort (i:124106) → Roseate Pigment (i:129032) [1 → 0.42] (100% drop, common)',
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
      description: 'Fjarnskaggl (i:124104) → Roseate Pigment (i:129032) [1 → 0.466] (100% drop, common)',
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
      description: 'Starlight Rose (i:124105) → Roseate Pigment (i:129032) [1 → 1.212] (100% drop, common)',
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
      description: 'Aethril (i:124101) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
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
      description: 'Astral Glory (i:151565) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
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
      description: 'Dreamleaf (i:124102) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
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
      description: 'Foxflower (i:124103) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
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
      description: 'Starlight Rose (i:124105) → Sallow Pigment (i:129034) [1 → 0.044] (5% drop, uncommon)',
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
      description: 'Fjarnskaggl (i:124104) → Sallow Pigment (i:129034) [1 → 0.0495] (5% drop, uncommon)',
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
      description: 'Felwort (i:124106) → Sallow Pigment (i:129034) [1 → 2.148] (5% drop, uncommon)',
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
      description: "Akunda's Bite (i:152507) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)",
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
      description: 'Riverbud (i:152505) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
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
      description: 'Sea Stalk (i:152511) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
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
      description: "Siren's Pollen (i:152509) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)",
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
      description: 'Star Moss (i:152506) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
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
      description: "Winter's Kiss (i:152508) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)",
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
      description: 'Anchor Weed (i:152510) → Ultramarine Pigment (i:153635) [1 → 0.75] (100% drop, common)',
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
      description: "Akunda's Bite (i:152507) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)",
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
      description: 'Riverbud (i:152505) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
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
      description: 'Sea Stalk (i:152511) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
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
      description: "Siren's Pollen (i:152509) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)",
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
      description: 'Star Moss (i:152506) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
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
      description: "Winter's Kiss (i:152508) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)",
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
      description: 'Anchor Weed (i:152510) → Crimson Pigment (i:153636) [1 → 0.272] (25% drop, uncommon)',
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
      description: "Zin'anthid (i:168487) → Maroon Pigment (i:168662) [1 → 0.6] (100% drop, common)",
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
      description: 'Riverbud (i:152505) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)',
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
      description: 'Star Moss (i:152506) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)',
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
      description: "Akunda's Bite (i:152507) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)",
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
      description: "Winter's Kiss (i:152508) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)",
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
      description: "Siren's Pollen (i:152509) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)",
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
      description: 'Sea Stalk (i:152511) → Viridescent Pigment (i:153669) [1 → 0.111] (3% drop, uncommon)',
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
      description: 'Anchor Weed (i:152510) → Viridescent Pigment (i:153669) [1 → 0.315] (3% drop, uncommon)',
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
      description: 'Widowbloom (i:168583) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
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
      description: 'Marrowroot (i:168589) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
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
      description: 'Rising Glory (i:168586) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
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
      description: "Vigil's Torch (i:170554) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)",
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
      description: 'Death Blossom (i:169701) → Tranquil Pigment (i:175788) [1 → 0.006] (1% drop, ultra-rare)',
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

/**
 * PROSPECTING CONVERSIONS - Ore to Gems & Shards
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

// Profession ID for Jewelcrafting is 755
const PROF_JC = PROFESSION_TICKER.JWLC;

export const PROSPECTING = {
  name: PROF_JC,
  profession: 'Jewelcrafting',
  media: 'https://render-eu.worldofwarcraft.com/icons/56/inv_pick_stone.jpg',
  spellId: 25098,
  methods: [
    // ========================================================================
    // CLASSIC ERA - Copper & Tin Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore', target: 'Malachite' },
      description: 'Copper Ore (i:2770) → Malachite (i:774) [5 → 0.5]',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 774,
          quantity: 0.5,
          matRate: 0.9,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Malachite
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore', target: 'Tigerseye' },
      description: 'Copper Ore (i:2770) → Tigerseye (i:818) [5 → 0.5]',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 818,
          quantity: 0.5,
          matRate: 0.9,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Tigerseye
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore', target: 'Moss Agate' },
      description: 'Tin Ore (i:3575) → Moss Agate (i:1206) [5 → 0.36]',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        {
          itemId: 1206,
          quantity: 0.36,
          matRate: 0.85,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Moss Agate
      ],
    },

    // ========================================================================
    // CLASSIC ERA - Iron & Gold Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore', target: 'Shadowgem' },
      description: 'Tin Ore (i:2771) → Shadowgem (i:1210) [5 → 0.36]',
      reagents: [{ itemId: 2771, quantity: 5 }],
      derivatives: [
        {
          itemId: 1210,
          quantity: 0.36,
          matRate: 0.85,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Shadowgem
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore', target: 'Shadowgem' },
      description: 'Copper Ore (i:2770) → Shadowgem (i:1210) [5 → 0.1]',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 1210,
          quantity: 0.1,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Shadowgem
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore', target: 'Lesser Moonstone' },
      description: 'Tin Ore (i:2771) → Lesser Moonstone (i:1705) [5 → 0.36]',
      reagents: [{ itemId: 2771, quantity: 5 }],
      derivatives: [
        {
          itemId: 1705,
          quantity: 0.36,
          matRate: 0.85,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Lesser Moonstone
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Iron Ore', target: 'Lesser Moonstone' },
      description: 'Iron Ore (i:2772) → Lesser Moonstone (i:1705) [5 → 0.33]',
      reagents: [{ itemId: 2772, quantity: 5 }],
      derivatives: [
        {
          itemId: 1705,
          quantity: 0.33,
          matRate: 0.82,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Lesser Moonstone
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Iron Ore', target: 'Jade' },
      description: 'Iron Ore (i:2772) → Jade (i:1529) [5 → 0.33]',
      reagents: [{ itemId: 2772, quantity: 5 }],
      derivatives: [
        {
          itemId: 1529,
          quantity: 0.33,
          matRate: 0.82,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Jade
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore', target: 'Jade' },
      description: 'Tin Ore (i:2771) → Jade (i:1529) [5 → 0.0325]',
      reagents: [{ itemId: 2771, quantity: 5 }],
      derivatives: [
        {
          itemId: 1529,
          quantity: 0.0325,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Jade
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Iron Ore', target: 'Citrine' },
      description: 'Iron Ore (i:2772) → Citrine (i:3864) [5 → 0.33]',
      reagents: [{ itemId: 2772, quantity: 5 }],
      derivatives: [
        {
          itemId: 3864,
          quantity: 0.33,
          matRate: 0.82,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Citrine
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Gold Ore', target: 'Citrine' },
      description: 'Gold Ore (i:2772) → Citrine (i:3862) [5 → 0.8]',
      reagents: [{ itemId: 2772, quantity: 5 }],
      derivatives: [
        {
          itemId: 3862,
          quantity: 0.8,
          matRate: 0.9,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Citrine
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Gold Ore', target: 'Ruby' },
      description: 'Gold Ore (i:2772) → Ruby (i:1529) [5 → 0.4]',
      reagents: [{ itemId: 2772, quantity: 5 }],
      derivatives: [
        {
          itemId: 1529,
          quantity: 0.4,
          matRate: 0.88,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Ruby
      ],
    },

    // ========================================================================
    // CLASSIC ERA - Mithril & Thorium Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Mithril Ore', target: 'Emerald' },
      description: 'Mithril Ore (i:3858) → Emerald (i:7909) [5 → 0.8]',
      reagents: [{ itemId: 3858, quantity: 5 }],
      derivatives: [
        {
          itemId: 7909,
          quantity: 0.8,
          matRate: 0.9,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Emerald
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Mithril Ore', target: 'Sapphire' },
      description: 'Mithril Ore (i:3858) → Sapphire (i:1707) [5 → 0.4]',
      reagents: [{ itemId: 3858, quantity: 5 }],
      derivatives: [
        {
          itemId: 1707,
          quantity: 0.4,
          matRate: 0.88,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Sapphire
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Thorium Ore', target: 'Diamond' },
      description: 'Thorium Ore (i:3859) → Diamond (i:12361) [5 → 0.8]',
      reagents: [{ itemId: 3859, quantity: 5 }],
      derivatives: [
        {
          itemId: 12361,
          quantity: 0.8,
          matRate: 0.9,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        }, // Diamond
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Thorium Ore', target: 'Azerothian Diamond' },
      description: 'Thorium Ore (i:3859) → Azerothian Diamond (i:12800) [5 → 0.4]',
      reagents: [{ itemId: 3859, quantity: 5 }],
      derivatives: [
        {
          itemId: 12800,
          quantity: 0.4,
          matRate: 0.88,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        }, // Azerothian Diamond
      ],
    },

    // ========================================================================
    // OUTLAND - Fel Iron & Adamantite Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Fel Iron Ore', target: 'Prismatic Shards' },
      description: 'Fel Iron Ore (i:23425) → Prismatic Shards & Gems',
      reagents: [{ itemId: 23425, quantity: 5 }],
      derivatives: [
        {
          itemId: 21929,
          quantity: 1.2,
          matRate: 0.85,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 3,
        }, // Prismatic Shard
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: {
        source: 'Adamantite Ore',
        target: 'Prismatic Shards & High Gems',
      },
      description: 'Adamantite Ore (i:23426) → Prismatic Shards & High Quality Gems',
      reagents: [{ itemId: 23426, quantity: 5 }],
      derivatives: [
        {
          itemId: 21929,
          quantity: 1.5,
          matRate: 0.88,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 4,
        }, // Prismatic Shard
      ],
    },

    // ========================================================================
    // WRATH - Cobalt & Saronite Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Cobalt Ore', target: 'Eternal Fire & Gems' },
      description: 'Cobalt Ore (i:36910) → Eternal Fire & Gems',
      reagents: [{ itemId: 36910, quantity: 5 }],
      derivatives: [
        {
          itemId: 36860,
          quantity: 0.5,
          matRate: 0.8,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Eternal Fire
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Saronite Ore', target: 'Eternal Earth' },
      description: 'Saronite Ore (i:36911) → Eternal Earth [5 → 0.6]',
      reagents: [{ itemId: 36911, quantity: 5 }],
      derivatives: [
        {
          itemId: 36859,
          quantity: 0.6,
          matRate: 0.82,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Eternal Earth
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Saronite Ore', target: 'Eternal Fire' },
      description: 'Saronite Ore (i:36911) → Eternal Fire [5 → 0.4]',
      reagents: [{ itemId: 36911, quantity: 5 }],
      derivatives: [
        {
          itemId: 36860,
          quantity: 0.4,
          matRate: 0.8,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Eternal Fire
      ],
    },

    // ========================================================================
    // CATACLYSM - Obsidium & Elementium Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Obsidium Ore', target: 'Hessonite' },
      description: 'Obsidium Ore (i:53038) → Hessonite (i:52256) [5 → 1.0]',
      reagents: [{ itemId: 53038, quantity: 5 }],
      derivatives: [
        {
          itemId: 52256,
          quantity: 1.0,
          matRate: 0.88,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 3,
        }, // Hessonite
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Obsidium Ore', target: 'Jasper' },
      description: 'Obsidium Ore (i:53038) → Jasper (i:52183) [5 → 0.6]',
      reagents: [{ itemId: 53038, quantity: 5 }],
      derivatives: [
        {
          itemId: 52183,
          quantity: 0.6,
          matRate: 0.82,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Jasper
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Elementium Ore', target: 'Amberjewel' },
      description: 'Elementium Ore (i:52185) → Amberjewel (i:52198) [5 → 1.0]',
      reagents: [{ itemId: 52185, quantity: 5 }],
      derivatives: [
        {
          itemId: 52198,
          quantity: 1.0,
          matRate: 0.88,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 3,
        }, // Amberjewel
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Elementium Ore', target: 'Alicite' },
      description: 'Elementium Ore (i:52185) → Alicite (i:52255) [5 → 0.6]',
      reagents: [{ itemId: 52185, quantity: 5 }],
      derivatives: [
        {
          itemId: 52255,
          quantity: 0.6,
          matRate: 0.82,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 3,
        }, // Alicite
      ],
    },

    // ========================================================================
    // MISTS OF PANDARIA - Copper Ore to Gems
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore (MOP)', target: 'Various Gems' },
      description: 'Copper Ore (i:2770) → Gems & Shards',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 76133,
          quantity: 0.8,
          matRate: 0.8,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Vermillion Sapphire
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore (MOP)', target: 'Various Gems' },
      description: 'Tin Ore (i:3575) → Gems & Shards',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        {
          itemId: 76137,
          quantity: 0.8,
          matRate: 0.8,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Sunstone
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Kyparite', target: 'Primordial Ruby' },
      description: 'Kyparite (i:72092) → Primordial Ruby (i:76130) [5 → 0.8]',
      reagents: [{ itemId: 72092, quantity: 5 }],
      derivatives: [
        {
          itemId: 76130,
          quantity: 0.8,
          matRate: 0.85,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        }, // Primordial Ruby
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Kyparite', target: 'Prismatic Shard' },
      description: 'Kyparite (i:72092) → Prismatic Shard (i:52180) [5 → 0.2]',
      reagents: [{ itemId: 72092, quantity: 5 }],
      derivatives: [
        {
          itemId: 52180,
          quantity: 0.2,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Prismatic Shard
      ],
    },

    // ========================================================================
    // WARLORDS OF DRAENOR - Draenor Ore
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.WOD,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Draenor Ore', target: 'Draenite & Other Gems' },
      description: 'Draenor Ore (i:109119) → Draenite Gems',
      reagents: [{ itemId: 109119, quantity: 5 }],
      derivatives: [
        {
          itemId: 109126,
          quantity: 0.45,
          matRate: 0.78,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Polished Draenite
      ],
    },

    // ========================================================================
    // LEGION - Felslate & Leystone Ore
    // ========================================================================
    {
      expansion: 'LEGION',
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Felslate Ore', target: 'Various Gems' },
      description: 'Felslate Ore (i:123918) → Gems & Essences',
      reagents: [{ itemId: 123918, quantity: 5 }],
      derivatives: [
        {
          itemId: 130250,
          quantity: 0.5,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Gem Fragment
      ],
    },
    {
      expansion: 'LEGION',
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Leystone Ore', target: 'Various Gems' },
      description: 'Leystone Ore (i:123919) → Higher Quality Gems',
      reagents: [{ itemId: 123919, quantity: 5 }],
      derivatives: [
        {
          itemId: 130250,
          quantity: 0.6,
          matRate: 0.78,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Gem Fragment
      ],
    },

    // ========================================================================
    // BATTLE FOR AZEROTH - Ore Conversions
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore (BFA)', target: 'Gems & Shards' },
      description: 'Copper Ore (i:2770) → Gems',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 152512,
          quantity: 0.8,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Gem Fragment
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore (BFA)', target: 'Gems & Shards' },
      description: 'Tin Ore (i:3575) → Gems',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        {
          itemId: 152512,
          quantity: 0.8,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Gem Fragment
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Monelite Ore', target: 'Gem Fragment' },
      description: 'Monelite Ore (i:152579) → Gem Fragment (i:152512) [5 → 1.2]',
      reagents: [{ itemId: 152579, quantity: 5 }],
      derivatives: [
        {
          itemId: 152512,
          quantity: 1.2,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 3,
        }, // Gem Fragment
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Monelite Ore', target: 'Shard' },
      description: 'Monelite Ore (i:152579) → Shard (i:154123) [5 → 0.1]',
      reagents: [{ itemId: 152579, quantity: 5 }],
      derivatives: [
        {
          itemId: 154123,
          quantity: 0.1,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Shard
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Storm Silver Ore', target: 'Gem Fragment' },
      description: 'Storm Silver Ore (i:152580) → Gem Fragment (i:152512) [5 → 1.2]',
      reagents: [{ itemId: 152580, quantity: 5 }],
      derivatives: [
        {
          itemId: 152512,
          quantity: 1.2,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 3,
        }, // Gem Fragment
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Storm Silver Ore', target: 'Shard' },
      description: 'Storm Silver Ore (i:152580) → Shard (i:154123) [5 → 0.2]',
      reagents: [{ itemId: 152580, quantity: 5 }],
      derivatives: [
        {
          itemId: 154123,
          quantity: 0.2,
          matRate: 0.72,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Shard
      ],
    },

    // ========================================================================
    // SHADOWLANDS - Ore Conversions
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore (SL)', target: 'Shards' },
      description: 'Copper Ore (i:2770) → Shards',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 177045,
          quantity: 0.8,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Shard
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore (SL)', target: 'Shards' },
      description: 'Tin Ore (i:3575) → Shards',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        {
          itemId: 177045,
          quantity: 0.8,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Shard
      ],
    },
    {
      expansion: EXPANSION_TICKER.SHDW,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Oxxein Ore', target: 'Vibrant Shards & Gems' },
      description: 'Oxxein Ore (i:171833) → Vibrant Shards (i:177045) & Gems [5 → 1.5 + gems]',
      reagents: [{ itemId: 171833, quantity: 5 }],
      derivatives: [
        {
          itemId: 177045,
          quantity: 1.5,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 2,
        }, // Vibrant Shard
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Rare Gems with Quality Tiers (5 types × 3 qualities)
    // ========================================================================
    // Queen's Ruby *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: "Queen's Ruby *" },
      description: "Dragonflight Ores → Queen's Ruby * (i:192837) [rare gem]",
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192837,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Queen's Ruby **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: "Queen's Ruby **" },
      description: "Dragonflight Ores → Queen's Ruby ** (i:192838) [rare gem]",
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192838,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Queen's Ruby ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: "Queen's Ruby ***" },
      description: "Dragonflight Ores → Queen's Ruby *** (i:192839) [rare gem]",
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192839,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Mystic Sapphire *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Mystic Sapphire *' },
      description: 'Dragonflight Ores → Mystic Sapphire * (i:192840) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192840,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Mystic Sapphire **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Mystic Sapphire **' },
      description: 'Dragonflight Ores → Mystic Sapphire ** (i:192841) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192841,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Mystic Sapphire ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Mystic Sapphire ***' },
      description: 'Dragonflight Ores → Mystic Sapphire *** (i:192842) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192842,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Vibrant Emerald *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Vibrant Emerald *' },
      description: 'Dragonflight Ores → Vibrant Emerald * (i:192843) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192843,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Vibrant Emerald **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Vibrant Emerald **' },
      description: 'Dragonflight Ores → Vibrant Emerald ** (i:192844) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192844,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Vibrant Emerald ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Vibrant Emerald ***' },
      description: 'Dragonflight Ores → Vibrant Emerald *** (i:192845) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192845,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Sundered Onyx *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Sundered Onyx *' },
      description: 'Dragonflight Ores → Sundered Onyx * (i:192846) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192846,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Sundered Onyx **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Sundered Onyx **' },
      description: 'Dragonflight Ores → Sundered Onyx ** (i:192847) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192847,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Sundered Onyx ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Sundered Onyx ***' },
      description: 'Dragonflight Ores → Sundered Onyx *** (i:192848) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192848,
          quantity: 0.125,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Eternity Amber *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Eternity Amber *' },
      description: 'Dragonflight Ores → Eternity Amber * (i:192849) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192849,
          quantity: 0.35,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Eternity Amber **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Eternity Amber **' },
      description: 'Dragonflight Ores → Eternity Amber ** (i:192850) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192850,
          quantity: 0.35,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Eternity Amber ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Eternity Amber ***' },
      description: 'Dragonflight Ores → Eternity Amber *** (i:192851) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192851,
          quantity: 0.35,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Epic Gems with Quality Tiers (6 types × 3 qualities)
    // ========================================================================
    // Alexstraszite *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 4,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Alexstraszite *' },
      description: 'Dragonflight Ores → Alexstraszite * (i:192852) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192852,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Alexstraszite **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 5,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Alexstraszite **' },
      description: 'Dragonflight Ores → Alexstraszite ** (i:192853) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192853,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Alexstraszite ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 6,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Alexstraszite ***' },
      description: 'Dragonflight Ores → Alexstraszite *** (i:192855) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192855,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Malygite *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 4,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Malygite *' },
      description: 'Dragonflight Ores → Malygite * (i:192856) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192856,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Malygite **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 5,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Malygite **' },
      description: 'Dragonflight Ores → Malygite ** (i:192857) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192857,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Malygite ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 6,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Malygite ***' },
      description: 'Dragonflight Ores → Malygite *** (i:192858) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192858,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Ysemerald *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 4,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Ysemerald *' },
      description: 'Dragonflight Ores → Ysemerald * (i:192859) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192859,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Ysemerald **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 5,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Ysemerald **' },
      description: 'Dragonflight Ores → Ysemerald ** (i:192860) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192860,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Ysemerald ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 6,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Ysemerald ***' },
      description: 'Dragonflight Ores → Ysemerald *** (i:192861) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192861,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Neltharite *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 4,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Neltharite *' },
      description: 'Dragonflight Ores → Neltharite * (i:192862) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192862,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Neltharite **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 5,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Neltharite **' },
      description: 'Dragonflight Ores → Neltharite ** (i:192863) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192863,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Neltharite ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 6,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Neltharite ***' },
      description: 'Dragonflight Ores → Neltharite *** (i:192865) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192865,
          quantity: 0.0425,
          matRate: 0.65,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Nozdorite *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 7,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Nozdorite *' },
      description: 'Dragonflight Ores → Nozdorite * (i:192866) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192866,
          quantity: 0.15,
          matRate: 0.68,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Nozdorite **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 8,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Nozdorite **' },
      description: 'Dragonflight Ores → Nozdorite ** (i:192867) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192867,
          quantity: 0.15,
          matRate: 0.68,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Nozdorite ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 9,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Nozdorite ***' },
      description: 'Dragonflight Ores → Nozdorite *** (i:192868) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192868,
          quantity: 0.15,
          matRate: 0.68,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Illimited Diamond *
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 7,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Illimited Diamond *' },
      description: 'Dragonflight Ores → Illimited Diamond * (i:192869) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192869,
          quantity: 0.0055,
          matRate: 0.6,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Illimited Diamond **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 8,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Illimited Diamond **' },
      description: 'Dragonflight Ores → Illimited Diamond ** (i:192870) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192870,
          quantity: 0.0055,
          matRate: 0.6,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Illimited Diamond ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 9,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Illimited Diamond ***' },
      description: 'Dragonflight Ores → Illimited Diamond *** (i:192871) [epic gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: "Khaz'gorite Ore *" },
        { itemId: 190313, quantity: 1, label: "Khaz'gorite Ore **" },
        { itemId: 190314, quantity: 1, label: "Khaz'gorite Ore ***" },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [
        {
          itemId: 192871,
          quantity: 0.0055,
          matRate: 0.6,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Essences & Special Materials
    // ========================================================================
    // Essence of Rebirth
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Essence of Rebirth' },
      description: 'Dragonflight Ores → Essence of Rebirth (i:173170)',
      reagents: [
        { itemId: 171828, quantity: 1, label: 'Laestrite Ore' },
        { itemId: 171831, quantity: 1, label: 'Phaedrum Ore' },
        { itemId: 171833, quantity: 1, label: 'Elethium Ore' },
        { itemId: 187700, quantity: 1, label: 'Progenium Ore' },
      ],
      derivatives: [
        {
          itemId: 173170,
          quantity: 0.2,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Essence of Torment
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Essence of Torment' },
      description: 'Dragonflight Ores → Essence of Torment (i:173171)',
      reagents: [
        { itemId: 171828, quantity: 1, label: 'Laestrite Ore' },
        { itemId: 171832, quantity: 1, label: 'Sinvyr Ore' },
        { itemId: 171833, quantity: 1, label: 'Elethium Ore' },
        { itemId: 187700, quantity: 1, label: 'Progenium Ore' },
      ],
      derivatives: [
        {
          itemId: 173171,
          quantity: 0.2,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Essence of Servitude
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Essence of Servitude' },
      description: 'Dragonflight Ores → Essence of Servitude (i:173172)',
      reagents: [
        { itemId: 171828, quantity: 1, label: 'Laestrite Ore' },
        { itemId: 171830, quantity: 1, label: 'Oxxein Ore' },
        { itemId: 171833, quantity: 1, label: 'Elethium Ore' },
        { itemId: 187700, quantity: 1, label: 'Progenium Ore' },
      ],
      derivatives: [
        {
          itemId: 173172,
          quantity: 0.2,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Essence of Valor
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Essence of Valor' },
      description: 'Dragonflight Ores → Essence of Valor (i:173173)',
      reagents: [
        { itemId: 171828, quantity: 1, label: 'Laestrite Ore' },
        { itemId: 171829, quantity: 1, label: 'Solenium Ore' },
        { itemId: 171833, quantity: 1, label: 'Elethium Ore' },
        { itemId: 187700, quantity: 1, label: 'Progenium Ore' },
      ],
      derivatives: [
        {
          itemId: 173173,
          quantity: 0.2,
          matRate: 0.7,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // BURNING CRUSADE - Rare Gems
    // ========================================================================
    // Dawnstone
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'TBC Ores', target: 'Dawnstone' },
      description: 'TBC Ores → Dawnstone (i:23440) [rare gem]',
      reagents: [
        { itemId: 23424, quantity: 1, label: 'Fel Iron Ore' },
        { itemId: 23425, quantity: 1, label: 'Adamantite Ore' },
      ],
      derivatives: [
        {
          itemId: 23440,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Living Ruby
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'TBC Ores', target: 'Living Ruby' },
      description: 'TBC Ores → Living Ruby (i:23436) [rare gem]',
      reagents: [
        { itemId: 23424, quantity: 1, label: 'Fel Iron Ore' },
        { itemId: 23425, quantity: 1, label: 'Adamantite Ore' },
      ],
      derivatives: [
        {
          itemId: 23436,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Nightseye
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'TBC Ores', target: 'Nightseye' },
      description: 'TBC Ores → Nightseye (i:23441) [rare gem]',
      reagents: [
        { itemId: 23424, quantity: 1, label: 'Fel Iron Ore' },
        { itemId: 23425, quantity: 1, label: 'Adamantite Ore' },
      ],
      derivatives: [
        {
          itemId: 23441,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Noble Topaz
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'TBC Ores', target: 'Noble Topaz' },
      description: 'TBC Ores → Noble Topaz (i:23439) [rare gem]',
      reagents: [
        { itemId: 23424, quantity: 1, label: 'Fel Iron Ore' },
        { itemId: 23425, quantity: 1, label: 'Adamantite Ore' },
      ],
      derivatives: [
        {
          itemId: 23439,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Star of Elune
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'TBC Ores', target: 'Star of Elune' },
      description: 'TBC Ores → Star of Elune (i:23438) [rare gem]',
      reagents: [
        { itemId: 23424, quantity: 1, label: 'Fel Iron Ore' },
        { itemId: 23425, quantity: 1, label: 'Adamantite Ore' },
      ],
      derivatives: [
        {
          itemId: 23438,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Talasite
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'TBC Ores', target: 'Talasite' },
      description: 'TBC Ores → Talasite (i:23437) [rare gem]',
      reagents: [
        { itemId: 23424, quantity: 1, label: 'Fel Iron Ore' },
        { itemId: 23425, quantity: 1, label: 'Adamantite Ore' },
      ],
      derivatives: [
        {
          itemId: 23437,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // WRATH OF LICH KING - Rare Gems
    // ========================================================================
    // Autumn's Glow
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'WotLK Ores', target: "Autumn's Glow" },
      description: "WotLK Ores → Autumn's Glow (i:36921) [rare gem]",
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [
        {
          itemId: 36921,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Forest Emerald
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'WotLK Ores', target: 'Forest Emerald' },
      description: 'WotLK Ores → Forest Emerald (i:36933) [rare gem]',
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [
        {
          itemId: 36933,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Monarch Topaz
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'WotLK Ores', target: 'Monarch Topaz' },
      description: 'WotLK Ores → Monarch Topaz (i:36930) [rare gem]',
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [
        {
          itemId: 36930,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Scarlet Ruby
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'WotLK Ores', target: 'Scarlet Ruby' },
      description: 'WotLK Ores → Scarlet Ruby (i:36918) [rare gem]',
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [
        {
          itemId: 36918,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Sky Sapphire
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'WotLK Ores', target: 'Sky Sapphire' },
      description: 'WotLK Ores → Sky Sapphire (i:36924) [rare gem]',
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [
        {
          itemId: 36924,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Twilight Opal
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'WotLK Ores', target: 'Twilight Opal' },
      description: 'WotLK Ores → Twilight Opal (i:36927) [rare gem]',
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [
        {
          itemId: 36927,
          quantity: 0.015,
          matRate: 0.5,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // WotLK Epic Gems
    // Cardinal Ruby
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Titanium Ore', target: 'Cardinal Ruby' },
      description: 'Titanium Ore (i:36910) → Cardinal Ruby (i:36919) [epic gem]',
      reagents: [{ itemId: 36910, quantity: 1, label: 'Titanium Ore' }],
      derivatives: [
        {
          itemId: 36919,
          quantity: 0.03,
          matRate: 0.55,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Dreadstone (Epic)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Titanium Ore', target: 'Dreadstone' },
      description: 'Titanium Ore (i:36910) → Dreadstone (i:36928) [epic gem]',
      reagents: [{ itemId: 36910, quantity: 1, label: 'Titanium Ore' }],
      derivatives: [
        {
          itemId: 36928,
          quantity: 0.03,
          matRate: 0.55,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },
    // Eye of Zul (Epic)
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Titanium Ore', target: 'Eye of Zul' },
      description: 'Titanium Ore (i:36910) → Eye of Zul (i:36934) [epic gem]',
      reagents: [{ itemId: 36910, quantity: 1, label: 'Titanium Ore' }],
      derivatives: [
        {
          itemId: 36934,
          quantity: 0.03,
          matRate: 0.55,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 5,
        },
      ],
    },

    // ========================================================================
    // CATACLYSM - Rare Gems
    // ========================================================================
    // Dream Emerald
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Cata Ores', target: 'Dream Emerald' },
      description: 'Cata Ores → Dream Emerald (i:52192) [rare gem]',
      reagents: [
        { itemId: 53038, quantity: 1, label: 'Obsidium Ore' },
        { itemId: 52185, quantity: 1, label: 'Elementium Ore' },
        { itemId: 52183, quantity: 1, label: 'Pyrite Ore' },
      ],
      derivatives: [
        {
          itemId: 52192,
          quantity: 0.0125,
          matRate: 0.48,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Inferno Ruby
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Cata Ores', target: 'Inferno Ruby' },
      description: 'Cata Ores → Inferno Ruby (i:52190) [rare gem]',
      reagents: [
        { itemId: 53038, quantity: 1, label: 'Obsidium Ore' },
        { itemId: 52185, quantity: 1, label: 'Elementium Ore' },
        { itemId: 52183, quantity: 1, label: 'Pyrite Ore' },
      ],
      derivatives: [
        {
          itemId: 52190,
          quantity: 0.0125,
          matRate: 0.48,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Ocean Sapphire
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Cata Ores', target: 'Ocean Sapphire' },
      description: 'Cata Ores → Ocean Sapphire (i:52191) [rare gem]',
      reagents: [
        { itemId: 53038, quantity: 1, label: 'Obsidium Ore' },
        { itemId: 52185, quantity: 1, label: 'Elementium Ore' },
        { itemId: 52183, quantity: 1, label: 'Pyrite Ore' },
      ],
      derivatives: [
        {
          itemId: 52191,
          quantity: 0.0125,
          matRate: 0.48,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // MISTS OF PANDARIA - Rare Gems
    // ========================================================================
    // Primordial Ruby
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'MoP Ores', target: 'Primordial Ruby' },
      description: 'MoP Ores → Primordial Ruby (i:76131) [rare gem]',
      reagents: [
        { itemId: 72092, quantity: 1, label: 'Ghost Iron Ore' },
        { itemId: 72093, quantity: 1, label: 'Kyparite' },
        { itemId: 72103, quantity: 1, label: 'White Trillium Ore' },
        { itemId: 72094, quantity: 1, label: 'Black Trillium Ore' },
      ],
      derivatives: [
        {
          itemId: 76131,
          quantity: 0.045,
          matRate: 0.55,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },
    // Wild Jade
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'MoP Ores', target: 'Wild Jade' },
      description: 'MoP Ores → Wild Jade (i:76139) [rare gem]',
      reagents: [
        { itemId: 72092, quantity: 1, label: 'Ghost Iron Ore' },
        { itemId: 72093, quantity: 1, label: 'Kyparite' },
        { itemId: 72103, quantity: 1, label: 'White Trillium Ore' },
        { itemId: 72094, quantity: 1, label: 'Black Trillium Ore' },
      ],
      derivatives: [
        {
          itemId: 76139,
          quantity: 0.045,
          matRate: 0.55,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 4,
        },
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Ore Conversions with Quality Tiers (Common Gems)
    // ========================================================================
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Copper Ore (DF)', target: 'Vibrant Shards *' },
      description: 'Copper Ore (i:2770) → Vibrant Shards * (i:206448) [5 → 0.8]',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        {
          itemId: 206448,
          quantity: 0.8,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Vibrant Shard *
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 1,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Tin Ore (DF)', target: 'Vibrant Shards *' },
      description: 'Tin Ore (i:3575) → Vibrant Shards * (i:206448) [5 → 0.8]',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        {
          itemId: 206448,
          quantity: 0.8,
          matRate: 0.75,
          minAmount: 0,
          maxAmount: 1,
          itemQuality: 2,
        }, // Vibrant Shard *
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Hochenblume (DF)', target: 'Vibrant Shards **' },
      description: 'Hochenblume (i:191460) → Vibrant Shards ** (i:206449) [5 → 1.2]',
      reagents: [{ itemId: 191460, quantity: 5 }],
      derivatives: [
        {
          itemId: 206449,
          quantity: 1.2,
          matRate: 0.8,
          minAmount: 1,
          maxAmount: 1,
          itemQuality: 2,
        }, // Vibrant Shard **
      ],
    },
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Rousing Fire (DF)', target: 'Vibrant Shards ***' },
      description: 'Rousing Fire (i:191451) → Vibrant Shards *** (i:206450) [5 → 1.8]',
      reagents: [{ itemId: 191451, quantity: 5 }],
      derivatives: [
        {
          itemId: 206450,
          quantity: 1.8,
          matRate: 0.82,
          minAmount: 1,
          maxAmount: 2,
          itemQuality: 2,
        }, // Vibrant Shard ***
      ],
    },
  ],
};
