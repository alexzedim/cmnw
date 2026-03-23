import { Injectable, Logger } from '@nestjs/common';
import { isAxiosError } from 'axios';
import * as changeCase from 'change-case';
import { get } from 'lodash';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  IGuildSummary,
  isGuildSummary,
  BlizzardApiGuildSummary,
  transformFaction,
  GuildStatusState,
  setGuildStatusString,
} from '@app/resources';
import { GUILD_SUMMARY_KEYS } from '@app/resources';

@Injectable()
export class GuildSummaryService {
  private readonly logger = new Logger(GuildSummaryService.name, {
    timestamp: true,
  });

  async getSummary(guildNameSlug: string, realmSlug: string, BNet: any): Promise<Partial<IGuildSummary>> {
    // TODO: Reimplement with new client pattern
    this.logger.debug({ logTag: 'getSummary', message: 'Guild summary disabled - awaiting new client pattern' });
    return {};
  }

  private populateSummary(response: BlizzardApiGuildSummary, summary: Partial<IGuildSummary>): void {
    // Extract basic fields from GUILD_SUMMARY_KEYS
    Object.entries(response).forEach(([key, value]) => {
      if (value === null || !GUILD_SUMMARY_KEYS.includes(key as any)) {
        return;
      }
      summary[changeCase.camelCase(key)] = value;
    });

    // Extract faction information using transformFaction
    const transformedFaction = transformFaction(response.faction);
    if (transformedFaction) {
      summary.faction = transformedFaction;
    }

    // Extract realm information (guaranteed by typeguard)
    summary.realmId = response.realm.id;
    summary.realmName = response.realm.name;
    summary.realm = response.realm.slug;

    // Extract date information
    if (response.lastModified) {
      summary.lastModified = new Date(response.lastModified);
    }

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

    this.logger.error({
      logTag: 'getSummary',
      guildGuid: `${guildNameSlug}@${realmSlug}`,
      statusCode,
    });

    return summary;
  }
}
