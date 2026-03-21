import { BattleNetRegion } from '../enums/battle-net-region.enum';

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
