/**
 * DISENCHANTING CONVERSIONS - Gear to Enchanting Materials
 * Data sourced from TradeSkillMaster Retail Disenchant.lua
 * Items are disenchanted based on item class, quality, and item level
 */

import {
  DMA_SOURCE,
  EXPANSION_TICKER,
  PROFESSION_TICKER,
} from '@app/resources/constants';

const PROF_ENCH = PROFESSION_TICKER.ENCH;

export const DISENCHANTING = {
  name: PROF_ENCH,
  profession: 'Enchanting',
  media:
    'https://render-eu.worldofwarcraft.com/icons/56/spell_holy_sealblessingoflight.jpg',
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
      derivatives: [{ itemId: 10940, quantity: 1.22 }],
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
      description:
        'Disenchant level 16-24 gear → Light Illusion Dust (i:16204)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 16-24 Gear' }],
      derivatives: [{ itemId: 16204, quantity: 1.08 }],
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
      description:
        'Disenchant level 20+ rare/legendary gear → Rich Illusion Dust (i:156930)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Level 20+ Rare/Legendary Gear' },
      ],
      derivatives: [{ itemId: 156930, quantity: 0.73 }],
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
      derivatives: [{ itemId: 22445, quantity: 1.79 }],
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
      derivatives: [{ itemId: 34054, quantity: 2.33 }],
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
      derivatives: [{ itemId: 52555, quantity: 1.86 }],
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
      derivatives: [{ itemId: 74249, quantity: 2.58 }],
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
      derivatives: [{ itemId: 109693, quantity: 2.82 }],
    },
    // Arkhana (Legion - Expansion 6)
    {
      expansion: EXPANSION_TICKER.LEGION,
      rank: 9,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Legion Level Armor/Weapon', target: 'Arkhana' },
      description: 'Disenchant Legion level gear → Arkhana (i:124440)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Legion Level Gear' }],
      derivatives: [{ itemId: 124440, quantity: 4.75 }],
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
      derivatives: [{ itemId: 152875, quantity: 4.36 }],
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
      derivatives: [{ itemId: 172230, quantity: 2.17 }],
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
      description:
        'Disenchant Dragonflight level gear → Chromatic Dust (i:194123)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Dragonflight Level Gear' }],
      derivatives: [{ itemId: 194123, quantity: 1.38 }],
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
      description:
        'Disenchant low level weapons → Lesser Magic Essence (i:10938)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Low Level Weapons' }],
      derivatives: [{ itemId: 10938, quantity: 0.98 }],
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
      description:
        'Disenchant mid-level weapons → Greater Magic Essence (i:10939)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Mid-Level Weapons' }],
      derivatives: [{ itemId: 10939, quantity: 1.11 }],
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
      description:
        'Disenchant level 16-24 weapons → Lesser Eternal Essence (i:16202)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 16-24 Weapons' }],
      derivatives: [{ itemId: 16202, quantity: 1.05 }],
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
      description:
        'Disenchant level 25+ weapons/rare items → Greater Eternal Essence (i:16203)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Level 25+ Weapons/Rare Items' },
      ],
      derivatives: [{ itemId: 16203, quantity: 0.91 }],
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
      description:
        'Disenchant TBC low-level gear → Lesser Planar Essence (i:22447)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Low-Level Gear' }],
      derivatives: [{ itemId: 22447, quantity: 1.0 }],
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
      description:
        'Disenchant TBC mid-level+ gear → Greater Planar Essence (i:22446)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Mid-Level+ Gear' }],
      derivatives: [{ itemId: 22446, quantity: 0.76 }],
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
      description:
        'Disenchant WotLK low-level gear → Lesser Cosmic Essence (i:34056)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Low-Level Gear' }],
      derivatives: [{ itemId: 34056, quantity: 0.98 }],
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
      description:
        'Disenchant WotLK mid-level+ gear → Greater Cosmic Essence (i:34055)',
      reagents: [{ itemId: 0, quantity: 1, label: 'WotLK Mid-Level+ Gear' }],
      derivatives: [{ itemId: 34055, quantity: 0.76 }],
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
      description:
        'Disenchant Cataclysm low-level gear → Lesser Celestial Essence (i:52718)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Low-Level Gear' }],
      derivatives: [{ itemId: 52718, quantity: 0.88 }],
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
      description:
        'Disenchant Cataclysm mid-level+ gear → Greater Celestial Essence (i:52719)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Cataclysm Mid-Level+ Gear' },
      ],
      derivatives: [{ itemId: 52719, quantity: 1.21 }],
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
      description:
        'Disenchant Pandaria level gear → Mysterious Essence (i:74250)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Pandaria Level Gear' }],
      derivatives: [{ itemId: 74250, quantity: 0.24 }],
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
      description:
        'Disenchant level 16-24 rare items → Small Brilliant Shard (i:14343)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Level 16-24 Rare Items' }],
      derivatives: [{ itemId: 14343, quantity: 0.74 }],
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
      description:
        'Disenchant level 25+ rare/legendary items → Large Brilliant Shard (i:14344)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Level 25+ Rare/Legendary Items' },
      ],
      derivatives: [{ itemId: 14344, quantity: 1.49 }],
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
      description:
        'Disenchant TBC low-level rare items → Small Prismatic Shard (i:22448)',
      reagents: [{ itemId: 0, quantity: 1, label: 'TBC Low-Level Rare Items' }],
      derivatives: [{ itemId: 22448, quantity: 0.55 }],
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
      description:
        'Disenchant TBC mid-level+ rare items → Large Prismatic Shard (i:22449)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'TBC Mid-Level+ Rare Items' },
      ],
      derivatives: [{ itemId: 22449, quantity: 0.55 }],
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
      description:
        'Disenchant WotLK low-level rare items → Small Dream Shard (i:34053)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'WotLK Low-Level Rare Items' },
      ],
      derivatives: [{ itemId: 34053, quantity: 0.55 }],
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
      description:
        'Disenchant WotLK mid-level+ rare items → Dream Shard (i:34052)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'WotLK Mid-Level+ Rare Items' },
      ],
      derivatives: [{ itemId: 34052, quantity: 0.54 }],
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
      description:
        'Disenchant Cataclysm low-level rare items → Small Heavenly Shard (i:52720)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Cataclysm Low-Level Rare Items' },
      ],
      derivatives: [{ itemId: 52720, quantity: 1.03 }],
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
      description:
        'Disenchant Cataclysm mid-level+ rare items → Heavenly Shard (i:52721)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Cataclysm Mid-Level+ Rare Items' },
      ],
      derivatives: [{ itemId: 52721, quantity: 1.0 }],
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
      description:
        'Disenchant Pandaria low-level rare items → Small Ethereal Shard (i:74252)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Pandaria Low-Level Rare Items' },
      ],
      derivatives: [{ itemId: 74252, quantity: 0.57 }],
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
      description:
        'Disenchant Pandaria mid-level+ rare items → Ethereal Shard (i:74247)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Pandaria Mid-Level+ Rare Items' },
      ],
      derivatives: [{ itemId: 74247, quantity: 0.57 }],
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
      description:
        'Disenchant Draenor rare items → Small Luminous Shard (i:115502)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Rare Items' }],
      derivatives: [{ itemId: 115502, quantity: 0.22 }],
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
      derivatives: [{ itemId: 111245, quantity: 0.11 }],
    },
    // Leylight Shard (Legion)
    {
      expansion: EXPANSION_TICKER.LEGION,
      rank: 13,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Legion Rare Items', target: 'Leylight Shard' },
      description: 'Disenchant Legion rare items → Leylight Shard (i:124441)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Legion Rare Items' }],
      derivatives: [{ itemId: 124441, quantity: 1.0 }],
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
      derivatives: [{ itemId: 152876, quantity: 1.13 }],
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
      description:
        'Disenchant Shadowlands rare items → Sacred Shard (i:172231)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Shadowlands Rare Items' }],
      derivatives: [{ itemId: 172231, quantity: 1.09 }],
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
      description:
        'Disenchant Dragonflight rare items → Vibrant Shard (i:194124)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Dragonflight Rare Items' }],
      derivatives: [{ itemId: 194124, quantity: 0.65 }],
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
      derivatives: [{ itemId: 22450, quantity: 1.27 }],
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
      derivatives: [{ itemId: 34057, quantity: 1.0 }],
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
      description:
        'Disenchant Cataclysm epic items → Maelstrom Crystal (i:52722)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Cataclysm Epic Items' }],
      derivatives: [{ itemId: 52722, quantity: 1.0 }],
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
      derivatives: [{ itemId: 74248, quantity: 1.0 }],
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
      description:
        'Disenchant Draenor rare enchanting items → Fractured Temporal Crystal (i:115504)',
      reagents: [
        { itemId: 0, quantity: 1, label: 'Draenor Rare Enchanting Items' },
      ],
      derivatives: [{ itemId: 115504, quantity: 0.38 }],
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
      description:
        'Disenchant Draenor epic items → Temporal Crystal (i:113588)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Draenor Epic Items' }],
      derivatives: [{ itemId: 113588, quantity: 0.43 }],
    },
    // Chaos Crystal (Legion)
    {
      expansion: EXPANSION_TICKER.LEGION,
      rank: 23,
      profession: PROF_ENCH,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_ENCH,
      names: { source: 'Legion Epic Items', target: 'Chaos Crystal' },
      description: 'Disenchant Legion epic items → Chaos Crystal (i:124442)',
      reagents: [{ itemId: 0, quantity: 1, label: 'Legion Epic Items' }],
      derivatives: [{ itemId: 124442, quantity: 1.0 }],
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
      derivatives: [{ itemId: 152877, quantity: 1.0 }],
    },
  ],
};
