import { Injectable, Logger } from '@nestjs/common';
import { Browser, BrowserContext, chromium, devices } from 'playwright';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import cheerio from 'cheerio';
import { forkJoin, lastValueFrom } from 'rxjs';

import {
  formatWorkerLog,
  formatWorkerLogWithDetails,
  formatWorkerErrorLog,
  formatProgressReport,
  formatFinalSummary,
  WorkerLogStatus,
  WorkerStats,
} from '@app/logger';
import {
  CHARACTER_RAID_DIFFICULTY,
  OSINT_SOURCE_RAIDER_IO,
  OSINT_SOURCE_WOW_PROGRESS,
  OSINT_SOURCE_WCL,
  CHARACTER_PROFILE_MAPPING,
  WowProgressProfile,
  WarcraftLogsProfile,
  ICharacterRaiderIo,
  isRaiderIoProfile,
  CHARACTER_PROFILE_RIO_MAPPING,
  RaiderIoCharacterMappingKey,
  capitalize,
  profileQueue,
} from '@app/resources';
import { findRealm } from '@app/resources/dao/realms.dao';

@Injectable()
@Processor(profileQueue.name, profileQueue.workerOptions)
export class ProfileWorker extends WorkerHost {
  private readonly logger = new Logger(ProfileWorker.name, {
    timestamp: true,
  });

  private stats: WorkerStats = {
    total: 0,
    success: 0,
    errors: 0,
    startTime: Date.now(),
  };

  private rioUpdated = 0;
  private wclUpdated = 0;
  private wpUpdated = 0;

  browser: Browser;
  browserContext: BrowserContext;

  constructor(
    private httpService: HttpService,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
  ) {
    super();
  }

  private async browserControl() {
    const isBrowserSession = Boolean(this.browser && this.browserContext);
    if (!isBrowserSession) return;

    await this.browserContext.close();
    await this.browser.close();
  }

  async process(job: any): Promise<void> {
    const args = job.data;
    const startTime = Date.now();
    this.stats.total++;

    try {
      let profileEntity = await this.charactersProfileRepository.findOneBy({
        guid: args.guid,
      });

      if (!profileEntity) {
        profileEntity = this.charactersProfileRepository.create({
          guid: args.guid,
        });
      }

      if (args.lookingForGuild) profileEntity.lfgStatus = args.lookingForGuild;

      const profileUpdates: Promise<void>[] = [];

      if (args.updateRIO) {
        profileUpdates.push(
          this.getRaiderIoProfile(args.name, args.realm).then((raiderIo) => {
            Object.assign(profileEntity, raiderIo);
            this.rioUpdated++;
          }),
        );
      }

      if (args.updateWCL) {
        profileUpdates.push(
          this.getWarcraftLogsProfile(args.name, args.realm).then((warcraftLogs) => {
            Object.assign(profileEntity, warcraftLogs);
            this.wclUpdated++;
          }),
        );
      }

      if (args.updateWP) {
        profileUpdates.push(
          this.getWowProgressProfile(args.name, args.realm).then((wowProgress) => {
            Object.assign(profileEntity, wowProgress);
            this.wpUpdated++;
          }),
        );
      }

      if (profileUpdates.length > 0) {
        await lastValueFrom(forkJoin(profileUpdates));
      }

      await this.charactersProfileRepository.save(profileEntity);

      this.stats.success++;
      const duration = Date.now() - startTime;
      const context =
        `${args.updateRIO ? 'RIO' : ''}${args.updateWCL ? ' WCL' : ''}${args.updateWP ? ' WP' : ''}`.trim();
      this.logger.log(
        formatWorkerLog(WorkerLogStatus.SUCCESS, this.stats.total, args.guid, duration, context || undefined),
      );

      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;

      this.logger.error(formatWorkerErrorLog(this.stats.total, args?.guid, duration, errorOrException.message));

      throw errorOrException;
    }
  }

  private logProgress(): void {
    this.logger.log(formatProgressReport('ProfileWorker', this.stats, 'profiles'));
  }

  public logFinalSummary(): void {
    this.logger.log(formatFinalSummary('ProfileWorker', this.stats, 'profiles'));
  }

  private async getWarcraftLogsProfile(
    name: string,
    realmSlug: string,
    raidDifficulty: 'heroic' | 'mythic' = 'mythic',
  ): Promise<WarcraftLogsProfile> {
    const warcraftLogsProfile = this.charactersProfileRepository.create();
    const guid = `${name}@${realmSlug}`;

    try {
      const isBrowserLaunched = Boolean(this.browser && this.browserContext);
      if (!isBrowserLaunched) {
        this.browser = await chromium.launch();
        this.browserContext = await this.browser.newContext(devices['iPhone 15 Pro Max landscape']);
      }

      const difficulty = CHARACTER_RAID_DIFFICULTY.has(raidDifficulty)
        ? CHARACTER_RAID_DIFFICULTY.get(raidDifficulty)
        : CHARACTER_RAID_DIFFICULTY.get('mythic');

      const page = await this.browserContext.newPage();
      const url = encodeURI(`${OSINT_SOURCE_WCL}/${realmSlug}/${name}#difficulty=${difficulty.wclId}`);

      await page.goto(url);
      const getBestPerfAvg = await page.getByText('Best Perf. Avg').allInnerTexts();
      const [getBestPerfAvgValue] = getBestPerfAvg;

      const [_text, value] = getBestPerfAvgValue.trim().split('\n');

      const isLogsNumberValid = !isNaN(Number(value.trim()));
      if (isLogsNumberValid) {
        warcraftLogsProfile[difficulty.fieldName] = parseFloat(value);
        this.logger.log(
          formatWorkerLogWithDetails(WorkerLogStatus.SUCCESS, this.stats.total, guid, 0, {
            source: 'WCL',
            value: difficulty.fieldName,
          }),
        );
      } else {
        this.logger.warn(
          formatWorkerLog(WorkerLogStatus.WARNING, this.stats.total, guid, 0, 'WCL - No valid logs data found'),
        );
      }

      warcraftLogsProfile.updatedByWarcraftLogs = new Date();

      return warcraftLogsProfile;
    } catch (errorOrException) {
      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, 0, errorOrException.message, 'WCL'));

      return warcraftLogsProfile;
    } finally {
      await this.browserControl();
    }
  }

  private async getWowProgressProfile(name: string, realmSlug: string): Promise<WowProgressProfile> {
    const wowProgressProfile = this.charactersProfileRepository.create();
    const guid = `${name}@${realmSlug}`;

    try {
      const { data } = await this.httpService.axiosRef.get<string>(
        encodeURI(`${OSINT_SOURCE_WOW_PROGRESS}/${realmSlug}/${name}`),
      );

      if (!data) {
        this.logger.warn(formatWorkerLog(WorkerLogStatus.WARNING, this.stats.total, guid, 0, 'WP - No data received'));
        return wowProgressProfile;
      }

      const wowProgressProfilePage = cheerio.load(data);
      const wpHTML = wowProgressProfilePage.html('.language');

      await Promise.allSettled(
        wowProgressProfilePage(wpHTML).map((_index, node) => {
          const characterText = wowProgressProfilePage(node).text();
          const [key, stringValue] = characterText.split(':');
          const isKeyExists = CHARACTER_PROFILE_MAPPING.has(key);
          if (!isKeyExists) return;

          const value = stringValue.trim();

          const fieldValueName = CHARACTER_PROFILE_MAPPING.get(key);
          if (fieldValueName === 'readyToTransfer')
            wowProgressProfile.readyToTransfer = value.includes('ready to transfer');

          if (fieldValueName === 'raidDays' && value) {
            const [from, to] = value.split(' - ');
            const daysFrom = parseInt(from);
            const daysTo = parseInt(to);
            const isNumber = typeof daysFrom === 'number' && typeof daysTo === 'number';
            if (isNumber) wowProgressProfile.raidDays = [daysFrom, daysTo];
          }

          if (fieldValueName === 'languages') {
            wowProgressProfile.languages = value.split(',').map((s) => s.toLowerCase().trim());
          }

          if (fieldValueName === 'battleTag' || fieldValueName === 'playRole') {
            wowProgressProfile[fieldValueName] = value;
          }
        }),
      );

      wowProgressProfile.updatedByWowProgress = new Date();

      const hasData =
        wowProgressProfile.battleTag || wowProgressProfile.playRole || wowProgressProfile.languages?.length > 0;
      if (hasData) {
        this.logger.log(formatWorkerLog(WorkerLogStatus.SUCCESS, this.stats.total, guid, 0, 'WP - Profile updated'));
      } else {
        this.logger.warn(
          formatWorkerLog(WorkerLogStatus.WARNING, this.stats.total, guid, 0, 'WP - No profile data found'),
        );
      }

      return wowProgressProfile;
    } catch (errorOrException) {
      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, 0, errorOrException.message, 'WP'));

      return wowProgressProfile;
    }
  }

  private async getRaiderIoProfile(name: string, realmSlug: string) {
    const rioProfileCharacter = this.charactersProfileRepository.create();
    const guid = `${name}@${realmSlug}`;

    try {
      const { data: raiderIoProfile } = await this.httpService.axiosRef.get<ICharacterRaiderIo>(
        encodeURI(
          `${OSINT_SOURCE_RAIDER_IO}?region=eu&realm=${realmSlug}&name=${name}` +
            `&fields=mythic_plus_scores_by_season:current,raid_progression`,
        ),
      );

      const isRaiderIoProfileValid = isRaiderIoProfile(raiderIoProfile);
      if (!isRaiderIoProfileValid) {
        this.logger.warn(
          formatWorkerLog(WorkerLogStatus.WARNING, this.stats.total, guid, 0, 'RIO - Invalid profile data'),
        );
        return rioProfileCharacter;
      }

      Object.entries(raiderIoProfile).forEach(([key, value]) => {
        const isKeyInProfile = CHARACTER_PROFILE_RIO_MAPPING.has(<RaiderIoCharacterMappingKey>key);

        if (!isKeyInProfile) return;

        const fieldProfile = CHARACTER_PROFILE_RIO_MAPPING.get(<RaiderIoCharacterMappingKey>key);
        rioProfileCharacter[fieldProfile] = fieldProfile === 'gender' ? capitalize(value) : value;
      });

      const realmEntity = await findRealm(this.realmsRepository, raiderIoProfile.realm);
      if (realmEntity) rioProfileCharacter.realmId = realmEntity.id;

      rioProfileCharacter.raidProgress = raiderIoProfile.raid_progression;

      const [season] = raiderIoProfile.mythic_plus_scores_by_season;
      rioProfileCharacter.raiderIoScore = season.scores.all;
      rioProfileCharacter.updatedByRaiderIo = new Date();

      this.logger.log(
        formatWorkerLogWithDetails(WorkerLogStatus.SUCCESS, this.stats.total, guid, 0, {
          source: 'RIO',
          score: season.scores.all,
        }),
      );

      return rioProfileCharacter;
    } catch (errorOrException) {
      this.logger.error(formatWorkerErrorLog(this.stats.total, guid, 0, errorOrException.message, 'RIO'));

      return rioProfileCharacter;
    }
  }
}
