import { BATTLE_NET_KEY_TAG_WCL_V2, BattleNetService } from '@app/battle-net';
import { osintConfig } from '@app/configuration';
import { CharactersRaidLogsEntity } from '@app/pg';
import {
  type FightsAPIResponse,
  isCharacterRaidLogResponse,
  WCL_FIGHTS_PARTICIPANTS_URL,
  WCL_GRAPHQL_REQUEST_DELAY_MS,
  WCL_GRAPHQL_URL,
  WCL_PAYLOAD_SOURCE,
  WCL_RAID_LOG_STATUS,
  WCL_REPORT_QUERY,
  type WclDownloadOutcome,
  type WclGraphQLReportBody,
  type WclRaidLogPayload,
} from '@app/resources';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import chalk from 'chalk';
import type { Repository } from 'typeorm';
import { WclBrowserService } from './wcl-browser.service';

@Injectable()
export class WclRosterService {
  private readonly logger = new Logger(WclRosterService.name, { timestamp: true });

  constructor(
    private readonly browserService: WclBrowserService,
    private readonly battleNetService: BattleNetService,
    private readonly httpService: HttpService,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
  ) {}

  /**
   * Downloads raw report payloads for a batch of pending logs. Primary channel
   * is the fights-and-participants endpoint via the stealth browser (no API
   * quota); the GraphQL API is the safe-switch when the browser channel is
   * blocked. Payloads are persisted before parsing, so a crash never loses a
   * download and re-parsing never re-downloads.
   */
  public async downloadBatch(): Promise<{ downloaded: number; notFound: number; failed: number }> {
    const logsEntities = await this.takePendingBatch();
    if (!logsEntities.length) {
      return { downloaded: 0, notFound: 0, failed: 0 };
    }

    const counters = { downloaded: 0, notFound: 0, failed: 0 };
    for (const logEntity of logsEntities) {
      const outcome = await this.downloadOne(logEntity);
      if (outcome === 'downloaded') counters.downloaded += 1;
      else if (outcome === 'not_found') counters.notFound += 1;
      else counters.failed += 1;
    }

    this.logger.log(
      `${chalk.green('✓')} Roster batch ${chalk.dim(`| ${logsEntities.length} logs | ✓ ${counters.downloaded} | ⊘ ${counters.notFound} | ✗ ${counters.failed}`)}`,
    );
    return counters;
  }

  private async downloadOne(logEntity: CharactersRaidLogsEntity): Promise<WclDownloadOutcome> {
    if (await this.browserService.isChannelHealthy()) {
      const result = await this.browserService.fetchJson<FightsAPIResponse>(
        WCL_FIGHTS_PARTICIPANTS_URL(logEntity.logId),
      );
      if (result.status === 'ok') {
        await this.markDownloaded(logEntity, {
          fetchedAt: new Date().toISOString(),
          source: WCL_PAYLOAD_SOURCE.FIGHTS,
          data: result.data,
        });
        return 'downloaded';
      }
      if (result.status === 'not_found') {
        return this.markNotFound(logEntity, 'Report not found');
      }
      if (result.status === 'error') {
        return this.markFailed(logEntity, `Fights endpoint: ${result.message}`);
      }
      this.logger.warn(
        chalk.yellow(`⚠ Browser channel blocked on ${chalk.dim(logEntity.logId)}, falling back to GraphQL`),
      );
    }
    return this.downloadViaGraphql(logEntity);
  }

  private async downloadViaGraphql(logEntity: CharactersRaidLogsEntity): Promise<WclDownloadOutcome> {
    await new Promise((resolve) => {
      setTimeout(resolve, WCL_GRAPHQL_REQUEST_DELAY_MS);
    });

    const wclKey = await this.battleNetService.getAvailableKey(BATTLE_NET_KEY_TAG_WCL_V2);
    if (!wclKey?.accessToken) {
      return this.markFailed(logEntity, 'No WCL API key available for GraphQL fallback');
    }

    try {
      const response = await this.httpService.axiosRef.post<WclGraphQLReportBody>(
        WCL_GRAPHQL_URL,
        { query: WCL_REPORT_QUERY(logEntity.logId) },
        { headers: { Authorization: `Bearer ${wclKey.accessToken}` }, timeout: 15_000 },
      );
      const body = response.data;

      const isNotFound = body.errors?.some((error) => error.message.toLowerCase().includes('not found'));
      if (isNotFound) {
        return this.markNotFound(logEntity, 'Report not found (GraphQL)');
      }
      if (!isCharacterRaidLogResponse(response)) {
        return this.markFailed(logEntity, 'Unexpected GraphQL response shape');
      }

      await this.markDownloaded(logEntity, {
        fetchedAt: new Date().toISOString(),
        source: WCL_PAYLOAD_SOURCE.GRAPHQL,
        data: body,
      });
      return 'downloaded';
    } catch (errorOrException) {
      if (errorOrException instanceof AxiosError) {
        const status = errorOrException.response?.status;
        if (status === 429) {
          await this.battleNetService.recordKeyRateLimit(wclKey.uuid);
          return this.markFailed(logEntity, 'GraphQL rate limited');
        }
        if (status === 401) {
          await this.battleNetService.recordKeyError(wclKey.uuid);
          return this.markFailed(logEntity, 'GraphQL unauthorized');
        }
      }
      return this.markFailed(
        logEntity,
        errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
      );
    }
  }

  private async takePendingBatch(): Promise<Array<CharactersRaidLogsEntity>> {
    const retryBefore = new Date(Date.now() - osintConfig.wclRetryCooldownMin * 60_000);
    return this.charactersRaidLogsRepository
      .createQueryBuilder('log')
      .where(
        `log.status = :discovered OR (log.status = :failed AND log.attempts < :maxAttempts AND (log.last_error_at IS NULL OR log.last_error_at < :retryBefore))`,
        {
          discovered: WCL_RAID_LOG_STATUS.DISCOVERED,
          failed: WCL_RAID_LOG_STATUS.FAILED,
          maxAttempts: osintConfig.wclMaxAttempts,
          retryBefore,
        },
      )
      .orderBy('log.started_at', 'DESC', 'NULLS LAST')
      .take(osintConfig.wclRosterBatchSize)
      .getMany();
  }

  private async markDownloaded(logEntity: CharactersRaidLogsEntity, payload: WclRaidLogPayload): Promise<void> {
    await this.charactersRaidLogsRepository.update(
      { uuid: logEntity.uuid },
      {
        status: WCL_RAID_LOG_STATUS.DOWNLOADED,
        source: payload.source,
        payload: payload as unknown as Record<string, unknown>,
        lastError: null,
        lastErrorAt: null,
      },
    );
  }

  private async markNotFound(logEntity: CharactersRaidLogsEntity, reason: string): Promise<WclDownloadOutcome> {
    await this.charactersRaidLogsRepository.update(
      { uuid: logEntity.uuid },
      { status: WCL_RAID_LOG_STATUS.NOT_FOUND, lastError: reason, lastErrorAt: new Date() },
    );
    return 'not_found';
  }

  private async markFailed(logEntity: CharactersRaidLogsEntity, reason: string): Promise<WclDownloadOutcome> {
    await this.charactersRaidLogsRepository.update(
      { uuid: logEntity.uuid },
      {
        status: WCL_RAID_LOG_STATUS.FAILED,
        attempts: logEntity.attempts + 1,
        lastError: reason.slice(0, 500),
        lastErrorAt: new Date(),
      },
    );
    return 'failed';
  }
}
