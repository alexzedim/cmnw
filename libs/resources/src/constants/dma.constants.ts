import {
  AuctionItemExtra,
  IItem,
  IItemFieldMap,
  IPetList,
} from '@app/resources/types';
import { SkillLineEntity, SpellEffectEntity } from '@app/pg';

export const DMA_TIMEOUT_TOLERANCE = 60 * 1_000;

export const DMA_SOURCE_GOLD = 'https://funpay.ru/chips/2/';

export const WOW_TOKEN_ITEM_ID = 122284;

export enum DMA_SOURCE {
  API = 'DMA-API',
  LAB = 'DMA-LAB',
  TSM = 'DMA-TSM',
}

export enum VALUATION_TYPE {
  VSP = 'VSP',
  VENDOR = 'VENDOR',
  DERIVATIVE = 'DERIVATIVE',
  REAGENT = 'REAGENT',
  MARKET = 'MARKET',
  PREMIUM = 'PREMIUM',
  FUNPAY = 'FUNPAY',
  COMMDTY = 'COMMDTY',
  ITEM = 'ITEM',
  OTC = 'OTC',
  WOWTOKEN = 'WOWTOKEN',
  GOLD = 'GOLD',
}

export enum ORDER_FLOW {
  C = 'created',
  R = 'removed',
}

export enum CONTRACT_TYPE {
  T = 'timestamp',
  D = 'day',
  W = 'week',
  M = 'month',
  Y = 'year',
}

export enum MARKET_TYPE {
  A = 'AUCTION',
  C = 'COMMDTY',
  G = 'GOLD',
  T = 'TOKEN',
}

export enum FLAG_TYPE {
  B = 'BUY',
  S = 'SELL',
  FIX = 'PAY FIX',
  FLOAT = 'PAY FLOAT',
}

export enum FIX_FLOAT {
  FIX = 'PAY FIX',
  FLOAT = 'PAY FLOAT',
}

export enum PRICING_TYPE {
  PRIMARY = 'primary',
  REVERSE = 'reverse',
  DERIVATIVE = 'derivative',
  REVIEW = 'review',
}

export enum PROFESSION_TICKER {
  BSMT = 'BSMT',
  LTHR = 'LTHR',
  ALCH = 'ALCH',
  HRBS = 'HRBS',
  COOK = 'COOK',
  ORE = 'ORE',
  CLTH = 'CLTH',
  ENGR = 'ENGR',
  ENCH = 'ENCH',
  FISH = 'FISH',
  SKIN = 'SKIN',
  JWLC = 'JWLC',
  INSC = 'INSC',
  ARCH = 'ARCH',
}

export enum EXPANSION_TICKER {
  CLSC = 'CLSC',
  TBC = 'TBC',
  WOTLK = 'WOTLK',
  CATA = 'CATA',
  MOP = 'MOP',
  WOD = 'WOD',
  LGN = 'LGN',
  BFA = 'BFA',
  SHDW = 'SHDW',
  DF = 'DF',
  TWW = 'TWW', // The War Within
  MINT = 'MINT', // Midnight
  LT = 'LT', // The Last Titan
}

export const EXPANSION_TICKER_MAP: Map<string, string> = new Map([
  ['Within', EXPANSION_TICKER.TWW],
  ['Dragon', EXPANSION_TICKER.DF],
  ['Shadowlands', EXPANSION_TICKER.SHDW],
  ['Kul', EXPANSION_TICKER.BFA],
  ['Zandalari', EXPANSION_TICKER.BFA],
  ['Legion', EXPANSION_TICKER.LGN],
  ['Draenor', EXPANSION_TICKER.WOD],
  ['Pandaria', EXPANSION_TICKER.MOP],
  ['Cataclysm', EXPANSION_TICKER.CATA],
  ['Northrend', EXPANSION_TICKER.WOTLK],
  ['Outland', EXPANSION_TICKER.TBC],
]);

export const EXPANSION_TICKER_ID: Map<number, string> = new Map([
  [12, EXPANSION_TICKER.LT],
  [11, EXPANSION_TICKER.MINT],
  [10, EXPANSION_TICKER.TWW],
  [9, EXPANSION_TICKER.DF],
  [8, EXPANSION_TICKER.SHDW],
  [7, EXPANSION_TICKER.BFA],
  [6, EXPANSION_TICKER.LGN],
  [5, EXPANSION_TICKER.WOD],
  [4, EXPANSION_TICKER.MOP],
  [3, EXPANSION_TICKER.CATA],
  [2, EXPANSION_TICKER.WOTLK],
  [1, EXPANSION_TICKER.TBC],
  [0, EXPANSION_TICKER.CLSC],
]);

export const PROFESSION_TICKER_MAP: Map<number, string> = new Map([
  [164, PROFESSION_TICKER.BSMT],
  [165, PROFESSION_TICKER.LTHR],
  [171, PROFESSION_TICKER.ALCH],
  [182, PROFESSION_TICKER.HRBS],
  [185, PROFESSION_TICKER.COOK],
  [186, PROFESSION_TICKER.ORE],
  [197, PROFESSION_TICKER.CLTH],
  [202, PROFESSION_TICKER.ENGR],
  [333, PROFESSION_TICKER.ENCH],
  [356, PROFESSION_TICKER.FISH],
  [393, PROFESSION_TICKER.SKIN],
  [755, PROFESSION_TICKER.JWLC],
  [773, PROFESSION_TICKER.INSC],
  [794, PROFESSION_TICKER.ARCH],
]);

export const GOLD_ITEM_ENTITY = {
  id: 1,
  name: 'Gold',
  names: {
    en_US: 'Gold (Currency)',
    es_MX: 'Gold (Currency)',
    pt_BR: 'Gold (Currency)',
    de_DE: 'Gold (Currency)',
    en_GB: 'Gold (Currency)',
    es_ES: 'Gold (Currency)',
    fr_FR: 'Gold (Currency)',
    it_IT: 'Gold (Currency)',
    ru_RU: 'Золото (Валюта)',
    ko_KR: 'Gold (Currency)',
    zh_TW: 'Gold (Currency)',
    zh_CN: 'Gold (Currency)',
  },
  quality: 'Currency',
  itemLevel: 0,
  itemClass: 'Currency',
  itemSubClass: 'Currency',
  inventoryType: 'Non-equippable',
  isEquip: false,
  isStackable: true,
  hasContracts: true,
  assetClass: [VALUATION_TYPE.GOLD],
  ticker: VALUATION_TYPE.GOLD,
  tags: ['gold', 'currency', 'funpay', 'commdty'],
  indexBy: DMA_SOURCE.LAB,
};

export const ITEM_FIELD_MAPPING = new Map<keyof Partial<IItem>, IItemFieldMap>([
  ['name', { key: 'name', path: 'name' }],
  ['quality', { key: 'quality', path: 'quality.name' }],
  ['level', { key: 'itemLevel', path: 'level' }],
  ['item_class', { key: 'itemClass', path: 'item_class.name' }],
  ['item_subclass', { key: 'itemSubClass', path: 'item_subclass.name' }],
  ['purchase_price', { key: 'purchasePrice', path: 'purchase_price' }],
  ['purchase_quantity', { key: 'purchaseQuantity', path: 'purchase_quantity' }],
  ['sell_price', { key: 'vendorSellPrice', path: 'sell_price' }],
  ['is_equippable', { key: 'isEquip', path: 'is_equippable' }],
  ['is_stackable', { key: 'isStackable', path: 'is_stackable' }],
  ['inventory_type', { key: 'inventoryType', path: 'inventory_type.name' }],
  ['required_level', { key: 'level', path: 'required_level' }],
  ['preview_item', { key: 'lootType', path: 'preview_item.binding.type' }],
]);

export const ITEM_KEY_GUARD = new Map<string, keyof AuctionItemExtra>([
  ['bonus_lists', 'bonusList'],
  ['context', 'context'],
  ['modifiers', 'modifiers'],
]);

export const PETS_KEY_GUARD = new Map<string, keyof IPetList>([
  ['pet_breed_id', 'petBreedId'],
  ['pet_level', 'petLevel'],
  ['pet_quality_id', 'petQualityId'],
  ['pet_species_id', 'petSpeciesId'],
]);

export const SKILL_LINE_KEY_MAPPING = new Map<keyof SkillLineEntity, string>([
  ['skillLine', 'SkillLine'],
  ['spellId', 'Spell'],
  ['supersedesSpell', 'SupercedesSpell'],
  ['skillUpSkillLineId', 'SkillupSkillLineID'], // Note: This will overwrite if both 'SupersedesSpell' and 'SkillUpSkillLineID' map to 'skillUpSkillLineId'
  ['minSkillRank', 'MinSkillLineRank'],
  ['numSkillUps', 'NumSkillUps'],
  ['yellowCraft', 'TrivialSkillLineRankHigh'],
  ['greenCraft', 'TrivialSkillLineRankLow'],
]);

export const SPELL_EFFECT_KEY_MAPPING = new Map<
  keyof SpellEffectEntity,
  string
>([
  ['spellId', 'SpellID'],
  ['effect', 'Effect'],
  ['itemId', 'EffectItemType'],
  ['itemQuantity', 'EffectBasePointsF'],
]);

export const ASSET_EVALUATION_PRIORITY: Map<number, any> = new Map([
  // GOLD
  [1, { id: 1 }],
  // WOWTOKEN
  [2, { asset_class: VALUATION_TYPE.WOWTOKEN }],
  // ACTUAL NON DERIVATIVE REAGENT & MARKET & COMMDTY
  [
    3,
    {
      $and: [
        {
          asset_class: {
            $nin: [VALUATION_TYPE.DERIVATIVE, VALUATION_TYPE.PREMIUM],
          },
        },
        {
          asset_class: {
            $all: [
              VALUATION_TYPE.REAGENT,
              VALUATION_TYPE.MARKET,
              VALUATION_TYPE.COMMDTY,
            ],
          },
        },
      ],
    },
  ],
  // ACTUAL ALL REAGENT & DERIVATIVE
  [
    4,
    {
      $and: [
        {
          asset_class: {
            $all: [VALUATION_TYPE.REAGENT, VALUATION_TYPE.DERIVATIVE],
          },
        },
      ],
    },
  ],
  // PURE DERIVATIVE
  [
    5,
    {
      $and: [
        {
          asset_class: {
            $nin: [VALUATION_TYPE.REAGENT],
          },
        },
        { asset_class: VALUATION_TYPE.DERIVATIVE },
      ],
    },
  ],
]);

/**
 * Redis TTL Configuration for XVA Service
 * Defines cache expiration times for CSV files and valuation stages
 */
export const REDIS_TTL = {
  CSV_FILES: 60 * 60 * 24 * 30, // 30 days
  VALUATION_STAGES: 60 * 60 * 24 * 7, // 7 days
} as const;

/**
 * Batch Size for XVA Service Operations
 * Used for processing large datasets in chunks
 */
export const BATCH_SIZE = 500;
