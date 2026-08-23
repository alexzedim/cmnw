import type { IOsintConfig } from '@app/configuration/interfaces';

export const osintConfig: IOsintConfig = {
  isIndexCharactersFromFile: process.env.OSINT_INDEX_CHARACTERS_FROM_FILE === 'true',
  isIndexGuildsFromCharacters: process.env.OSINT_INDEX_GUILDS_FROM_CHARACTERS === 'true',

  wclFromPage: Number(process.env.OSINT_WCL_FROM_PAGE) || 1,
  wclToPage: Number(process.env.OSINT_WCL_TO_PAGE) || 1,
  wclLogs: Number(process.env.OSINT_WCL_LOGS) || 50,
  wclCurrentRaidTier: Number(process.env.OSINT_WCL_CURRENT_RAID_TIER) || 0,
  wclProxyUrl: process.env.OSINT_WCL_PROXY_URL || null,
};
