import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
  CharactersGuildsMembersEntity,
  GuildsEntity,
  KeysEntity,
  RealmsEntity,
} from '@app/pg';

import { In, Repository } from 'typeorm';

import {
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildIdDto,
  GuildMessageDto,
  guildsQueue,
  toGuid,
  findRealm,
  IGuildMessageBase,
} from '@app/resources';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class GuildOsintService {
  private readonly logger = new Logger(GuildOsintService.name, {
    timestamp: true,
  });
  private readonly clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly charactersGuildMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly logsRepository: Repository<CharactersGuildsLogsEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuild: Queue<IGuildMessageBase>,
  ) {}

  private async requestGuildFromQueue(params: {
    name: string;
    realm: string;
    guid: string;
    logTag: string;
  }): Promise<GuildsEntity | null> {
    let requestedGuild: GuildsEntity | null = null;

    try {
      const [keyEntity] = await getKeys(
        this.keysRepository,
        this.clearance,
        true,
      );

      const guildMessage = GuildMessageDto.fromGuildRequest({
        name: params.name,
        realm: params.realm,
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
      });

      const job = await this.queueGuild.add(
        guildMessage.name,
        guildMessage.data,
        guildMessage.opts,
      );

      // @todo
      requestedGuild = await job.waitUntilFinished(undefined, 60000);
    } catch (errorOrException) {
      this.logger.warn({
        logTag: params.logTag,
        guildGuid: params.guid,
        message: `Guild request timed out or failed for ${params.guid}`,
        error: errorOrException?.message,
      });
    }

    return requestedGuild;
  }

  private async buildMembersFromGuildMemberships(
    guildMemberships: CharactersGuildsMembersEntity[],
  ): Promise<CharactersEntity[]> {
    const characterGuids = guildMemberships.map((m) => m.characterGuid);
    const characters =
      characterGuids.length > 0
        ? await this.charactersRepository.find({
            where: { guid: In(characterGuids) },
          })
        : [];

    const characterMap = new Map(characters.map((c) => [c.guid, c]));

    return guildMemberships.map((membership) => {
      const character = characterMap.get(membership.characterGuid);
      return {
        ...character,
        guildRank: membership.rank,
        guildGuid: membership.guildGuid,
      };
    });
  }

  async getGuild(input: GuildIdDto) {
    const logTag = 'getGuild';
    try {
      this.logger.log({
        logTag,
        guildGuid: input.guid,
        message: `Fetching guild: ${input.guid}`,
      });
      const decodedGuid = decodeURIComponent(input.guid);
      const [nameSlug, realmSlug] = decodedGuid.split('@');

      if (!realmSlug) {
        throw new BadRequestException(
          `Invalid guild GUID format: ${input.guid}. Expected format: name@realm`,
        );
      }

      const realmEntity = await findRealm(this.realmsRepository, realmSlug);

      if (!realmEntity) {
        throw new BadRequestException(
          `Realm: ${realmSlug} for guild ${input.guid} not found!`,
        );
      }

      const guid = toGuid(nameSlug, realmEntity.slug);

      let guild = await this.guildsRepository.findOneBy({ guid });

      if (!guild) {
        guild = await this.requestGuildFromQueue({
          name: nameSlug,
          realm: realmEntity.slug,
          guid,
          logTag,
        });
      }

      if (!guild) {
        this.logger.warn({
          logTag,
          guildGuid: guid,
          message: `Guild not found but queued for indexing: ${guid}`,
        });

        throw new NotFoundException(
          `Guild: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
        );
      }

      const updatedAt = guild.updatedAt?.getTime?.();
      const isStale =
        typeof updatedAt === 'number'
          ? Date.now() - updatedAt > 1000 * 60 * 60 * 48
          : false;

      if (isStale) {
        const [keyEntity] = await getKeys(
          this.keysRepository,
          this.clearance,
          true,
        );
        const dto = GuildMessageDto.fromGuildRequest({
          name: nameSlug,
          realm: realmEntity.slug,
          clientId: keyEntity.client,
          clientSecret: keyEntity.secret,
          accessToken: keyEntity.token,
        });

        await this.queueGuild.add(dto.name, dto.data, dto.opts);

        this.logger.log({
          logTag,
          guildGuid: guid,
          message: `Guild is stale; queued for refresh: ${guid}`,
        });
      }

      const guildMemberships = await this.charactersGuildMembersRepository.find(
        {
          where: { guildGuid: guid },
          take: 1_000,
        },
      );

      let members: CharactersEntity[];

      if (!guildMemberships.length) {
        members = await this.charactersRepository.find({
          where: { guildGuid: guid },
          take: 1_000,
        });
      } else {
        members = await this.buildMembersFromGuildMemberships(guildMemberships);
      }

      this.logger.log({
        logTag,
        guildGuid: guid,
        memberCount: members.length,
        message: `Successfully fetched guild: ${guid} with ${members.length} members`,
      });

      return {
        guild,
        members,
        memberCount: members.length,
      };
    } catch (errorOrException) {
      if (
        errorOrException instanceof BadRequestException ||
        errorOrException instanceof NotFoundException
      ) {
        throw errorOrException;
      }

      this.logger.error({
        logTag,
        guildGuid: input.guid,
        errorOrException,
        message: `Error fetching guild: ${input.guid}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching guild data for ${input.guid}`,
      );
    }
  }

  async getGuildLogs(input: GuildIdDto) {
    const logTag = 'getGuildLogs';
    try {
      this.logger.log({
        logTag,
        guildGuid: input.guid,
        message: `Fetching logs for guild: ${input.guid}`,
      });

      const logs = await this.logsRepository.find({
        where: {
          guildGuid: input.guid,
        },
        take: 250,
        order: { createdAt: 'DESC' },
      });

      this.logger.log({
        logTag,
        guildGuid: input.guid,
        logCount: logs.length,
        message: `Found ${logs.length} logs for guild: ${input.guid}`,
      });
      return logs;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        guildGuid: input.guid,
        errorOrException,
        message: `Error fetching guild logs: ${input.guid}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching logs for guild ${input.guid}`,
      );
    }
  }
}
