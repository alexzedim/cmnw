/**
 * PROSPECTING CONVERSIONS - Ore to Gems & Shards
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

import { DMA_SOURCE, EXPANSION_TICKER, PROFESSION_TICKER } from '@app/resources/constants';

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
        { itemId: 774, quantity: 0.5 },     // Malachite
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
        { itemId: 818, quantity: 0.5 },     // Tigerseye
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
        { itemId: 1206, quantity: 0.36 },    // Moss Agate
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
        { itemId: 1210, quantity: 0.36 },    // Shadowgem
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
        { itemId: 1210, quantity: 0.1 },    // Shadowgem
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
        { itemId: 1705, quantity: 0.36 },    // Lesser Moonstone
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
        { itemId: 1705, quantity: 0.33 },    // Lesser Moonstone
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
        { itemId: 1529, quantity: 0.33 },    // Jade
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
        { itemId: 1529, quantity: 0.0325 },    // Jade
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
        { itemId: 3864, quantity: 0.33 },    // Citrine
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
        { itemId: 3862, quantity: 0.8 },    // Citrine
        { itemId: 1529, quantity: 0.4 },    // Ruby
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
        { itemId: 7909, quantity: 0.8 },    // Emerald
        { itemId: 1707, quantity: 0.4 },    // Sapphire
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
      description: 'Thorium Ore (i:3859) → Diamond (i:12361), Azerothian Diamond (i:12800)',
      reagents: [{ itemId: 3859, quantity: 5 }],
      derivatives: [
        { itemId: 12361, quantity: 0.8 },   // Diamond
        { itemId: 12800, quantity: 0.4 },   // Azerothian Diamond
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
        { itemId: 21929, quantity: 1.2 },   // Prismatic Shard
      ],
    },
    {
      expansion: EXPANSION_TICKER.TBC,
      rank: 2,
      profession: PROF_JC,
      createdBy: DMA_SOURCE.TSM,
      updatedBy: DMA_SOURCE.TSM,
      ticker: PROF_JC,
      names: { source: 'Adamantite Ore', target: 'Prismatic Shards & High Gems' },
      description: 'Adamantite Ore (i:23426) → Prismatic Shards & High Quality Gems',
      reagents: [{ itemId: 23426, quantity: 5 }],
      derivatives: [
        { itemId: 21929, quantity: 1.5 },   // Prismatic Shard
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
        { itemId: 36860, quantity: 0.5 },   // Eternal Fire
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
        { itemId: 36859, quantity: 0.6 },   // Eternal Earth
        { itemId: 36860, quantity: 0.4 },   // Eternal Fire
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
      description: 'Obsidium Ore (i:53038) → Hessonite (i:52256), Jasper (i:52183)',
      reagents: [{ itemId: 53038, quantity: 5 }],
      derivatives: [
        { itemId: 52256, quantity: 1.0 },   // Hessonite
        { itemId: 52183, quantity: 0.6 },   // Jasper
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
      description: 'Elementium Ore (i:52185) → Amberjewel (i:52198), Alicite (i:52255)',
      reagents: [{ itemId: 52185, quantity: 5 }],
      derivatives: [
        { itemId: 52198, quantity: 1.0 },   // Amberjewel
        { itemId: 52255, quantity: 0.6 },   // Alicite
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
        { itemId: 76133, quantity: 0.8 },   // Vermillion Sapphire
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
        { itemId: 76137, quantity: 0.8 },   // Sunstone
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
        { itemId: 76130, quantity: 0.8 },   // Primordial Ruby
        { itemId: 52180, quantity: 0.2 },   // Prismatic Shard
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
        { itemId: 109126, quantity: 0.45 },  // Polished Draenite
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
        { itemId: 130250, quantity: 0.5 },   // Gem Fragment
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
        { itemId: 130250, quantity: 0.6 },   // Gem Fragment
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
        { itemId: 152512, quantity: 0.8 },   // Gem Fragment
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
        { itemId: 152512, quantity: 0.8 },   // Gem Fragment
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
        { itemId: 152512, quantity: 1.2 },   // Gem Fragment
        { itemId: 154123, quantity: 0.1 },   // Shard
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
      description: 'Storm Silver Ore (i:152580) → Rare Gems & High-Yield Shards',
      reagents: [{ itemId: 152580, quantity: 5 }],
      derivatives: [
        { itemId: 152512, quantity: 1.2 },   // Gem Fragment
        { itemId: 154123, quantity: 0.2 },   // Shard
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
        { itemId: 177045, quantity: 0.8 },   // Shard
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
        { itemId: 177045, quantity: 0.8 },   // Shard
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
        { itemId: 177045, quantity: 1.5 },   // Vibrant Shard
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Ore Conversions with Quality Tiers
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
        { itemId: 206448, quantity: 0.8 },   // Vibrant Shard *
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
        { itemId: 206448, quantity: 0.8 },   // Vibrant Shard *
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
        { itemId: 206449, quantity: 1.2 },   // Vibrant Shard **
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
        { itemId: 206450, quantity: 1.8 },   // Vibrant Shard ***
      ],
    },
  ],
};




