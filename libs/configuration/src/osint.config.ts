import { IOsintConfig } from '@app/configuration/interfaces';

export const osintConfig: IOsintConfig = {
  isIndexCharactersFromFile: process.env.OSINT_INDEX_CHARACTERS_FROM_FILE === 'true',
  isIndexGuildsFromCharacters:
    process.env.OSINT_INDEX_GUILDS_FROM_CHARACTERS === 'true',

  wclFromPage: Number(process.env.OSINT_WCL_FROM_PAGE),
  wclToPage: Number(process.env.OSINT_WCL_TO_PAGE),
  wclLogs: Number(process.env.OSINT_WCL_LOGS),
  wclCurrentRaidTier: Number(process.env.OSINT_WCL_CURRENT_RAID_TIER),
};
