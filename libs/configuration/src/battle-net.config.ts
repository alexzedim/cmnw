import { IBattleNetKeyHealthConfig } from '@app/configuration/interfaces';

export const battleNetConfig: IBattleNetKeyHealthConfig = {
  baseDelay: parseInt(process.env.BATTLE_NET_KEY_BASE_DELAY, 10) || 30,
  multiplier: parseFloat(process.env.BATTLE_NET_KEY_MULTIPLIER) || 2.0,
  maxDelay: parseInt(process.env.BATTLE_NET_KEY_MAX_DELAY, 10) || 300,
  decayStep: parseInt(process.env.BATTLE_NET_KEY_DECAY_STEP, 10) || 5,
};
