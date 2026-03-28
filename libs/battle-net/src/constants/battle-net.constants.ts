import { BattleNetRegion } from '../enums/battle-net-region.enum';
import { BattleNetNamespace } from '../enums/battle-net-namespace.enum';

export const BATTLE_NET_KEY_TAG_OSINT = 'osint';
export const BATTLE_NET_KEY_TAG_DMA = 'dma';
export const BATTLE_NET_KEY_TAG_BLIZZARD = 'blizzard';

export const BATTLE_NET_KEY_TAG_WCL_V1 = 'v1';
export const BATTLE_NET_KEY_TAG_WCL_V2 = 'v2';

export const BATTLE_NET_BASE_URLS: Record<BattleNetRegion, string> = {
  [BattleNetRegion.EU]: 'https://eu.api.blizzard.com',
  [BattleNetRegion.US]: 'https://us.api.blizzard.com',
  [BattleNetRegion.KR]: 'https://kr.api.blizzard.com',
  [BattleNetRegion.TW]: 'https://tw.api.blizzard.com',
  [BattleNetRegion.CN]: 'https://gateway.battlenet.com.cn',
};

export const BATTLE_NET_TIMEOUT = 30000;

export const BATTLE_NET_DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export const BATTLE_NET_OSINT_TIMEOUT = 50 * 1_000;
export const BATTLE_NET_DMA_TIMEOUT = 60 * 1_000;

export enum BattleNetApiNamespace {
  PROFILE = 'profile-eu',
  DYNAMIC = 'dynamic-eu',
  STATIC = 'static-eu',
}

export interface IBattleNetQueryOptionsInternal {
  namespace: BattleNetNamespace | string;
  locale?: string;
  timeout?: number;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  isMultiLocale?: boolean;
  ifModifiedSince?: string;
}
