import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Repository } from 'typeorm';
import * as changeCase from 'change-case';
import { get } from 'lodash';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  FACTION,
  IGuildSummary,
  incErrorCount,
  STATUS_CODES,
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

      if (!response || typeof response !== 'object') {
        return summary;
      }

      this.extractBasicFields(response, summary);
      this.extractFaction(response, summary);
      this.extractRealm(response, summary);
      this.extractDates(response, summary);

      if ('member_count' in response) {
        summary.membersCount = response.member_count;
      }

      summary.statusCode = GUILD_WORKER_CONSTANTS.SUCCESS_STATUS_CODE;
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

  private extractBasicFields(
    response: Record<string, any>,
    summary: Partial<IGuildSummary>,
  ): void {
    Object.entries(response).forEach(([key, value]) => {
      const isBasicFieldWithValue =
        GUILD_SUMMARY_KEYS.includes(key as any) && value !== null;
      if (isBasicFieldWithValue) {
        summary[changeCase.camelCase(key)] = value;
      }
    });
  }

  private extractFaction(
    response: Record<string, any>,
    summary: Partial<IGuildSummary>,
  ): void {
    const faction = response.faction;
    const isFactionObject = typeof faction === 'object' && faction !== null;

    if (!isFactionObject) {
      return;
    }

    const hasFactionTypeWithoutName = faction.type && faction.name === null;
    if (hasFactionTypeWithoutName) {
      const factionTypeStartsWithA = faction.type.toString().startsWith('A');
      summary.faction = factionTypeStartsWithA ? FACTION.A : FACTION.H;
    } else {
      summary.faction = faction.name;
    }
  }

  private extractRealm(
    response: Record<string, any>,
    summary: Partial<IGuildSummary>,
  ): void {
    const realm = response.realm;
    const isRealmValid =
      typeof realm === 'object' &&
      realm !== null &&
      realm.id &&
      realm.name &&
      realm.slug;

    if (isRealmValid) {
      summary.realmId = realm.id;
      summary.realmName = realm.name;
      summary.realm = realm.slug;
    }
  }

  private extractDates(
    response: Record<string, any>,
    summary: Partial<IGuildSummary>,
  ): void {
    if ('last_modified' in response) {
      summary.lastModified = new Date(response.last_modified);
    }

    if ('created_timestamp' in response) {
      summary.createdTimestamp = new Date(response.created_timestamp);
    }
  }

  private async handleSummaryError(
    errorOrException: any,
    summary: Partial<IGuildSummary>,
    guildNameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IGuildSummary>> {
    summary.statusCode = get(
      errorOrException,
      'status',
      STATUS_CODES.ERROR_GUILD,
    );

    const isTooManyRequests =
      summary.statusCode ===
      GUILD_WORKER_CONSTANTS.TOO_MANY_REQUESTS_STATUS_CODE;
    if (isTooManyRequests) {
      await incErrorCount(
        this.keysRepository,
        BNet.accessTokenObject.access_token,
      );
    }

    this.logger.error({
      logTag: 'getSummary',
      guildGuid: `${guildNameSlug}@${realmSlug}`,
      statusCode: summary.statusCode,
    });

    return summary;
  }
}
