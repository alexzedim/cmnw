/**
 * PROSPECTING CONVERSIONS - Ore to Gems & Shards
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

import {
  DMA_SOURCE,
  EXPANSION_TICKER,
  PROFESSION_TICKER,
} from '@app/resources/constants';

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
        { itemId: 774, quantity: 0.5 }, // Malachite
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
        { itemId: 818, quantity: 0.5 }, // Tigerseye
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
        { itemId: 1206, quantity: 0.36 }, // Moss Agate
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
        { itemId: 1210, quantity: 0.36 }, // Shadowgem
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
        { itemId: 1210, quantity: 0.1 }, // Shadowgem
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
        { itemId: 1705, quantity: 0.36 }, // Lesser Moonstone
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
        { itemId: 1705, quantity: 0.33 }, // Lesser Moonstone
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
        { itemId: 1529, quantity: 0.33 }, // Jade
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
        { itemId: 1529, quantity: 0.0325 }, // Jade
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
        { itemId: 3864, quantity: 0.33 }, // Citrine
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Gold Ore', target: 'Citrine & Ruby' },
      description: 'Gold Ore (i:2772) → Citrine (i:3862), Ruby (i:1529)',
      reagents: [{ itemId: 2772, quantity: 5 }],
      derivatives: [
        { itemId: 3862, quantity: 0.8 }, // Citrine
        { itemId: 1529, quantity: 0.4 }, // Ruby
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
      names: { source: 'Mithril Ore', target: 'Emerald & Sapphire' },
      description: 'Mithril Ore (i:3858) → Emerald (i:7909), Sapphire (i:1707)',
      reagents: [{ itemId: 3858, quantity: 5 }],
      derivatives: [
        { itemId: 7909, quantity: 0.8 }, // Emerald
        { itemId: 1707, quantity: 0.4 }, // Sapphire
      ],
    },
    {
      expansion: EXPANSION_TICKER.CLSC,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Thorium Ore', target: 'Diamond & Azerothian Diamond' },
      description:
        'Thorium Ore (i:3859) → Diamond (i:12361), Azerothian Diamond (i:12800)',
      reagents: [{ itemId: 3859, quantity: 5 }],
      derivatives: [
        { itemId: 12361, quantity: 0.8 }, // Diamond
        { itemId: 12800, quantity: 0.4 }, // Azerothian Diamond
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
        { itemId: 21929, quantity: 1.2 }, // Prismatic Shard
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
      description:
        'Adamantite Ore (i:23426) → Prismatic Shards & High Quality Gems',
      reagents: [{ itemId: 23426, quantity: 5 }],
      derivatives: [
        { itemId: 21929, quantity: 1.5 }, // Prismatic Shard
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
        { itemId: 36860, quantity: 0.5 }, // Eternal Fire
      ],
    },
    {
      expansion: EXPANSION_TICKER.WOTLK,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Saronite Ore', target: 'Eternal Earth & Fire' },
      description: 'Saronite Ore (i:36911) → Eternal Earth & Fire',
      reagents: [{ itemId: 36911, quantity: 5 }],
      derivatives: [
        { itemId: 36859, quantity: 0.6 }, // Eternal Earth
        { itemId: 36860, quantity: 0.4 }, // Eternal Fire
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
      names: { source: 'Obsidium Ore', target: 'Hessonite & Jasper' },
      description:
        'Obsidium Ore (i:53038) → Hessonite (i:52256), Jasper (i:52183)',
      reagents: [{ itemId: 53038, quantity: 5 }],
      derivatives: [
        { itemId: 52256, quantity: 1.0 }, // Hessonite
        { itemId: 52183, quantity: 0.6 }, // Jasper
      ],
    },
    {
      expansion: EXPANSION_TICKER.CATA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Elementium Ore', target: 'Amberjewel & Alicite' },
      description:
        'Elementium Ore (i:52185) → Amberjewel (i:52198), Alicite (i:52255)',
      reagents: [{ itemId: 52185, quantity: 5 }],
      derivatives: [
        { itemId: 52198, quantity: 1.0 }, // Amberjewel
        { itemId: 52255, quantity: 0.6 }, // Alicite
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
        { itemId: 76133, quantity: 0.8 }, // Vermillion Sapphire
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
        { itemId: 76137, quantity: 0.8 }, // Sunstone
      ],
    },
    {
      expansion: EXPANSION_TICKER.MOP,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Kyparite', target: 'Rare Gems' },
      description: 'Kyparite (i:72092) → Rare Gems & Prismatic Shards',
      reagents: [{ itemId: 72092, quantity: 5 }],
      derivatives: [
        { itemId: 76130, quantity: 0.8 }, // Primordial Ruby
        { itemId: 52180, quantity: 0.2 }, // Prismatic Shard
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
        { itemId: 109126, quantity: 0.45 }, // Polished Draenite
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
        { itemId: 130250, quantity: 0.5 }, // Gem Fragment
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
        { itemId: 130250, quantity: 0.6 }, // Gem Fragment
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
        { itemId: 152512, quantity: 0.8 }, // Gem Fragment
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
        { itemId: 152512, quantity: 0.8 }, // Gem Fragment
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Monelite Ore', target: 'Rare Gems' },
      description: 'Monelite Ore (i:152579) → Rare Gems & Shards',
      reagents: [{ itemId: 152579, quantity: 5 }],
      derivatives: [
        { itemId: 152512, quantity: 1.2 }, // Gem Fragment
        { itemId: 154123, quantity: 0.1 }, // Shard
      ],
    },
    {
      expansion: EXPANSION_TICKER.BFA,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Storm Silver Ore', target: 'Rare Gems & Shards' },
      description:
        'Storm Silver Ore (i:152580) → Rare Gems & High-Yield Shards',
      reagents: [{ itemId: 152580, quantity: 5 }],
      derivatives: [
        { itemId: 152512, quantity: 1.2 }, // Gem Fragment
        { itemId: 154123, quantity: 0.2 }, // Shard
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
        { itemId: 177045, quantity: 0.8 }, // Shard
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
        { itemId: 177045, quantity: 0.8 }, // Shard
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
      description:
        'Oxxein Ore (i:171833) → Vibrant Shards (i:177045) & Gems [5 → 1.5 + gems]',
      reagents: [{ itemId: 171833, quantity: 5 }],
      derivatives: [
        { itemId: 177045, quantity: 1.5 }, // Vibrant Shard
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
      names: { source: 'Various Ores', target: 'Queen\'s Ruby *' },
      description: 'Dragonflight Ores → Queen\'s Ruby * (i:192837) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192837, quantity: 0.125 }],
    },
    // Queen's Ruby **
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Queen\'s Ruby **' },
      description: 'Dragonflight Ores → Queen\'s Ruby ** (i:192838) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192838, quantity: 0.125 }],
    },
    // Queen's Ruby ***
    {
      expansion: EXPANSION_TICKER.DF,
      rank: 3,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Various Ores', target: 'Queen\'s Ruby ***' },
      description: 'Dragonflight Ores → Queen\'s Ruby *** (i:192839) [rare gem]',
      reagents: [
        { itemId: 190395, quantity: 1, label: 'Serevite Ore *' },
        { itemId: 190396, quantity: 1, label: 'Serevite Ore **' },
        { itemId: 190394, quantity: 1, label: 'Serevite Ore ***' },
        { itemId: 189143, quantity: 1, label: 'Draconium Ore *' },
        { itemId: 188658, quantity: 1, label: 'Draconium Ore **' },
        { itemId: 190311, quantity: 1, label: 'Draconium Ore ***' },
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192839, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192840, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192841, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192842, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192843, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192844, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192845, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192846, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192847, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192848, quantity: 0.125 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192849, quantity: 0.35 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192850, quantity: 0.35 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192851, quantity: 0.35 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192852, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192853, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192855, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192856, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192857, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192858, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192859, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192860, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192861, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192862, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192863, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192865, quantity: 0.0425 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192866, quantity: 0.15 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192867, quantity: 0.15 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192868, quantity: 0.15 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192869, quantity: 0.0055 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192870, quantity: 0.0055 }],
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
        { itemId: 190312, quantity: 1, label: 'Khaz\'gorite Ore *' },
        { itemId: 190313, quantity: 1, label: 'Khaz\'gorite Ore **' },
        { itemId: 190314, quantity: 1, label: 'Khaz\'gorite Ore ***' },
        { itemId: 194545, quantity: 1, label: 'Prismatic Ore' },
        { itemId: 199344, quantity: 1, label: 'Magma Thresher' },
      ],
      derivatives: [{ itemId: 192871, quantity: 0.0055 }],
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
      derivatives: [{ itemId: 173170, quantity: 0.2 }],
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
      derivatives: [{ itemId: 173171, quantity: 0.2 }],
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
      derivatives: [{ itemId: 173172, quantity: 0.2 }],
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
      derivatives: [{ itemId: 173173, quantity: 0.2 }],
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
      derivatives: [{ itemId: 23440, quantity: 0.015 }],
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
      derivatives: [{ itemId: 23436, quantity: 0.015 }],
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
      derivatives: [{ itemId: 23441, quantity: 0.015 }],
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
      derivatives: [{ itemId: 23439, quantity: 0.015 }],
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
      derivatives: [{ itemId: 23438, quantity: 0.015 }],
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
      derivatives: [{ itemId: 23437, quantity: 0.015 }],
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
      names: { source: 'WotLK Ores', target: 'Autumn\'s Glow' },
      description: 'WotLK Ores → Autumn\'s Glow (i:36921) [rare gem]',
      reagents: [
        { itemId: 36909, quantity: 1, label: 'Cobalt Ore' },
        { itemId: 36912, quantity: 1, label: 'Saronite Ore' },
        { itemId: 36910, quantity: 1, label: 'Titanium Ore' },
      ],
      derivatives: [{ itemId: 36921, quantity: 0.015 }],
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
      derivatives: [{ itemId: 36933, quantity: 0.015 }],
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
      derivatives: [{ itemId: 36930, quantity: 0.015 }],
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
      derivatives: [{ itemId: 36918, quantity: 0.015 }],
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
      derivatives: [{ itemId: 36924, quantity: 0.015 }],
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
      derivatives: [{ itemId: 36927, quantity: 0.015 }],
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
      derivatives: [{ itemId: 36919, quantity: 0.030 }],
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
      derivatives: [{ itemId: 36928, quantity: 0.030 }],
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
      derivatives: [{ itemId: 36934, quantity: 0.030 }],
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
      derivatives: [{ itemId: 52192, quantity: 0.0125 }],
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
      derivatives: [{ itemId: 52190, quantity: 0.0125 }],
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
      derivatives: [{ itemId: 52191, quantity: 0.0125 }],
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
      derivatives: [{ itemId: 76131, quantity: 0.045 }],
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
      derivatives: [{ itemId: 76139, quantity: 0.045 }],
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
      description:
        'Copper Ore (i:2770) → Vibrant Shards * (i:206448) [5 → 0.8]',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        { itemId: 206448, quantity: 0.8 }, // Vibrant Shard *
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
        { itemId: 206448, quantity: 0.8 }, // Vibrant Shard *
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
      description:
        'Hochenblume (i:191460) → Vibrant Shards ** (i:206449) [5 → 1.2]',
      reagents: [{ itemId: 191460, quantity: 5 }],
      derivatives: [
        { itemId: 206449, quantity: 1.2 }, // Vibrant Shard **
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
      description:
        'Rousing Fire (i:191451) → Vibrant Shards *** (i:206450) [5 → 1.8]',
      reagents: [{ itemId: 191451, quantity: 5 }],
      derivatives: [
        { itemId: 206450, quantity: 1.8 }, // Vibrant Shard ***
      ],
    },
  ],
};
