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
} from '@app/resources';
import { RabbitMQPublisherService } from '@app/rabbitmq';

@Injectable()
export class LadderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LadderService.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    private readonly publisher: RabbitMQPublisherService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
    await this.indexMythicPlusLadder(GLOBAL_OSINT_KEY);
    // await this.indexPvPLadder(GLOBAL_OSINT_KEY, false);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async indexPvPLadder(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast = true,
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

      const r = await this.BNet.query<any>(
        '/data/wow/pvp-season/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      );

      for (const season of r.seasons) {
        const isOnlyLast =
          onlyLast && season.id !== r.seasons[r.seasons.length - 1].id;
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

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const mythicPlusDungeons: Map<number, string> = new Map([]);
      const mythicPlusSeasons: Set<number> = new Set();
      const mythicPlusExpansionWeeks: Set<number> = new Set();

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

      if (!isMythicKeystoneDungeonResponse(dungeonResponse)) {
        throw new BadGatewayException('Invalid mythic keystone dungeon response');
      }

      const { dungeons } = dungeonResponse;

      if (!isMythicKeystoneSeasonResponse(seasonResponse)) {
        throw new BadGatewayException('Invalid mythic keystone season response');
      }

      const { seasons } = seasonResponse;
      dungeons.forEach((dungeon) =>
        mythicPlusDungeons.set(dungeon.id, dungeon.name),
      );

      seasons.forEach((season) => mythicPlusSeasons.add(season.id));

      for (const mythicPlusSeason of mythicPlusSeasons.values()) {

        const seasonDetailResponse =
          await this.BNet.query<IMythicKeystoneSeasonDetail>(
            `/data/wow/mythic-keystone/season/${mythicPlusSeason}`,
            apiConstParams(API_HEADERS_ENUM.DYNAMIC),
          );

        if (!isMythicKeystoneSeasonDetail(seasonDetailResponse)) {
          throw new BadGatewayException(
            'Invalid mythic keystone season detail response',
          );
        }
        const { periods } = seasonDetailResponse;
        periods.forEach((period) => mythicPlusExpansionWeeks.add(period.id));
      }

      const realmsEntity = await this.realmsRepository
        .createQueryBuilder('realms')
        .distinctOn(['realms.connectedRealmId'])
        .where('realms.connectedRealmId != :connectedRealmId', {
          connectedRealmId: 1,
        })
        .getMany();

      for (const { connectedRealmId } of realmsEntity) {
        for (const dungeonId of mythicPlusDungeons.keys()) {
          for (const period of mythicPlusExpansionWeeks.values()) {
            let leadingGroups: any;

            try {
              const response = await this.BNet.query<IMythicLeaderboardResponse>(
                `/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`,
                apiConstParams(API_HEADERS_ENUM.DYNAMIC),
              );

              if (!isMythicLeaderboardResponse(response)) {
                throw new BadGatewayException('Invalid mythic leaderboard response');
              }

              leadingGroups = response;
            } catch (error) {
              continue;
            }

            return;

            const isSafe = !leadingGroups || !Array.isArray(leadingGroups);
            if (isSafe) continue;

            for (const group of leadingGroups) {
              const characterJobMembers = group.members.map((member) => {
                return CharacterMessageDto.fromMythicPlusLadder({
                  name: member.profile.name,
                  realm: member.profile.realm.slug,
                  faction: member.faction.type === 'HORDE' ? FACTION.H : FACTION.A,
                  clientId: key.client,
                  clientSecret: key.secret,
                  accessToken: key.token,
                });
              });

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
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }
}
