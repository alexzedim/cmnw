import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  delay,
  FACTION,
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildMessageDto,
  guildsQueue,
  HALL_OF_FAME_RAIDS,
  IHallOfFame,
  isEuRegion,
  isHallOfFame,
  notNull,
  OSINT_GUILD_LIMIT,
  RAID_FACTIONS,
} from '@app/resources';
import { bufferCount, concatMap } from 'rxjs/operators';
import { osintConfig } from '@app/configuration';
import { RabbitMQPublisherService } from '@app/rabbitmq';

@Injectable()
export class GuildsService implements OnApplicationBootstrap {
  private offset = 0;
  private keyEntities: KeysEntity[];
  private BNet: BlizzAPI;
  private readonly logger = new Logger(GuildsService.name, { timestamp: true });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    private readonly rabbitMQPublisherService: RabbitMQPublisherService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexGuildCharactersUnique(
      GLOBAL_OSINT_KEY,
      osintConfig.isIndexGuildsFromCharacters,
    );
    await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
  }

  async indexGuildCharactersUnique(
    clearance: string = GLOBAL_OSINT_KEY,
    isIndexGuildsFromCharacters: boolean,
  ) {
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

      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      const length = this.keyEntities.length;

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
        const { client, secret, token } = this.keyEntities[guildJobsItx % length];

        const [name, realm] = guild.guildGuid.split('@');

        const dto = GuildMessageDto.fromGuildCharactersUnique({
          name,
          realm,
          clientId: client,
          clientSecret: secret,
          accessToken: token,
        });

        guildJobsItx = guildJobsItx + 1;

        return dto;
      });

      this.logger.log({
        logTag,
        guildJobsItx,
        message: `Created ${guildJobsItx} guild jobs`,
      });
      await lastValueFrom(
        from(guildJobs).pipe(
          bufferCount(500),
          concatMap(async (guildJobsBatch) => {
            try {
              await this.rabbitMQPublisherService.publishBulk(
                guildsQueue.exchange,
                guildJobsBatch,
              );
              this.logger.log({
                logTag,
                currentBatch: guildJobsBatch.length,
                totalJobs: guildJobsItx,
                processed: guildJobsSuccessItx,
                message: `Added ${guildJobsBatch.length} guild jobs to queue`,
              });
              guildJobsSuccessItx = guildJobsBatch.length;
            } catch (errorOrException) {
              this.logger.error({
                logTag: 'guildJobsBatch',
                uniqueGuildGuidsCount,
                guildJobsItx,
                guildJobsSuccessItx,
                errorOrException,
                message: 'Error adding guild jobs batch to queue',
              });
            }
          }),
        ),
      );

      this.logger.log({
        logTag,
        guildJobsSuccessItx,
        guildJobsItx,
        uniqueGuildGuidsCount,
        message: `Completed: ${guildJobsSuccessItx} of ${guildJobsItx} guild jobs added from ${uniqueGuildGuidsCount} unique guilds`,
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
  async indexGuilds(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    const logTag = this.indexGuilds.name;
    try {
      let guildIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      let length = this.keyEntities.length;

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
            const { client, secret, token } =
              this.keyEntities[guildIteration % length];

            const dto = GuildMessageDto.fromGuildIndex({
              id: guild.id,
              guid: guild.guid,
              name: guild.name,
              realm: guild.realm,
              iteration: guildIteration,
              clientId: client,
              clientSecret: secret,
              accessToken: token,
              ...guild,
            });

            await this.rabbitMQPublisherService.publishMessage(
              guildsQueue.exchange,
              dto,
            );

            guildIteration = guildIteration + 1;
            const isKeyRequest = guildIteration % 100 == 0;
            if (isKeyRequest) {
              this.keyEntities = await getKeys(this.keysRepository, clearance);
              length = this.keyEntities.length;
            }
          }),
        ),
      );

      this.logger.log(
        `${logTag}: offset ${this.offset} | ${guilds.length} characters`,
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexHallOfFame(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast = true,
  ): Promise<void> {
    const logTag = this.indexHallOfFame.name;

    try {
      this.keyEntities = await getKeys(this.keysRepository, clearance, false);
      const [key] = this.keyEntities;

      const length = this.keyEntities.length;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      for (const raid of HALL_OF_FAME_RAIDS) {
        const isOnlyLast =
          onlyLast && raid !== HALL_OF_FAME_RAIDS[HALL_OF_FAME_RAIDS.length - 1];

        if (isOnlyLast) continue;

        await delay(2);

        for (const raidFaction of RAID_FACTIONS) {
          const response = await this.BNet.query<IHallOfFame>(
            `/data/wow/leaderboard/hall-of-fame/${raid}/${raidFaction}`,
            apiConstParams(API_HEADERS_ENUM.DYNAMIC),
          );

          const isEntries = isHallOfFame(response);
          if (!isEntries) continue;

          const guildJobs = response.entries
            .map((guildEntry, guildIteration) => {
              const { client, secret, token } =
                this.keyEntities[guildIteration % length];

              const faction = raidFaction === 'HORDE' ? FACTION.H : FACTION.A;

              const isNotEuRegion = !isEuRegion(guildEntry.region);
              if (isNotEuRegion) {
                return null;
              }

              return GuildMessageDto.fromHallOfFame({
                id: guildEntry.guild.id,
                name: guildEntry.guild.name,
                realm: guildEntry.guild.realm.slug,
                realmId: guildEntry.guild.realm.id,
                realmName: guildEntry.guild.realm.name,
                faction: faction,
                rank: guildEntry.rank,
                region: 'eu',
                clientId: client,
                clientSecret: secret,
                accessToken: token,
              });
            })
            .filter(notNull);

          await this.rabbitMQPublisherService.publishBulk(
            guildsQueue.exchange,
            guildJobs,
          );

          this.logger.log(
            `${logTag}: Raid ${raid} | Faction ${raidFaction} | Guilds ${guildJobs.length}`,
          );
        }
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: logTag,
        error: JSON.stringify(errorOrException),
      });
    }
  }
}
