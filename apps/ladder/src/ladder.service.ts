import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { RealmsEntity } from '@app/pg';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { from, mergeMap, toArray, catchError, of, lastValueFrom } from 'rxjs';

import {
  BRACKETS,
  CharacterMessageDto,
  charactersQueue,
  IMythicKeystoneSeasonResponse,
  IMythicKeystoneSeasonDetail,
  IMythicKeystoneDungeonResponse,
  IMythicLeaderboardResponse,
  MythicLeaderboardGroup,
  transformFaction,
  TIME_MS,
  REALM_ENTITY_ANY,
  M_PLUS_REALM_DUNGEON_PREFIX,
  ILeaderboardRequest,
  IPvPSeasonIndexResponse,
  IPvPLeaderboardResponse,
  PvPSeason,
  ICharacterMessageBase,
} from '@app/resources';
import {
  validateMythicKeystoneDungeonResponse,
  validateMythicKeystoneSeasonResponse,
  validateMythicKeystoneSeasonDetail,
  validateMythicLeaderboardResponse,
  validatePvPSeasonIndexResponse,
  validatePvPLeaderboardResponse,
} from '@app/resources/guard/ladder.guard';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BattleNetService,
  BattleNetNamespace,
  BATTLE_NET_KEY_TAG_BLIZZARD,
  IBattleNetClientConfig,
} from '@app/battle-net';

const M_PLUS_PARALLEL_REQUESTS = 3;

@Injectable()
export class LadderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LadderService.name, { timestamp: true });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacters: Queue<ICharacterMessageBase>,
    private readonly battleNetService: BattleNetService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_BLIZZARD);
    await this.indexMythicPlusLadder();
    await this.indexPvPLadder();
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async indexPvPLadder(): Promise<void> {
    const logTag = this.indexPvPLadder.name;
    try {
      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_BLIZZARD);
      const pvpSeasonIndex = await this.fetchPvPSeasonIndex(config);

      validatePvPSeasonIndexResponse(pvpSeasonIndex);

      await this.processPvPLeaderboards(pvpSeasonIndex.seasons, logTag, config);

      this.logger.log({
        logTag,
        message: 'PvP ladder indexing completed successfully',
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  private async processPvPLeaderboards(
    seasons: PvPSeason[],
    logTag: string,
    config: IBattleNetClientConfig,
  ): Promise<void> {
    const totalRequests = seasons.length * BRACKETS.length;
    let processedCount = 0;

    for (const season of seasons) {
      for (const bracket of BRACKETS) {
        processedCount++;

        try {
          const cacheKey = this.buildPvPLeaderboardCacheKey(season.id, bracket);

          const isCached = await this.redisService.exists(cacheKey);
          if (isCached) {
            this.logger.debug({
              logTag,
              seasonId: season.id,
              bracket,
              message: 'Skipping cached PvP leaderboard',
            });
            continue;
          }

          const pvpLeaderboard = await this.fetchPvPLeaderboard(season.id, bracket, config);

          if (pvpLeaderboard.entries.length === 0) {
            await this.markPvPLeaderboardAsProcessed(season.id, bracket);
            this.logger.debug({
              logTag,
              seasonId: season.id,
              bracket,
              message: 'No entries found in PvP leaderboard',
            });
            continue;
          }

          await this.processPvPLeaderboardEntries(pvpLeaderboard, season.id, bracket, logTag);

          await this.markPvPLeaderboardAsProcessed(season.id, bracket);

          if (processedCount % 5 === 0) {
            this.logger.debug({
              logTag,
              progress: `${processedCount}/${totalRequests}`,
            });
          }
        } catch (error) {
          this.handlePvPLeaderboardError(error, season.id, bracket, logTag);
        }
      }
    }
  }

  private buildPvPLeaderboardCacheKey(seasonId: number, bracket: string): string {
    return `pvp:leaderboard:${seasonId}:${bracket}`;
  }

  private async markPvPLeaderboardAsProcessed(seasonId: number, bracket: string): Promise<void> {
    const cacheKey = this.buildPvPLeaderboardCacheKey(seasonId, bracket);
    await this.redisService.setex(
      cacheKey,
      TIME_MS.ONE_WEEK / 1000,
      JSON.stringify({
        processedAt: new Date().toISOString(),
        seasonId,
        bracket,
      }),
    );
  }

  private async fetchPvPSeasonIndex(config: IBattleNetClientConfig): Promise<IPvPSeasonIndexResponse> {
    const response = await this.battleNetService.query<IPvPSeasonIndexResponse>(
      '/data/wow/pvp-season/index',
      {
        namespace: BattleNetNamespace.DYNAMIC,
        locale: 'en_GB',
      },
      config,
    );
    return response;
  }

  private async fetchPvPLeaderboard(
    seasonId: number,
    bracket: string,
    config: IBattleNetClientConfig,
  ): Promise<IPvPLeaderboardResponse> {
    const response = await this.battleNetService.query<IPvPLeaderboardResponse>(
      `/data/wow/pvp-season/${seasonId}/pvp-leaderboard/${bracket}`,
      { namespace: BattleNetNamespace.DYNAMIC, locale: 'en_GB' },
      config,
    );

    validatePvPLeaderboardResponse(response);
    return response;
  }

  private async processPvPLeaderboardEntries(
    pvpLeaderboard: IPvPLeaderboardResponse,
    seasonId: number,
    bracket: string,
    logTag: string,
  ): Promise<void> {
    const characterJobs = pvpLeaderboard.entries.map((entry) =>
      CharacterMessageDto.fromPvPLadder({
        name: entry.character.name,
        realm: entry.character.realm.slug,
        faction: transformFaction(entry.faction.type),
      }),
    );

    if (characterJobs.length === 0) {
      this.logger.warn({
        logTag,
        seasonId,
        bracket,
        message: 'No valid character jobs created from PvP leaderboard entries',
      });
      return;
    }

    await this.queueCharacters.addBulk(characterJobs);

    this.logger.log({
      logTag,
      seasonId,
      bracket,
      playerCount: characterJobs.length,
      message: `Processed PvP ladder: Season ${seasonId}, Bracket ${bracket}, Players: ${characterJobs.length}`,
    });
  }

  private handlePvPLeaderboardError(error: unknown, seasonId: number, bracket: string, logTag: string): void {
    if (error instanceof Error) {
      const statusMatch = error.message.match(/(\d{3})/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      if (statusCode === 404) {
        this.logger.debug({
          logTag,
          seasonId,
          bracket,
          message: 'PvP leaderboard not found for this season-bracket combination (404)',
        });
        return;
      }
    }

    this.logger.error({
      logTag,
      seasonId,
      bracket,
      message: 'Error fetching PvP leaderboard',
      error,
    });
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async indexMythicPlusLadder(): Promise<void> {
    const logTag = this.indexMythicPlusLadder.name;
    try {
      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_BLIZZARD);
      const { dungeons, seasons } = await this.fetchMythicPlusMetadata(config);

      const mythicPlusDungeons = this.buildDungeonMap(dungeons);
      const mythicPlusExpansionWeeks = await this.fetchExpansionWeeks(seasons, config);

      const realmsEntity = await this.fetchValidRealms();

      await this.processMythicPlusLeaderboardsWithRxJS(
        realmsEntity,
        mythicPlusDungeons,
        mythicPlusExpansionWeeks,
        logTag,
        config,
      );

      this.logger.log({
        logTag,
        message: 'M+ ladder indexing completed successfully',
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  private async fetchMythicPlusMetadata(config: IBattleNetClientConfig): Promise<{
    dungeons: Array<{ id: number; name: string }>;
    seasons: Array<{ id: number }>;
  }> {
    const [dungeonResponse, seasonResponse] = await Promise.all([
      this.battleNetService.query<IMythicKeystoneDungeonResponse>(
        '/data/wow/mythic-keystone/dungeon/index',
        {
          namespace: BattleNetNamespace.DYNAMIC,
          locale: 'en_GB',
        },
        config,
      ),
      this.battleNetService.query<IMythicKeystoneSeasonResponse>(
        '/data/wow/mythic-keystone/season/index',
        {
          namespace: BattleNetNamespace.DYNAMIC,
          locale: 'en_GB',
        },
        config,
      ),
    ]);

    validateMythicKeystoneDungeonResponse(dungeonResponse);
    validateMythicKeystoneSeasonResponse(seasonResponse);

    return {
      dungeons: dungeonResponse.dungeons,
      seasons: seasonResponse.seasons,
    };
  }

  private buildDungeonMap(dungeons: Array<{ id: number; name: string }>): Map<number, string> {
    const dungeonMap = new Map<number, string>();
    dungeons.forEach((dungeon) => dungeonMap.set(dungeon.id, dungeon.name));
    return dungeonMap;
  }

  private async fetchExpansionWeeks(
    seasons: Array<{ id: number }>,
    config: IBattleNetClientConfig,
  ): Promise<Set<number>> {
    const expansionWeeks = new Set<number>();

    for (const season of seasons) {
      try {
        const seasonDetailResponse = await this.battleNetService.query<IMythicKeystoneSeasonDetail>(
          `/data/wow/mythic-keystone/season/${season.id}`,
          { namespace: BattleNetNamespace.DYNAMIC, locale: 'en_GB' },
          config,
        );

        validateMythicKeystoneSeasonDetail(seasonDetailResponse);

        seasonDetailResponse.periods.forEach((period) => expansionWeeks.add(period.id));
      } catch (error) {
        this.logger.warn({
          message: `Failed to fetch season details for season ${season.id}`,
          error,
        });
      }
    }

    return expansionWeeks;
  }

  private async fetchValidRealms(): Promise<RealmsEntity[]> {
    return this.realmsRepository
      .createQueryBuilder('realms')
      .distinctOn(['realms.connectedRealmId'])
      .where('realms.connectedRealmId != :connectedRealmId', {
        connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
      })
      .getMany();
  }

  private async processMythicPlusLeaderboardsWithRxJS(
    realmsEntity: RealmsEntity[],
    mythicPlusDungeons: Map<number, string>,
    mythicPlusExpansionWeeks: Set<number>,
    logTag: string,
    config: IBattleNetClientConfig,
  ): Promise<void> {
    const leaderboardRequests = this.buildLeaderboardRequests(
      realmsEntity,
      mythicPlusDungeons,
      mythicPlusExpansionWeeks,
    );

    const totalRequests = leaderboardRequests.length;
    let processedCount = 0;

    await lastValueFrom(
      from(leaderboardRequests).pipe(
        mergeMap(async (request) => {
          processedCount++;
          return this.processLeaderboardRequest(request, logTag, processedCount, totalRequests, config);
        }, M_PLUS_PARALLEL_REQUESTS),
        toArray(),
        catchError((error) => {
          this.logger.error({
            logTag,
            message: 'Error during RxJS processing',
            error,
          });
          return of([]);
        }),
      ),
    );
  }

  private async processLeaderboardRequest(
    request: ILeaderboardRequest,
    logTag: string,
    processedCount: number,
    totalRequests: number,
    config: IBattleNetClientConfig,
  ): Promise<{ success?: boolean; skipped?: boolean; error?: boolean }> {
    try {
      const cacheKey = this.buildRealmDungeonCacheKey(request.connectedRealmId, request.dungeonId);

      const isCached = await this.redisService.exists(cacheKey);
      if (isCached) {
        this.logger.debug({
          logTag,
          connectedRealmId: request.connectedRealmId,
          dungeonId: request.dungeonId,
          message: 'Skipping cached realm-dungeon combination',
        });
        return { skipped: true };
      }

      const leadingGroups = await this.fetchLeaderboardGroups(
        request.connectedRealmId,
        request.dungeonId,
        request.period,
        config,
      );

      if (leadingGroups.length === 0) {
        await this.markRealmDungeonAsProcessed(request.connectedRealmId, request.dungeonId);
        return { skipped: true };
      }

      await this.processLeaderboardGroups(
        leadingGroups,
        request.connectedRealmId,
        request.dungeonId,
        request.period,
        logTag,
      );

      await this.markRealmDungeonAsProcessed(request.connectedRealmId, request.dungeonId);

      if (processedCount % 10 === 0) {
        this.logger.debug({
          logTag,
          progress: `${processedCount}/${totalRequests}`,
        });
      }

      return { success: true };
    } catch (error) {
      const is404Error = error instanceof Error && error.message.includes('404');

      if (is404Error) {
        await this.markRealmDungeonAsProcessed(request.connectedRealmId, request.dungeonId);
        this.logger.debug({
          logTag,
          connectedRealmId: request.connectedRealmId,
          dungeonId: request.dungeonId,
          period: request.period,
          message: 'Leaderboard not found for this realm-dungeon combination (404), continuing with other requests',
        });
        return { skipped: true };
      }

      this.handleLeaderboardError(error, request.connectedRealmId, request.dungeonId, request.period, logTag);
      return { error: true };
    }
  }

  private buildLeaderboardRequests(
    realmsEntity: RealmsEntity[],
    mythicPlusDungeons: Map<number, string>,
    mythicPlusExpansionWeeks: Set<number>,
  ): ILeaderboardRequest[] {
    const requests: ILeaderboardRequest[] = [];

    for (const { connectedRealmId } of realmsEntity) {
      for (const dungeonId of mythicPlusDungeons.keys()) {
        for (const period of mythicPlusExpansionWeeks.values()) {
          requests.push({
            connectedRealmId,
            dungeonId,
            period,
          });
        }
      }
    }

    return requests;
  }

  private buildRealmDungeonCacheKey(connectedRealmId: number, dungeonId: number): string {
    return `${M_PLUS_REALM_DUNGEON_PREFIX}${connectedRealmId}:${dungeonId}`;
  }

  private async markRealmDungeonAsProcessed(connectedRealmId: number, dungeonId: number): Promise<void> {
    const cacheKey = this.buildRealmDungeonCacheKey(connectedRealmId, dungeonId);
    await this.redisService.setex(
      cacheKey,
      TIME_MS.ONE_WEEK / 1000,
      JSON.stringify({
        processedAt: new Date().toISOString(),
        connectedRealmId,
        dungeonId,
      }),
    );
  }

  private async fetchLeaderboardGroups(
    connectedRealmId: number,
    dungeonId: number,
    period: number,
    config: IBattleNetClientConfig,
  ): Promise<MythicLeaderboardGroup[]> {
    const response = await this.battleNetService.query<IMythicLeaderboardResponse>(
      `/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`,
      { namespace: BattleNetNamespace.DYNAMIC, locale: 'en_GB' },
      config,
    );

    validateMythicLeaderboardResponse(response);
    return response.leading_groups;
  }

  private async processLeaderboardGroups(
    leadingGroups: MythicLeaderboardGroup[],
    connectedRealmId: number,
    dungeonId: number,
    period: number,
    logTag: string,
  ): Promise<void> {
    for (const group of leadingGroups) {
      const characterJobMembers = this.mapGroupMembersToCharacterJobs(group);

      if (characterJobMembers.length === 0) {
        continue;
      }

      await this.queueCharacters.addBulk(characterJobMembers);

      this.logger.log({
        logTag,
        connectedRealmId,
        dungeonId,
        period,
        groupRanking: group.ranking,
        characterCount: characterJobMembers.length,
        message:
          `Processed M+ ladder: Realm ${connectedRealmId}, Dungeon ${dungeonId}, Week ${period}, ` +
          `Group ${group.ranking}, Characters: ${characterJobMembers.length}`,
      });
    }
  }

  private mapGroupMembersToCharacterJobs(group: MythicLeaderboardGroup): CharacterMessageDto[] {
    return group.members.map((member) =>
      CharacterMessageDto.fromMythicPlusLadder({
        id: member.profile.id,
        name: member.profile.name,
        realm: member.profile.realm.slug,
        faction: transformFaction(member.faction),
      }),
    );
  }

  private handleLeaderboardError(
    error: unknown,
    connectedRealmId: number,
    dungeonId: number,
    period: number,
    logTag: string,
  ): void {
    this.logger.debug({
      logTag,
      connectedRealmId,
      dungeonId,
      period,
      message: 'Skipping leaderboard due to error',
      error,
    });
  }
}
