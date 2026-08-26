import { BattleNetNamespace, BattleNetService, type IBattleNetClientConfig } from '@app/battle-net';
import { formatServiceErrorLog, formatServiceLog, WorkerLogStatus } from '@app/logger';
import {
  type BlizzardApiGuildSummary,
  GUILD_SUMMARY_KEYS,
  GuildStatusState,
  type IGuildSummary,
  isGuildSummary,
  normalizeLocaleField,
  setGuildStatusString,
  toGuid,
  transformFaction,
} from '@app/resources';
import { Injectable, Logger } from '@nestjs/common';
import { isAxiosError } from 'axios';
import * as changeCase from 'change-case';
import { get } from 'lodash';

@Injectable()
export class GuildSummaryService {
  private readonly logger = new Logger(GuildSummaryService.name, {
    timestamp: true,
  });

  constructor(private readonly battleNetService: BattleNetService) {}

  async getSummary(
    guildNameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<Partial<IGuildSummary>> {
    try {
      const response = await this.battleNetService.query<BlizzardApiGuildSummary>(
        `/data/wow/guild/${realmSlug}/${guildNameSlug}`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      if (!isGuildSummary(response)) {
        this.logger.warn(
          formatServiceLog(
            WorkerLogStatus.WARNING,
            'getSummary',
            `${guildNameSlug}@${realmSlug}`,
            0,
            'Invalid guild summary response',
          ),
        );
        return {};
      }

      const summary: Partial<IGuildSummary> = {};
      this.populateSummary(response, summary);
      return summary;
    } catch (errorOrException) {
      return this.handleSummaryError(errorOrException, {}, guildNameSlug, realmSlug);
    }
  }

  private populateSummary(response: BlizzardApiGuildSummary, summary: Partial<IGuildSummary>): void {
    // Extract basic fields from GUILD_SUMMARY_KEYS
    Object.entries(response).forEach(([key, value]) => {
      if (value === null || !GUILD_SUMMARY_KEYS.includes(key as any)) {
        return;
      }
      summary[changeCase.camelCase(key)] = typeof value === 'object' ? normalizeLocaleField(value) : value;
    });

    // Extract faction information using transformFaction
    const normalizedName = normalizeLocaleField(response.faction.name);
    const normalizedFaction = { ...response.faction, name: normalizedName };
    const transformedFaction = transformFaction(normalizedFaction);
    if (transformedFaction) {
      summary.faction = transformedFaction;
    }

    // Extract realm information (guaranteed by typeguard)
    summary.realmId = response.realm.id;
    summary.realmName = normalizeLocaleField(response.realm.name);
    summary.realm = response.realm.slug;

    // Extract date information
    if (response.created_timestamp) {
      summary.createdTimestamp = new Date(response.created_timestamp);
    }

    // Extract member count (guaranteed by typeguard)
    summary.membersCount = response.member_count;
  }

  private async handleSummaryError(
    errorOrException: any,
    summary: Partial<IGuildSummary>,
    guildNameSlug: string,
    realmSlug: string,
  ): Promise<Partial<IGuildSummary>> {
    const statusCode = isAxiosError(errorOrException)
      ? errorOrException.response?.status
      : get(errorOrException, 'status', 400);

    summary.status = setGuildStatusString('-----', 'SUMMARY', GuildStatusState.ERROR);

    this.logger.error(formatServiceErrorLog('getSummary', toGuid(guildNameSlug, realmSlug), 0, `HTTP ${statusCode}`));

    return summary;
  }
}
