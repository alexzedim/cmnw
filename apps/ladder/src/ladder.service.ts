import { Cron, CronExpression } from '@nestjs/schedule';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import {
  BadGatewayException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { from, mergeMap, toArray, catchError, of, lastValueFrom } from 'rxjs';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  BRACKETS,
  CharacterMessageDto,
  charactersQueue,
  delay,
  FACTION,
  IMythicKeystoneSeasonResponse,
  IMythicKeystoneSeasonDetail,
  getKeys,
  GLOBAL_OSINT_KEY,
  IMythicKeystoneDungeonResponse,
  isMythicKeystoneDungeonResponse,
  isMythicKeystoneSeasonResponse,
  isMythicKeystoneSeasonDetail,
  IMythicLeaderboardResponse,
  isMythicLeaderboardResponse,
  MythicLeaderboardGroup,
  transformFaction,
  AdaptiveRateLimiter,
  TIME_MS,
  REALM_ENTITY_ANY,
  M_PLUS_REALM_DUNGEON_PREFIX,
  M_PLUS_REALM_PREFIX,
  ILeaderboardRequest,
  IPvPSeasonIndexResponse,
  isPvPSeasonIndexResponse,
} from '@app/resources';
import { RabbitMQPublisherService } from '@app/rabbitmq';

// Constants for M+ indexing
/** Initial delay for rate limiter in milliseconds (2 seconds) */
const M_PLUS_BASE_DELAY_MS = TIME_MS.FIVE_MINUTES / 150; // ~2 seconds
/** Maximum delay for rate limiter in milliseconds (30 seconds) */
const M_PLUS_MAX_DELAY_MS = TIME_MS.ONE_MINUTE / 2; // ~30 seconds
const M_PLUS_PARALLEL_REQUESTS = 3; // Number of parallel mergeMap requests

@Injectable()
export class LadderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LadderService.name, { timestamp: true });

  private BNet: BlizzAPI;
  private rateLimiter: AdaptiveRateLimiter;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    private readonly publisher: RabbitMQPublisherService,
  ) {
    this.rateLimiter = new AdaptiveRateLimiter(
      M_PLUS_BASE_DELAY_MS,
      M_PLUS_MAX_DELAY_MS,
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexMythicPlusLadder(GLOBAL_OSINT_KEY);
    await this.indexPvPLadder(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async indexPvPLadder(
    clearance: string = GLOBAL_OSINT_KEY,
  ): Promise<void> {
    const logTag = this.indexPvPLadder.name;
    try {
      const keys = await getKeys(this.keysRepository, clearance, true, false);
      const [key] = keys;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const pvpSeasonIndex = await this.BNet.query<IPvPSeasonIndexResponse>(
        '/data/wow/pvp-season/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      );

      this.validatePvPSeasonIndexResponse(pvpSeasonIndex);

      for (const season of pvpSeasonIndex.seasons) {
        const isOnlyLast =
          onlyLast && season.id !== pvpSeasonIndex.seasons[pvpSeasonIndex.seasons.length - 1].id;
        if (isOnlyLast) continue;

        for (const bracket of BRACKETS) {
          await delay(2);

          const rr = await this.BNet.query<any>(
            `/data/wow/pvp-season/${season.id}/pvp-leaderboard/${bracket}`,
            apiConstParams(API_HEADERS_ENUM.DYNAMIC),
          );

          console.log(rr);

          const characterJobs = rr.entries.map((player) => {
            return CharacterMessageDto.fromPvPLadder({
              name: player.character.name,
              realm: player.character.realm.slug,
              faction: player.faction.type === 'HORDE' ? FACTION.H : FACTION.A,
              // rank: player.rank,
              clientId: key.client,
              clientSecret: key.secret,
              accessToken: key.token,
            });
          });

          await this.publisher.publishBulk(charactersQueue.exchange, characterJobs);

          this.logger.log({
            logTag,
            seasonId: season.id,
            bracket,
            playerCount: characterJobs.length,
            message: `Processed PvP ladder: Season ${season.id}, Bracket ${bracket}, Players: ${characterJobs.length}`,
          });
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async indexMythicPlusLadder(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    const logTag = this.indexMythicPlusLadder.name;
    try {
      const keys = await getKeys(this.keysRepository, clearance, true);
      const [key] = keys;

      this.initializeBlizzAPI(key);

      // Fetch metadata in parallel
      const { dungeons, seasons } = await this.fetchMythicPlusMetadata();

      // Build lookup maps
      const mythicPlusDungeons = this.buildDungeonMap(dungeons);
      const mythicPlusExpansionWeeks = await this.fetchExpansionWeeks(
        seasons,
      );

      // Fetch realms
      const realmsEntity = await this.fetchValidRealms();

      // Process leaderboards with RxJS parallel requests and Redis caching
      await this.processMythicPlusLeaderboardsWithRxJS(
        realmsEntity,
        mythicPlusDungeons,
        mythicPlusExpansionWeeks,
        key,
        logTag,
      );

      this.logger.log({
        logTag,
        message: 'M+ ladder indexing completed successfully',
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  /**
   * Initialize Blizzard API client with credentials
   */
  private initializeBlizzAPI(key: KeysEntity): void {
    this.BNet = new BlizzAPI({
      region: 'eu',
      clientId: key.client,
      clientSecret: key.secret,
      accessToken: key.token,
    });
  }

  /**
   * Fetch dungeon and season metadata in parallel
   */
  private async fetchMythicPlusMetadata(): Promise<{
    dungeons: Array<{ id: number; name: string }>;
    seasons: Array<{ id: number }>;
  }> {
    const [dungeonResponse, seasonResponse] = await Promise.all([
      this.BNet.query<IMythicKeystoneDungeonResponse>(
        '/data/wow/mythic-keystone/dungeon/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      ),
      this.BNet.query<IMythicKeystoneSeasonResponse>(
        '/data/wow/mythic-keystone/season/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      ),
    ]);

    this.validateMythicKeystoneDungeonResponse(dungeonResponse);
    this.validateMythicKeystoneSeasonResponse(seasonResponse);

    return {
      dungeons: dungeonResponse.dungeons,
      seasons: seasonResponse.seasons,
    };
  }

  /**
   * Build a map of dungeon IDs to names for O(1) lookup
   */
  private buildDungeonMap(
    dungeons: Array<{ id: number; name: string }>,
  ): Map<number, string> {
    const dungeonMap = new Map<number, string>();
    dungeons.forEach((dungeon) => dungeonMap.set(dungeon.id, dungeon.name));
    return dungeonMap;
  }

  /**
   * Fetch all expansion weeks across all seasons
   */
  private async fetchExpansionWeeks(
    seasons: Array<{ id: number }>,
  ): Promise<Set<number>> {
    const expansionWeeks = new Set<number>();

    for (const season of seasons) {
      try {
        const seasonDetailResponse =
          await this.BNet.query<IMythicKeystoneSeasonDetail>(
            `/data/wow/mythic-keystone/season/${season.id}`,
            apiConstParams(API_HEADERS_ENUM.DYNAMIC),
          );

        this.validateMythicKeystoneSeasonDetail(seasonDetailResponse);

        seasonDetailResponse.periods.forEach((period) =>
          expansionWeeks.add(period.id),
        );
      } catch (error) {
        this.logger.warn({
          message: `Failed to fetch season details for season ${season.id}`,
          error,
        });
      }
    }

    return expansionWeeks;
  }

  /**
   * Fetch valid realms excluding the default realm (ID: 1)
   */
  private async fetchValidRealms(): Promise<RealmsEntity[]> {
    return this.realmsRepository
      .createQueryBuilder('realms')
      .distinctOn(['realms.connectedRealmId'])
      .where('realms.connectedRealmId != :connectedRealmId', {
        connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
      })
      .getMany();
  }

  /**
   * Process M+ leaderboards using RxJS mergeMap for parallel requests with Redis caching
   */
  private async processMythicPlusLeaderboardsWithRxJS(
    realmsEntity: RealmsEntity[],
    mythicPlusDungeons: Map<number, string>,
    mythicPlusExpansionWeeks: Set<number>,
    key: KeysEntity,
    logTag: string,
  ): Promise<void> {
    // Build array of leaderboard requests
    const leaderboardRequests = this.buildLeaderboardRequests(
      realmsEntity,
      mythicPlusDungeons,
      mythicPlusExpansionWeeks,
    );

    const totalRequests = leaderboardRequests.length;
    let processedCount = 0;

    // Use RxJS to process requests in parallel with mergeMap
    await lastValueFrom(from(leaderboardRequests)
      .pipe(
        mergeMap(
          async (request) => {
            processedCount++;
            return this.processLeaderboardRequest(
              request,
              key,
              logTag,
              processedCount,
              totalRequests,
            );
          },
          M_PLUS_PARALLEL_REQUESTS, // Concurrency limit
        ),
        toArray(), // Collect all results
        catchError((error) => {
          this.logger.error({
            logTag,
            message: 'Error during RxJS processing',
            error,
          });
          return of([]);
        }),
      ));
  }

  /**
   * Process a single leaderboard request with caching and error handling
   */
  private async processLeaderboardRequest(
    request: ILeaderboardRequest,
    key: KeysEntity,
    logTag: string,
    processedCount: number,
    totalRequests: number,
  ): Promise<{ success?: boolean; skipped?: boolean; error?: boolean }> {
    try {
      // Check if this realm-dungeon combination was already processed
      const cacheKey = this.buildRealmDungeonCacheKey(
        request.connectedRealmId,
        request.dungeonId,
      );

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

      await this.rateLimiter.wait();

      const leadingGroups = await this.fetchLeaderboardGroups(
        request.connectedRealmId,
        request.dungeonId,
        request.period,
      );

      if (leadingGroups.length === 0) {
        // Mark as processed even if no groups found
        await this.markRealmDungeonAsProcessed(
          request.connectedRealmId,
          request.dungeonId,
        );
        return { skipped: true };
      }

      await this.processLeaderboardGroups(
        leadingGroups,
        request.connectedRealmId,
        request.dungeonId,
        request.period,
        key,
        logTag,
      );

      // Mark realm-dungeon as processed in Redis
      await this.markRealmDungeonAsProcessed(
        request.connectedRealmId,
        request.dungeonId,
      );

      this.rateLimiter.onSuccess();

      // Log progress periodically
      if (processedCount % 10 === 0) {
        const stats = this.rateLimiter.getStats();
        this.logger.debug({
          logTag,
          progress: `${processedCount}/${totalRequests}`,
          rateLimiterStats: stats,
        });
      }

      return { success: true };
    } catch (error) {
      // Check if this is a 404 error (leaderboard not found for this realm-dungeon combination)
      const is404Error =
        error instanceof Error && error.message.includes('404');

      if (is404Error) {
        // Mark as processed even if not found, and continue with other requests
        await this.markRealmDungeonAsProcessed(
          request.connectedRealmId,
          request.dungeonId,
        );
        this.logger.debug({
          logTag,
          connectedRealmId: request.connectedRealmId,
          dungeonId: request.dungeonId,
          period: request.period,
          message:
            'Leaderboard not found for this realm-dungeon combination (404), continuing with other requests',
        });
        return { skipped: true };
      }

      // Handle other errors
      this.handleLeaderboardError(
        error,
        request.connectedRealmId,
        request.dungeonId,
        request.period,
        logTag,
      );
      return { error: true };
    }
  }

  /**
   * Build array of leaderboard requests from realms, dungeons, and periods
   */
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

  /**
   * Build Redis cache key for realm-dungeon combination
   */
  private buildRealmDungeonCacheKey(
    connectedRealmId: number,
    dungeonId: number,
  ): string {
    return `${M_PLUS_REALM_DUNGEON_PREFIX}${connectedRealmId}:${dungeonId}`;
  }

  /**
   * Mark a realm-dungeon combination as processed in Redis
   */
  private async markRealmDungeonAsProcessed(
    connectedRealmId: number,
    dungeonId: number,
  ): Promise<void> {
    const cacheKey = this.buildRealmDungeonCacheKey(
      connectedRealmId,
      dungeonId,
    );
    await this.redisService.setex(
      cacheKey,
      TIME_MS.ONE_WEEK / 1000, // 7 days in seconds
      JSON.stringify({
        processedAt: new Date().toISOString(),
        connectedRealmId,
        dungeonId,
      }),
    );
  }

  /**
   * Check if a realm was already processed
   */
  private async isRealmProcessed(connectedRealmId: number): Promise<boolean> {
    const cacheKey = `${M_PLUS_REALM_PREFIX}${connectedRealmId}`;
    return (await this.redisService.exists(cacheKey)) > 0;
  }

  /**
   * Mark a realm as processed in Redis
   */
  private async markRealmAsProcessed(connectedRealmId: number): Promise<void> {
    const cacheKey = `${M_PLUS_REALM_PREFIX}${connectedRealmId}`;
    await this.redisService.setex(
      cacheKey,
      TIME_MS.ONE_WEEK / 1000, // 7 days in seconds
      JSON.stringify({
        processedAt: new Date().toISOString(),
        connectedRealmId,
      }),
    );
  }

  /**
   * Process M+ leaderboards for all realms, dungeons, and periods (legacy method)
   * Uses adaptive rate limiting to handle API throttling
   */
  private async processMythicPlusLeaderboards(
    realmsEntity: RealmsEntity[],
    mythicPlusDungeons: Map<number, string>,
    mythicPlusExpansionWeeks: Set<number>,
    key: KeysEntity,
    logTag: string,
  ): Promise<void> {
    const totalIterations =
      realmsEntity.length *
      mythicPlusDungeons.size *
      mythicPlusExpansionWeeks.size;

    let processedCount = 0;

    for (const { connectedRealmId } of realmsEntity) {
      for (const dungeonId of mythicPlusDungeons.keys()) {
        for (const period of mythicPlusExpansionWeeks.values()) {
          processedCount++;

          try {
            await this.rateLimiter.wait();

            const leadingGroups = await this.fetchLeaderboardGroups(
              connectedRealmId,
              dungeonId,
              period,
            );

            if (leadingGroups.length === 0) {
              continue;
            }

            await this.processLeaderboardGroups(
              leadingGroups,
              connectedRealmId,
              dungeonId,
              period,
              key,
              logTag,
            );

            this.rateLimiter.onSuccess();
          } catch (error) {
            this.handleLeaderboardError(
              error,
              connectedRealmId,
              dungeonId,
              period,
              logTag,
            );
          }

          // Log progress periodically
          if (processedCount % 10 === 0) {
            const stats = this.rateLimiter.getStats();
            this.logger.debug({
              logTag,
              progress: `${processedCount}/${totalIterations}`,
              rateLimiterStats: stats,
            });
          }
        }
      }
    }
  }

  /**
   * Fetch leaderboard groups for a specific realm, dungeon, and period
   */
  private async fetchLeaderboardGroups(
    connectedRealmId: number,
    dungeonId: number,
    period: number,
  ): Promise<MythicLeaderboardGroup[]> {
    const response = await this.BNet.query<IMythicLeaderboardResponse>(
      `/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );

    this.validateMythicLeaderboardResponse(response);
    return response.leading_groups;
  }

  /**
   * Process all groups in a leaderboard and publish character jobs
   */
  private async processLeaderboardGroups(
    leadingGroups: MythicLeaderboardGroup[],
    connectedRealmId: number,
    dungeonId: number,
    period: number,
    key: KeysEntity,
    logTag: string,
  ): Promise<void> {
    for (const group of leadingGroups) {
      const characterJobMembers = this.mapGroupMembersToCharacterJobs(
        group,
        key,
      );

      if (characterJobMembers.length === 0) {
        continue;
      }

      await this.publisher.publishBulk(
        charactersQueue.exchange,
        characterJobMembers,
      );

      this.logger.log({
        logTag,
        connectedRealmId,
        dungeonId,
        period,
        groupRanking: group.ranking,
        characterCount: characterJobMembers.length,
        message: `Processed M+ ladder: Realm ${connectedRealmId}, Dungeon ${dungeonId}, Week ${period}, Group ${group.ranking}, Characters: ${characterJobMembers.length}`,
      });
    }
  }

  /**
   * Map group members to character job DTOs
   */
  private mapGroupMembersToCharacterJobs(
    group: MythicLeaderboardGroup,
    key: KeysEntity,
  ): CharacterMessageDto[] {
    return group.members.map((member) =>
      CharacterMessageDto.fromMythicPlusLadder({
        id: member.profile.id,
        name: member.profile.name,
        realm: member.profile.realm.slug,
        faction: transformFaction(member.faction),
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      }),
    );
  }

  /**
   * Handle errors during leaderboard fetching with adaptive rate limiting
   */
  private handleLeaderboardError(
    error: unknown,
    connectedRealmId: number,
    dungeonId: number,
    period: number,
    logTag: string,
  ): void {
    const isRateLimitError =
      error instanceof Error &&
      (error.message.includes('429') || error.message.includes('403'));

    if (isRateLimitError) {
      this.rateLimiter.onRateLimit();
      this.logger.warn({
        logTag,
        connectedRealmId,
        dungeonId,
        period,
        message: 'Rate limit encountered, backing off',
        rateLimiterStats: this.rateLimiter.getStats(),
      });
    } else {
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

  /**
   * Validation methods for API responses
   */
  private validateMythicKeystoneDungeonResponse(
    response: unknown,
  ): asserts response is IMythicKeystoneDungeonResponse {
    if (!isMythicKeystoneDungeonResponse(response)) {
      throw new BadGatewayException('Invalid mythic keystone dungeon response');
    }
  }

  private validateMythicKeystoneSeasonResponse(
    response: unknown,
  ): asserts response is IMythicKeystoneSeasonResponse {
    if (!isMythicKeystoneSeasonResponse(response)) {
      throw new BadGatewayException('Invalid mythic keystone season response');
    }
  }

  private validateMythicKeystoneSeasonDetail(
    response: unknown,
  ): asserts response is IMythicKeystoneSeasonDetail {
    if (!isMythicKeystoneSeasonDetail(response)) {
      throw new BadGatewayException(
        'Invalid mythic keystone season detail response',
      );
    }
  }

  private validateMythicLeaderboardResponse(
    response: unknown,
  ): asserts response is IMythicLeaderboardResponse {
    if (!isMythicLeaderboardResponse(response)) {
      throw new BadGatewayException('Invalid mythic leaderboard response');
    }
  }

  private validatePvPSeasonIndexResponse(
    response: unknown,
  ): asserts response is IPvPSeasonIndexResponse {
    if (!isPvPSeasonIndexResponse(response)) {
      throw new BadGatewayException('Invalid PvP season index response');
    }
  }
}
