import { osintConfig } from '@app/configuration';
import { CharactersRaidLogsEntity } from '@app/pg';
import {
  CharacterMessageDto,
  type FightsAPIResponse,
  type ICharacterMessageBase,
  type RaidCharacter,
  toGuid,
  toSlug,
  WCL_PAYLOAD_SOURCE,
  WCL_RAID_LOG_STATUS,
  type WclGraphQLReportBody,
  type WclRaidLogPayload,
} from '@app/resources';
import { RealmsCacheService } from '@app/resources/services/realms-cache.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import chalk from 'chalk';
import type { Repository } from 'typeorm';

@Injectable()
export class WclParseService {
  private readonly logger = new Logger(WclParseService.name, { timestamp: true });

  constructor(
    @InjectQueue('osint.characters')
    private readonly charactersQueue: Queue<ICharacterMessageBase>,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    private readonly realmsCacheService: RealmsCacheService,
  ) {}

  /**
   * Extracts characters from stored payloads and queues them for osint. Reads
   * only from the database — a payload is downloaded exactly once and any
   * future re-parse (logic fixes, slug remaps) costs no API traffic. A log is
   * marked 'parsed' only after successful extraction; failures keep the
   * payload and stay retryable.
   */
  public async parseBatch(): Promise<{ parsed: number; queued: number; failed: number }> {
    const logsEntities = await this.charactersRaidLogsRepository
      .createQueryBuilder('log')
      .where('log.status = :downloaded', { downloaded: WCL_RAID_LOG_STATUS.DOWNLOADED })
      .orderBy('log.started_at', 'DESC', 'NULLS LAST')
      .take(osintConfig.wclRosterBatchSize)
      .getMany();
    if (!logsEntities.length) {
      return { parsed: 0, queued: 0, failed: 0 };
    }

    const counters = { parsed: 0, queued: 0, failed: 0 };
    for (const logEntity of logsEntities) {
      try {
        const raidCharacters = await this.extractCharacters(logEntity);
        if (raidCharacters.length) {
          await this.charactersToQueue(raidCharacters);
        }
        await this.charactersRaidLogsRepository.update(
          { uuid: logEntity.uuid },
          { status: WCL_RAID_LOG_STATUS.PARSED, isIndexed: true },
        );
        counters.parsed += 1;
        counters.queued += raidCharacters.length;
        this.logger.log(
          `${chalk.green('✓')} Parsed ${chalk.dim(logEntity.logId)} ${chalk.dim(`| ${raidCharacters.length} characters`)}`,
        );
      } catch (errorOrException) {
        const message = errorOrException instanceof Error ? errorOrException.message : String(errorOrException);
        await this.charactersRaidLogsRepository.update(
          { uuid: logEntity.uuid },
          {
            status: WCL_RAID_LOG_STATUS.FAILED,
            attempts: logEntity.attempts + 1,
            lastError: message.slice(0, 500),
            lastErrorAt: new Date(),
          },
        );
        counters.failed += 1;
        this.logger.error({ logTag: 'parseLog', logId: logEntity.logId, errorOrException: message });
      }
    }

    this.logger.log(
      `${chalk.green('✓')} Parse batch ${chalk.dim(`| ${logsEntities.length} logs | ✓ ${counters.parsed} | → ${counters.queued} chars | ✗ ${counters.failed}`)}`,
    );
    return counters;
  }

  private async extractCharacters(logEntity: CharactersRaidLogsEntity): Promise<Array<RaidCharacter>> {
    const payload = logEntity.payload as unknown as WclRaidLogPayload;
    if (!payload?.data) {
      throw new Error('Missing payload data');
    }

    const realmSlugCache = new Map<string, string>();
    const resolveSlug = async (input: string): Promise<string> => {
      const slug = toSlug(input);
      const cachedSlug = realmSlugCache.get(slug);
      if (cachedSlug) return cachedSlug;
      const canonicalSlug = await CharacterMessageDto.resolveRealmSlug(this.realmsCacheService, slug);
      realmSlugCache.set(slug, canonicalSlug);
      return canonicalSlug;
    };

    const characters = new Map<string, RaidCharacter>();

    if (payload.source === WCL_PAYLOAD_SOURCE.FIGHTS) {
      const fightsPayload = payload.data as FightsAPIResponse;
      for (const friendly of fightsPayload.friendlies ?? []) {
        if (friendly.type === 'NPC' || !friendly.server) continue;
        const name = friendly.name.trim();
        const realm = await resolveSlug(friendly.server);
        characters.set(toGuid(name, realm), { guid: toGuid(name, realm), name, realm });
      }
      return Array.from(characters.values());
    }

    const graphqlPayload = payload.data as WclGraphQLReportBody;
    const report = graphqlPayload.data?.reportData?.report;
    if (!report) {
      throw new Error('GraphQL payload missing report data');
    }
    const timestamp = Number(report.startTime) || 1;

    for (const character of report.rankedCharacters ?? []) {
      const name = character.name;
      const realm = await resolveSlug(character.server.slug);
      characters.set(toGuid(name, realm), {
        guid: toGuid(name, realm),
        id: character.id,
        name,
        realm,
        guildRank: character.guildRank,
        timestamp,
      });
    }
    for (const actor of report.masterData?.actors ?? []) {
      if (actor.type !== 'Player' || !actor.server) continue;
      const name = actor.name;
      const realm = await resolveSlug(actor.server);
      characters.set(toGuid(name, realm), { guid: toGuid(name, realm), name, realm, timestamp });
    }

    return Array.from(characters.values());
  }

  private async charactersToQueue(raidCharacters: Array<RaidCharacter>): Promise<void> {
    const charactersToJobs = raidCharacters.map((raidCharacter) =>
      CharacterMessageDto.fromWarcraftLogs({
        name: raidCharacter.name,
        realm: raidCharacter.realm,
      }),
    );
    await this.charactersQueue.addBulk(
      charactersToJobs.map((job) => ({
        name: job.name,
        data: job.data,
        opts: job.opts,
      })),
    );
  }
}
