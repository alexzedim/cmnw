export interface IOsintConfig {
  readonly isIndexCharactersFromFile: boolean;
  readonly isIndexGuildsFromCharacters: boolean;

  readonly wclFromPage: number;
  readonly wclToPage: number;
  readonly wclLogs: number;
  readonly wclCurrentRaidTier: number;
}
