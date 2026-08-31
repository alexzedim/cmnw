import type { IOsintConfig } from '@app/configuration/interfaces';

export const osintConfig: IOsintConfig = {
  isIndexCharactersFromFile: process.env.OSINT_INDEX_CHARACTERS_FROM_FILE === 'true',
  isIndexGuildsFromCharacters: process.env.OSINT_INDEX_GUILDS_FROM_CHARACTERS === 'true',

  wclCurrentRaidTier: Number(process.env.OSINT_WCL_CURRENT_RAID_TIER) || 0,

  wclRequestDelayMs: Number(process.env.OSINT_WCL_REQUEST_DELAY_MS) || 2_000,
  wclDiscoveryRealmsPerRun: Number(process.env.OSINT_WCL_DISCOVERY_REALMS_PER_RUN) || 5,
  wclDiscoveryMaxPages: Number(process.env.OSINT_WCL_DISCOVERY_MAX_PAGES) || 5,
  wclDiscoveryKnownThreshold: Number(process.env.OSINT_WCL_DISCOVERY_KNOWN_THRESHOLD) || 25,
  wclHistoryEnabled: process.env.OSINT_WCL_HISTORY_ENABLED === 'true',
  wclHistoryPagesPerRun: Number(process.env.OSINT_WCL_HISTORY_PAGES_PER_RUN) || 25,
  wclHistoryMaxPages: Number(process.env.OSINT_WCL_HISTORY_MAX_PAGES) || 10_000,
  wclRosterBatchSize: Number(process.env.OSINT_WCL_ROSTER_BATCH_SIZE) || 500,
  wclMaxAttempts: Number(process.env.OSINT_WCL_MAX_ATTEMPTS) || 5,
  wclRetryCooldownMin: Number(process.env.OSINT_WCL_RETRY_COOLDOWN_MIN) || 30,
  wclChannelFailureThreshold: Number(process.env.OSINT_WCL_CHANNEL_FAILURE_THRESHOLD) || 5,
  wclChannelCooldownSec: Number(process.env.OSINT_WCL_CHANNEL_COOLDOWN_SEC) || 900,
};
