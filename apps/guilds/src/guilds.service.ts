import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { CharactersEntity, GuildHallOfFameEntity, GuildsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  delay,
  FACTION,
  GuildMessageDto,
  guildsQueue,
  HALL_OF_FAME_RAIDS,
  ICommunityHallOfFameEntry,
  ICommunityHallOfFameResponse,
  IGuildMessageBase,
  isCommunityHallOfFame,
  isEuRegion,
  notNull,
  OSINT_GUILD_LIMIT,
  toGuid,
  WOW_COMMUNITY_GRAPHQL_URL,
  WOW_COMMUNITY_HOF_QUERY_HASH,
} from '@app/resources';
import { osintConfig } from '@app/configuration';
import { InjectQueue } from '@nestjs/bullmq';
import { BattleNetService, BATTLE_NET_KEY_TAG_BLIZZARD } from '@app/battle-net';

@Injectable()
export class GuildsService implements OnApplicationBootstrap {
  private offset = 0;
  private readonly logger = new Logger(GuildsService.name, { timestamp: true });

  constructor(
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(GuildHallOfFameEntity)
    private readonly guildHallOfFameRepository: Repository<GuildHallOfFameEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<IGuildMessageBase>,
    private readonly battleNetService: BattleNetService,
    private readonly httpService: HttpService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_BLIZZARD);
    await this.indexGuildCharactersUnique(osintConfig.isIndexGuildsFromCharacters);
    await this.indexHallOfFame(false);
  }

  async indexGuildCharactersUnique(isIndexGuildsFromCharacters: boolean) {
    const logTag = this.indexGuildCharactersUnique.name;

    let uniqueGuildGuidsCount = 0;
    let guildJobsItx = 0;
    let guildJobsSuccessItx = 0;

    try {
      this.logger.log({
        logTag,
        isIndexGuildsFromCharacters,
        message: `Index guilds from characters: ${isIndexGuildsFromCharacters}`,
      });
      if (isIndexGuildsFromCharacters) return;

      const uniqueGuildGuids = await this.charactersRepository
        .createQueryBuilder('characters')
        .select('characters.guild_guid', 'guildGuid')
        .distinct(true)
        .getRawMany<Pick<CharactersEntity, 'guildGuid'>>();

      uniqueGuildGuidsCount = uniqueGuildGuids.length;

      this.logger.log({
        logTag,
        uniqueGuildGuidsCount,
        message: `Found ${uniqueGuildGuidsCount} unique guilds`,
      });

      const guildJobs = uniqueGuildGuids.map((guild) => {
        const [name, realm] = guild.guildGuid.split('@');

        guildJobsItx = guildJobsItx + 1;

        const dto = GuildMessageDto.fromGuildCharactersUnique({
          name,
          realm,
          iteration: guildJobsItx,
        });

        return dto;
      });

      await this.queueGuilds.addBulk(guildJobs);

      this.logger.log({
        logTag,
        guildJobsItx,
        message: `Created ${guildJobsItx} guild jobs`,
      });

      this.logger.log({
        logTag,
        guildJobsSuccessItx,
        guildJobsItx,
        uniqueGuildGuidsCount,
        message:
          `Completed: ${guildJobsSuccessItx} of ${guildJobsItx} guild jobs added ` +
          `from ${uniqueGuildGuidsCount} unique guilds`,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        uniqueGuildGuidsCount,
        guildJobsItx,
        guildJobsSuccessItx,
        errorOrException,
      });
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async indexGuilds(): Promise<void> {
    const logTag = this.indexGuilds.name;
    try {
      let guildIteration = 0;

      const guilds = await this.guildsRepository.find({
        order: { updatedAt: 'ASC' },
        take: OSINT_GUILD_LIMIT,
        skip: this.offset,
      });

      const isRotate = false;
      const guildsCount = await this.guildsRepository.count();
      this.offset = this.offset + (isRotate ? OSINT_GUILD_LIMIT : 0);

      if (this.offset >= guildsCount) {
        this.logger.warn({
          logTag,
          offset: this.offset,
          guildsCount,
          message: `End of guilds reached, resetting offset`,
        });
        this.offset = 0;
      }

      await lastValueFrom(
        from(guilds).pipe(
          mergeMap(async (guild) => {
            guildIteration = guildIteration + 1;

            const dto = GuildMessageDto.fromGuildIndex({
              id: guild.id,
              guid: guild.guid,
              name: guild.name,
              realm: guild.realm,
              iteration: guildIteration,
              ...guild,
            });

            await this.queueGuilds.add(dto.name, dto.data, dto.opts);
          }),
        ),
      );

      this.logger.log(`${logTag}: offset ${this.offset} | ${guilds.length} characters`);
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexHallOfFame(onlyLast = true): Promise<void> {
    const logTag = this.indexHallOfFame.name;

    try {
      const config = await this.battleNetService.initialize(BATTLE_NET_KEY_TAG_BLIZZARD);
      for (const raid of HALL_OF_FAME_RAIDS) {
        const isOnlyLast = onlyLast && raid !== HALL_OF_FAME_RAIDS[HALL_OF_FAME_RAIDS.length - 1];

        if (isOnlyLast) continue;

        await delay(2);

        const { raidName, entries } = await this.fetchHallOfFame(raid);
        if (entries.length === 0) continue;

        await this.saveHallOfFameEntries(raid, raidName, entries);

        const guildJobs = entries
          .map((entry) => {
            const isNotEuRegion = !isEuRegion(entry.region.slug);
            if (isNotEuRegion) {
              return null;
            }

            const realmSlug = this.extractRealmSlug(entry.guild.url);
            if (!realmSlug) {
              return null;
            }

            return GuildMessageDto.fromHallOfFame({
              name: entry.guild.name,
              realm: realmSlug,
              realmId: 0,
              realmName: entry.guild.realm.name,
              faction: entry.faction,
              rank: entry.rank,
              region: 'eu',
              accessToken: config.accessToken,
            });
          })
          .filter(notNull);

        await this.queueGuilds.addBulk(guildJobs);

        this.logger.log(`${logTag}: Raid ${raid} | Guilds ${guildJobs.length}`);
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  private async fetchHallOfFame(
    raidSlug: string,
  ): Promise<{ raidName: string; entries: Array<ICommunityHallOfFameEntry & { faction: string }> }> {
    const logTag = this.fetchHallOfFame.name;

    try {
      const { data } = await this.httpService.axiosRef.post<ICommunityHallOfFameResponse>(
        WOW_COMMUNITY_GRAPHQL_URL,
        {
          operationName: 'GetMythicRaidLeaderboard',
          variables: { leaderboard: { zoneSlug: raidSlug } },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: WOW_COMMUNITY_HOF_QUERY_HASH,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept-language': 'en-US',
          },
        },
      );

      if (!isCommunityHallOfFame(data)) {
        this.logger.warn(`${logTag}: Raid ${raidSlug} | Invalid response`);
        return { raidName: '', entries: [] };
      }

      const lb = data.data.MythicRaidLeaderboard;
      const entries = lb.leaderboards.flatMap((board) =>
        board.entries.map((entry) => ({
          ...entry,
          faction: board.factionEnum === 'HORDE' ? FACTION.H : FACTION.A,
        })),
      );

      return { raidName: lb.raid.name, entries };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        raidSlug,
        error: JSON.stringify(errorOrException),
      });
      return { raidName: '', entries: [] };
    }
  }

  private extractRealmSlug(guildUrl: string): string | null {
    const match = guildUrl.match(/\/guild\/[^/]+\/([^/]+)\//);
    return match ? match[1] : null;
  }

  private async saveHallOfFameEntries(
    raidSlug: string,
    raidName: string,
    entries: Array<ICommunityHallOfFameEntry & { faction: string }>,
  ): Promise<number> {
    const logTag = this.saveHallOfFameEntries.name;

    const euEntries = entries.filter((entry) => isEuRegion(entry.region.slug));

    if (euEntries.length === 0) return 0;

    const rows = euEntries
      .map((entry) => {
        const realmSlug = this.extractRealmSlug(entry.guild.url);
        if (!realmSlug) return null;

        return {
          guildGuid: toGuid(entry.guild.name, realmSlug),
          raidSlug,
          raidName,
          rank: entry.rank,
          faction: entry.faction,
          region: entry.region.slug,
          realmSlug,
          completedAt: new Date(entry.timestamp),
        };
      })
      .filter(notNull);

    if (rows.length === 0) return 0;

    try {
      await this.guildHallOfFameRepository.upsert(rows, {
        conflictPaths: ['guildGuid', 'raidSlug'],
      });
      this.logger.log(`${logTag}: Raid ${raidSlug} | Saved ${rows.length} entries`);
      return rows.length;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        raidSlug,
        error: JSON.stringify(errorOrException),
      });
      return 0;
    }
  }
}
