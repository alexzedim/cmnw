import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Repository } from 'typeorm';
import * as changeCase from 'change-case';
import { get } from 'lodash';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  IGuildSummary,
  incErrorCount,
  isGuildSummary,
  BlizzardApiGuildSummary,
  transformFaction,
  GuildStatusState,
  setGuildStatusString,
} from '@app/resources';
import { KeysEntity } from '@app/pg';
import { GUILD_WORKER_CONSTANTS, GUILD_SUMMARY_KEYS } from '@app/resources';

@Injectable()
export class GuildSummaryService {
  private readonly logger = new Logger(GuildSummaryService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {}

  async getSummary(
    guildNameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IGuildSummary>> {
    const summary: Partial<IGuildSummary> = {};

    try {
      const response: Record<string, any> = await BNet.query(
        `/data/wow/guild/${realmSlug}/${guildNameSlug}`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      if (!isGuildSummary(response)) {
        return summary;
      }

      this.populateSummary(response, summary);
      summary.status = '';
      summary.statusString = setGuildStatusString('-----', 'SUMMARY', GuildStatusState.SUCCESS);
      return summary;
    } catch (errorOrException) {
      return await this.handleSummaryError(
        errorOrException,
        summary,
        guildNameSlug,
        realmSlug,
        BNet,
      );
    }
  }

  private populateSummary(
    response: BlizzardApiGuildSummary,
    summary: Partial<IGuildSummary>,
  ): void {
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
    BNet: BlizzAPI,
  ): Promise<Partial<IGuildSummary>> {
    const statusCode = get(errorOrException, 'status', 400);
    summary.status = statusCode;
    summary.statusString = setGuildStatusString('-----', 'SUMMARY', GuildStatusState.ERROR);

    // Handle rate limiting
    if (statusCode === GUILD_WORKER_CONSTANTS.TOO_MANY_REQUESTS_STATUS_CODE) {
      await incErrorCount(this.keysRepository, BNet.accessTokenObject.access_token);
    }

    this.logger.error({
      logTag: 'getSummary',
      guildGuid: `${guildNameSlug}@${realmSlug}`,
      statusCode,
    });

    return summary;
  }
}
