/**
 * PROSPECTING CONVERSIONS - Ore to Gems & Shards
 * Extracted from TradeSkillMaster with comprehensive metadata
 */

export const PROSPECTING = {
  name: 'JC',
  profession: 'Jewelcrafting',
  media: 'https://render-eu.worldofwarcraft.com/icons/56/inv_pick_stone.jpg',
  spellId: 25098,
  methods: [
    // ========================================================================
    // CLASSIC ERA - Copper & Tin Ore
    // ========================================================================
    {
      expansion: 'CLSC',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Copper Ore', target: 'Malachite & Tigerseye' },
      description: 'Prospect Copper Ore for Malachite and Tigerseye gems (100% success rate)',
      venue: 'Copper Ore (i:2770) → Malachite (i:818), Tigerseye (i:774)',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        { itemId: 818, quantity: 0.8 },     // Malachite
        { itemId: 774, quantity: 0.4 },     // Tigerseye
      ],
    },
    {
      expansion: 'CLSC',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Tin Ore', target: 'Azurite & Moss Agate' },
      description: 'Prospect Tin Ore for Azurite and Moss Agate gems (100% success rate)',
      venue: 'Tin Ore (i:3575) → Azurite (i:1210), Moss Agate (i:1206)',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        { itemId: 1210, quantity: 0.8 },    // Azurite
        { itemId: 1206, quantity: 0.4 },    // Moss Agate
      ],
    },

    // ========================================================================
    // CLASSIC ERA - Iron & Gold Ore
    // ========================================================================
    {
      expansion: 'CLSC',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Iron Ore', target: 'Jade & Aquamarine' },
      description: 'Prospect Iron Ore for Jade and Aquamarine gems (100% success rate)',
      venue: 'Iron Ore (i:2771) → Jade (i:1705), Aquamarine (i:3864)',
      reagents: [{ itemId: 2771, quantity: 5 }],
      derivatives: [
        { itemId: 1705, quantity: 0.8 },    // Jade
        { itemId: 3864, quantity: 0.4 },    // Aquamarine
      ],
    },
    {
      expansion: 'CLSC',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Gold Ore', target: 'Citrine & Ruby' },
      description: 'Prospect Gold Ore for Citrine and Ruby gems (100% success rate)',
      venue: 'Gold Ore (i:2772) → Citrine (i:3862), Ruby (i:1529)',
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
      expansion: 'CLSC',
      rank: 3,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Mithril Ore', target: 'Emerald & Sapphire' },
      description: 'Prospect Mithril Ore for Emerald and Sapphire gems (100% success rate)',
      venue: 'Mithril Ore (i:3858) → Emerald (i:7909), Sapphire (i:1707)',
      reagents: [{ itemId: 3858, quantity: 5 }],
      derivatives: [
        { itemId: 7909, quantity: 0.8 },    // Emerald
        { itemId: 1707, quantity: 0.4 },    // Sapphire
      ],
    },
    {
      expansion: 'CLSC',
      rank: 3,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Thorium Ore', target: 'Diamond & Azerothian Diamond' },
      description: 'Prospect Thorium Ore for Diamond and Azerothian Diamond gems (100% success rate)',
      venue: 'Thorium Ore (i:3859) → Diamond (i:12361), Azerothian Diamond (i:12800)',
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
      expansion: 'TBC',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Fel Iron Ore', target: 'Prismatic Shards' },
      description: 'Prospect Fel Iron Ore for Prismatic Shards and other gems (100% success rate)',
      venue: 'Fel Iron Ore (i:23425) → Prismatic Shards & Gems',
      reagents: [{ itemId: 23425, quantity: 5 }],
      derivatives: [
        { itemId: 21929, quantity: 1.2 },   // Prismatic Shard
      ],
    },
    {
      expansion: 'TBC',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Adamantite Ore', target: 'Prismatic Shards & High Gems' },
      description: 'Prospect Adamantite Ore for Prismatic Shards and higher quality gems (100% success rate)',
      venue: 'Adamantite Ore (i:23426) → Prismatic Shards & High Quality Gems',
      reagents: [{ itemId: 23426, quantity: 5 }],
      derivatives: [
        { itemId: 21929, quantity: 1.5 },   // Prismatic Shard
      ],
    },

    // ========================================================================
    // WRATH - Cobalt & Saronite Ore
    // ========================================================================
    {
      expansion: 'WOTLK',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Cobalt Ore', target: 'Eternal Fire & Gems' },
      description: 'Prospect Cobalt Ore for Eternal Fire and various gems (100% success rate)',
      venue: 'Cobalt Ore (i:36910) → Eternal Fire & Gems',
      reagents: [{ itemId: 36910, quantity: 5 }],
      derivatives: [
        { itemId: 36860, quantity: 0.5 },   // Eternal Fire
      ],
    },
    {
      expansion: 'WOTLK',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Saronite Ore', target: 'Eternal Earth & Fire' },
      description: 'Prospect Saronite Ore for Eternal Earth and Fire (100% success rate)',
      venue: 'Saronite Ore (i:36911) → Eternal Earth & Fire',
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
      expansion: 'CATA',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Obsidium Ore', target: 'Hessonite & Jasper' },
      description: 'Prospect Obsidium Ore for Hessonite and Jasper gems (100% success rate, best yield)',
      venue: 'Obsidium Ore (i:53038) → Hessonite (i:52256), Jasper (i:52183)',
      reagents: [{ itemId: 53038, quantity: 5 }],
      derivatives: [
        { itemId: 52256, quantity: 1.0 },   // Hessonite
        { itemId: 52183, quantity: 0.6 },   // Jasper
      ],
    },
    {
      expansion: 'CATA',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Elementium Ore', target: 'Amberjewel & Alicite' },
      description: 'Prospect Elementium Ore for Amberjewel and Alicite gems (100% success rate)',
      venue: 'Elementium Ore (i:52185) → Amberjewel (i:52198), Alicite (i:52255)',
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
      expansion: 'MOP',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Copper Ore (MOP)', target: 'Various Gems' },
      description: 'Prospect Copper Ore for gems and shards (100% success rate)',
      venue: 'Copper Ore (i:2770) → Gems & Shards',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        { itemId: 76133, quantity: 0.8 },   // Vermillion Sapphire
      ],
    },
    {
      expansion: 'MOP',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Tin Ore (MOP)', target: 'Various Gems' },
      description: 'Prospect Tin Ore for gems and shards (100% success rate)',
      venue: 'Tin Ore (i:3575) → Gems & Shards',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        { itemId: 76137, quantity: 0.8 },   // Sunstone
      ],
    },
    {
      expansion: 'MOP',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Kyparite', target: 'Rare Gems' },
      description: 'Prospect Kyparite for rare gems and prismatic shards (100% success rate)',
      venue: 'Kyparite (i:72092) → Rare Gems & Prismatic Shards',
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
      expansion: 'WOD',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Draenor Ore', target: 'Draenite & Other Gems' },
      description: 'Prospect Draenor Ore for Draenite gems (100% success rate, 0.45 average yield)',
      venue: 'Draenor Ore (i:109119) → Draenite Gems',
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
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Felslate Ore', target: 'Various Gems' },
      description: 'Prospect Felslate Ore for gems and essences (100% success rate)',
      venue: 'Felslate Ore (i:123918) → Gems & Essences',
      reagents: [{ itemId: 123918, quantity: 5 }],
      derivatives: [
        { itemId: 130250, quantity: 0.5 },   // Gem Fragment
      ],
    },
    {
      expansion: 'LEGION',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Leystone Ore', target: 'Various Gems' },
      description: 'Prospect Leystone Ore for higher quality gems (100% success rate)',
      venue: 'Leystone Ore (i:123919) → Higher Quality Gems',
      reagents: [{ itemId: 123919, quantity: 5 }],
      derivatives: [
        { itemId: 130250, quantity: 0.6 },   // Gem Fragment
      ],
    },

    // ========================================================================
    // BATTLE FOR AZEROTH - Ore Conversions
    // ========================================================================
    {
      expansion: 'BFA',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Copper Ore (BFA)', target: 'Gems & Shards' },
      description: 'Prospect Copper Ore for gems (100% success rate)',
      venue: 'Copper Ore (i:2770) → Gems',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        { itemId: 152512, quantity: 0.8 },   // Gem Fragment
      ],
    },
    {
      expansion: 'BFA',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Tin Ore (BFA)', target: 'Gems & Shards' },
      description: 'Prospect Tin Ore for gems (100% success rate)',
      venue: 'Tin Ore (i:3575) → Gems',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        { itemId: 152512, quantity: 0.8 },   // Gem Fragment
      ],
    },
    {
      expansion: 'BFA',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Monelite Ore', target: 'Rare Gems' },
      description: 'Prospect Monelite Ore for rare gems and shards (100% success rate, best BFA source)',
      venue: 'Monelite Ore (i:152579) → Rare Gems & Shards',
      reagents: [{ itemId: 152579, quantity: 5 }],
      derivatives: [
        { itemId: 152512, quantity: 1.2 },   // Gem Fragment
        { itemId: 154123, quantity: 0.1 },   // Shard
      ],
    },
    {
      expansion: 'BFA',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Storm Silver Ore', target: 'Rare Gems & Shards' },
      description: 'Prospect Storm Silver Ore for highest quality gems and shards (100% success rate)',
      venue: 'Storm Silver Ore (i:152580) → Rare Gems & High-Yield Shards',
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
      expansion: 'SL',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Copper Ore (SL)', target: 'Shards' },
      description: 'Prospect Copper Ore for shards (100% success rate)',
      venue: 'Copper Ore (i:2770) → Shards',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        { itemId: 177045, quantity: 0.8 },   // Shard
      ],
    },
    {
      expansion: 'SL',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Tin Ore (SL)', target: 'Shards' },
      description: 'Prospect Tin Ore for shards (100% success rate)',
      venue: 'Tin Ore (i:3575) → Shards',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        { itemId: 177045, quantity: 0.8 },   // Shard
      ],
    },
    {
      expansion: 'SL',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Oxxein Ore', target: 'Vibrant Shards & Gems' },
      description: 'Prospect Oxxein Ore for vibrant shards and rare gems (100% success rate, best source)',
      venue: 'Oxxein Ore (i:171833) → Vibrant Shards (i:177045) & Gems [5 → 1.5 + gems]',
      reagents: [{ itemId: 171833, quantity: 5 }],
      derivatives: [
        { itemId: 177045, quantity: 1.5 },   // Vibrant Shard
      ],
    },

    // ========================================================================
    // DRAGONFLIGHT - Ore Conversions with Quality Tiers
    // ========================================================================
    {
      expansion: 'DF',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Copper Ore (DF)', target: 'Vibrant Shards *' },
      description: 'Prospect Copper Ore (Quality 1) for Vibrant Shards (100% success rate)',
      venue: 'Copper Ore (i:2770) → Vibrant Shards * (i:206448) [5 → 0.8]',
      reagents: [{ itemId: 2770, quantity: 5 }],
      derivatives: [
        { itemId: 206448, quantity: 0.8 },   // Vibrant Shard *
      ],
    },
    {
      expansion: 'DF',
      rank: 1,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Tin Ore (DF)', target: 'Vibrant Shards *' },
      description: 'Prospect Tin Ore (Quality 1) for Vibrant Shards (100% success rate)',
      venue: 'Tin Ore (i:3575) → Vibrant Shards * (i:206448) [5 → 0.8]',
      reagents: [{ itemId: 3575, quantity: 5 }],
      derivatives: [
        { itemId: 206448, quantity: 0.8 },   // Vibrant Shard *
      ],
    },
    {
      expansion: 'DF',
      rank: 2,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Hochenblume (DF)', target: 'Vibrant Shards **' },
      description: 'Prospect Hochenblume (Quality 2) for Vibrant Shards (100% success rate)',
      venue: 'Hochenblume (i:191460) → Vibrant Shards ** (i:206449) [5 → 1.2]',
      reagents: [{ itemId: 191460, quantity: 5 }],
      derivatives: [
        { itemId: 206449, quantity: 1.2 },   // Vibrant Shard **
      ],
    },
    {
      expansion: 'DF',
      rank: 3,
      profession: 'Jewelcrafting',
      createdBy: 'TSM',
      updatedBy: 'TSM',
      ticker: 'JC',
      names: { source: 'Rousing Fire (DF)', target: 'Vibrant Shards ***' },
      description: 'Prospect Rousing Fire (Quality 3) for Vibrant Shards (100% success rate, best yield)',
      venue: 'Rousing Fire (i:191451) → Vibrant Shards *** (i:206450) [5 → 1.8]',
      reagents: [{ itemId: 191451, quantity: 5 }],
      derivatives: [
        { itemId: 206450, quantity: 1.8 },   // Vibrant Shard ***
      ],
    },
  ],
};
