import { BattleNetRegion } from '../enums/battle-net-region.enum';
import { BattleNetNamespace } from '../enums/battle-net-namespace.enum';

// Battle.net API Key Tags
export const BATTLE_NET_KEY_TAG_OSINT = 'osint';
export const BATTLE_NET_KEY_TAG_DMA = 'dma';
export const BATTLE_NET_KEY_TAG_BLIZZARD = 'blizzard';

// Warcraft Logs API Key Tags
export const BATTLE_NET_KEY_TAG_WCL_V1 = 'v1';
export const BATTLE_NET_KEY_TAG_WCL_V2 = 'v2';

export const BATTLE_NET_API_VERSION = '2024-01-15';

export const BATTLE_NET_BASE_URLS: Record<BattleNetRegion, string> = {
  [BattleNetRegion.EU]: 'https://eu.battle.net',
  [BattleNetRegion.US]: 'https://us.battle.net',
  [BattleNetRegion.KR]: 'https://kr.battle.net',
  [BattleNetRegion.TW]: 'https://tw.battle.net',
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

export const apiConstParams = (
  header: BattleNetApiNamespace,
  tolerance: number = BATTLE_NET_OSINT_TIMEOUT,
  isMultiLocale?: boolean,
  ifModifiedSince?: string,
) => ({
  params: isMultiLocale ? {} : { locale: 'en_GB' },
  headers: ifModifiedSince
    ? {
        'Battlenet-Namespace': header,
        'If-Modified-Since': ifModifiedSince,
      }
    : {
        'Battlenet-Namespace': header,
      },
  timeout: tolerance,
});
