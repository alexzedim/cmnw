import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';

import {
  getRandomProxy,
  GuildJobQueue,
  guildsQueue,
  GUILD_WORKER_CONSTANTS,
  isEuRegion,
  toSlug,
} from '@app/resources';
import { KeysEntity } from '@app/pg';
import { coreConfig } from '@app/configuration';

import {
  GuildService,
  GuildSummaryService,
  GuildRosterService,
  GuildMemberService,
  GuildLogService,
  GuildMasterService,
} from '../services';

@Processor(guildsQueue.name, guildsQueue.workerOptions)
@Injectable()
export class GuildsWorker extends WorkerHost {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly guildService: GuildService,
    private readonly guildSummaryService: GuildSummaryService,
    private readonly guildRosterService: GuildRosterService,
    private readonly guildMemberService: GuildMemberService,
    private readonly guildLogService: GuildLogService,
    private readonly guildMasterService: GuildMasterService,
  ) {
    super();
  }

  public async process(job: Job<GuildJobQueue, number>): Promise<number> {
    try {
      const { data: args } = job;

      // Step 1: Find or create guild entity
      const { guildEntity, isNew, isNotReadyToUpdate, isCreateOnlyUnique } =
        await this.guildService.findOrCreate(args);

      if (isNotReadyToUpdate) {
        await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);
        this.logger.warn(`Not ready to update: ${guildEntity.guid}`);
        return guildEntity.statusCode;
      }

      if (isCreateOnlyUnique) {
        await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);
        this.logger.warn(`Create only unique: ${guildEntity.guid}`);
        return guildEntity.statusCode;
      }

      // Step 2: Create snapshot for comparison
      const guildSnapshot = this.guildService.createSnapshot(guildEntity);
      const nameSlug = toSlug(guildEntity.name);

      // Step 3: Check region
      const isNotEuRegion = !isEuRegion(args.region);
      if (isNotEuRegion) {
        this.logger.log('Not EU region');
        await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);
        return GUILD_WORKER_CONSTANTS.NOT_EU_REGION_STATUS_CODE;
      }

      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.INITIAL);

      // Step 4: Initialize Blizzard API client
      this.BNet = new BlizzAPI({
        region: args.region || 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        httpsAgent: coreConfig.useProxy
          ? await getRandomProxy(this.keysRepository)
          : undefined,
      });

      if (args.updatedBy) {
        guildEntity.updatedBy = args.updatedBy;
      }
      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_AUTH);

      // Step 5: Fetch guild summary from API
      const summary = await this.guildSummaryService.getSummary(
        nameSlug,
        guildEntity.realm,
        this.BNet,
      );
      Object.assign(guildEntity, summary);
      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_SUMMARY);

      // Step 6: Fetch and process guild roster
      const roster = await this.guildRosterService.fetchRoster(guildEntity, this.BNet);
      roster.updatedAt = guildEntity.updatedAt;
      await this.guildMemberService.updateRoster(guildSnapshot, roster, isNew);
      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_ROSTER);

      // Step 7: Detect and log changes
      if (isNew) {
        const guildById = await this.guildService.findById(
          guildSnapshot.id,
          guildSnapshot.realm,
        );
        if (guildById) {
          await this.guildLogService.detectAndLogChanges(guildById, guildEntity);
          await this.guildMasterService.detectAndLogGuildMasterChange(guildById, roster);
        }
      } else {
        await this.guildLogService.detectAndLogChanges(guildSnapshot, guildEntity);
        await this.guildMasterService.detectAndLogGuildMasterChange(guildSnapshot, roster);
      }

      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.AFTER_DIFF);

      // Step 8: Save guild entity
      await this.guildService.save(guildEntity);

      await job.updateProgress(GUILD_WORKER_CONSTANTS.PROGRESS.COMPLETE);

      this.logger.log(`${guildSnapshot.statusCode} >> guild: ${guildSnapshot.guid}`);

      return guildEntity.statusCode;
    } catch (errorOrException) {
      await job.log(errorOrException);

      this.logger.error({
        logTag: 'GuildsWorker',
        guid: `${job.data.name}@${job.data.realm}`,
        error: errorOrException,
      });

      return GUILD_WORKER_CONSTANTS.ERROR_STATUS_CODE;
    }
  }
}
