export interface IOsintConfig {
  readonly isIndexCharactersFromFile: boolean;
  readonly isIndexGuildsFromCharacters: boolean;

  readonly wclCurrentRaidTier: number;

  readonly wclRequestDelayMs: number;
  readonly wclDiscoveryRealmsPerRun: number;
  readonly wclDiscoveryMaxPages: number;
  readonly wclDiscoveryKnownThreshold: number;
  readonly wclHistoryEnabled: boolean;
  readonly wclHistoryPagesPerRun: number;
  readonly wclHistoryMaxPages: number;
  readonly wclRosterBatchSize: number;
  readonly wclMaxAttempts: number;
  readonly wclRetryCooldownMin: number;
  readonly wclChannelFailureThreshold: number;
  readonly wclChannelCooldownSec: number;
}
