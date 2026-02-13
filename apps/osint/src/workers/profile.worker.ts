import { Injectable, Logger } from '@nestjs/common';
import chalk from 'chalk';
import { Browser, BrowserContext, chromium, devices } from 'playwright';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import cheerio from 'cheerio';

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

  private stats = {
    total: 0,
    success: 0,
    errors: 0,
    rioUpdated: 0,
    wclUpdated: 0,
    wpUpdated: 0,
    startTime: Date.now(),
  };

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
    const message = job.data;
    const startTime = Date.now();
    this.stats.total++;

    try {
      const { data: args } = message;

      let profileEntity = await this.charactersProfileRepository.findOneBy({
        guid: args.guid,
      });

      if (!profileEntity) {
        profileEntity = this.charactersProfileRepository.create({
          guid: args.guid,
        });
      }

      if (args.lookingForGuild) profileEntity.lfgStatus = args.lookingForGuild;

      /**
       * update RIO, WCL & Progress
       * by request from args
       */
      if (args.updateRIO) {
        const raiderIo = await this.getRaiderIoProfile(args.name, args.realm);
        Object.assign(profileEntity, raiderIo);
        this.stats.rioUpdated++;
      }

      if (args.updateWCL) {
        const warcraftLogs = await this.getWarcraftLogsProfile(
          args.name,
          args.realm,
        );
        Object.assign(profileEntity, warcraftLogs);
        this.stats.wclUpdated++;
      }

      if (args.updateWP) {
        const wowProgress = await this.getWowProgressProfile(args.name, args.realm);
        Object.assign(profileEntity, wowProgress);
        this.stats.wpUpdated++;
      }

      await this.charactersProfileRepository.save(profileEntity);

      this.stats.success++;
      const duration = Date.now() - startTime;
      this.logger.log(
        `${chalk.green('✓')} [${chalk.bold(this.stats.total)}] ${args.guid} ${chalk.dim(`(${duration}ms)`)} ` +
          `${args.updateRIO ? chalk.blue('RIO') : ''}${args.updateWCL ? chalk.magenta(' WCL') : ''}${args.updateWP ? chalk.cyan(' WP') : ''}`,
      );

      // Progress report every 25 profiles
      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;

      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] ${message.data?.guid} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`,
      );

      throw errorOrException;
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const rate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 PROFILES PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} profiles processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.blue('  RIO Updated:')} ${chalk.blue.bold(this.stats.rioUpdated)}\n` +
        `${chalk.magenta('  WCL Updated:')} ${chalk.magenta.bold(this.stats.wclUpdated)}\n` +
        `${chalk.cyan('  WP Updated:')} ${chalk.cyan.bold(this.stats.wpUpdated)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Rate:')} ${chalk.bold(rate)} profiles/sec\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.cyan.bold('  🎯 PROFILES FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Profiles:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.blue('  RIO Updated:')} ${chalk.blue.bold(this.stats.rioUpdated)}\n` +
        `${chalk.magenta('  WCL Updated:')} ${chalk.magenta.bold(this.stats.wclUpdated)}\n` +
        `${chalk.cyan('  WP Updated:')} ${chalk.cyan.bold(this.stats.wpUpdated)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} profiles/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
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
        this.browserContext = await this.browser.newContext(
          devices['iPhone 15 Pro Max landscape'],
        );
      }

      const difficulty = CHARACTER_RAID_DIFFICULTY.has(raidDifficulty)
        ? CHARACTER_RAID_DIFFICULTY.get(raidDifficulty)
        : CHARACTER_RAID_DIFFICULTY.get('mythic');

      const page = await this.browserContext.newPage();
      const url = encodeURI(
        `${OSINT_SOURCE_WCL}/${realmSlug}/${name}#difficulty=${difficulty.wclId}`,
      );

      await page.goto(url);
      const getBestPerfAvg = await page.getByText('Best Perf. Avg').allInnerTexts();
      const [getBestPerfAvgValue] = getBestPerfAvg;

      const [_text, value] = getBestPerfAvgValue.trim().split('\n');

      const isLogsNumberValid = !isNaN(Number(value.trim()));
      if (isLogsNumberValid) {
        warcraftLogsProfile[difficulty.fieldName] = parseFloat(value);
        this.logger.log(
          `${chalk.magenta('✓ WCL')} ${guid} - ${difficulty.fieldName}: ${chalk.bold(value)}`,
        );
      } else {
        this.logger.warn(
          `${chalk.yellow('⚠ WCL')} ${guid} - No valid logs data found`,
        );
      }

      warcraftLogsProfile.updatedByWarcraftLogs = new Date();

      return warcraftLogsProfile;
    } catch (errorOrException) {
      this.logger.error(
        `${chalk.red('✗ WCL')} ${guid} - ${errorOrException.message}`,
      );

      return warcraftLogsProfile;
    } finally {
      await this.browserControl();
    }
  }

  private async getWowProgressProfile(
    name: string,
    realmSlug: string,
  ): Promise<WowProgressProfile> {
    const wowProgressProfile = this.charactersProfileRepository.create();
    const guid = `${name}@${realmSlug}`;

    try {
      const { data } = await this.httpService.axiosRef.get<string>(
        encodeURI(`${OSINT_SOURCE_WOW_PROGRESS}/${realmSlug}/${name}`),
      );

      if (!data) {
        this.logger.warn(`${chalk.yellow('⚠ WP')} ${guid} - No data received`);
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
            const isNumber =
              typeof daysFrom === 'number' && typeof daysTo === 'number';
            if (isNumber) wowProgressProfile.raidDays = [daysFrom, daysTo];
          }

          if (fieldValueName === 'languages') {
            wowProgressProfile.languages = value
              .split(',')
              .map((s) => s.toLowerCase().trim());
          }

          if (fieldValueName === 'battleTag' || fieldValueName === 'playRole') {
            wowProgressProfile[fieldValueName] = value;
          }
        }),
      );

      wowProgressProfile.updatedByWowProgress = new Date();

      const hasData =
        wowProgressProfile.battleTag ||
        wowProgressProfile.playRole ||
        wowProgressProfile.languages?.length > 0;
      if (hasData) {
        this.logger.log(`${chalk.cyan('✓ WP')} ${guid} - Profile updated`);
      } else {
        this.logger.warn(`${chalk.yellow('⚠ WP')} ${guid} - No profile data found`);
      }

      return wowProgressProfile;
    } catch (errorOrException) {
      this.logger.error(
        `${chalk.red('✗ WP')} ${guid} - ${errorOrException.message}`,
      );

      return wowProgressProfile;
    }
  }

  private async getRaiderIoProfile(name: string, realmSlug: string) {
    const rioProfileCharacter = this.charactersProfileRepository.create();
    const guid = `${name}@${realmSlug}`;

    try {
      const { data: raiderIoProfile } =
        await this.httpService.axiosRef.get<ICharacterRaiderIo>(
          encodeURI(
            `${OSINT_SOURCE_RAIDER_IO}?region=eu&realm=${realmSlug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`,
          ),
        );

      const isRaiderIoProfileValid = isRaiderIoProfile(raiderIoProfile);
      if (!isRaiderIoProfileValid) {
        this.logger.warn(`${chalk.yellow('⚠ RIO')} ${guid} - Invalid profile data`);
        return rioProfileCharacter;
      }

      Object.entries(raiderIoProfile).forEach(([key, value]) => {
        const isKeyInProfile = CHARACTER_PROFILE_RIO_MAPPING.has(
          <RaiderIoCharacterMappingKey>key,
        );

        if (!isKeyInProfile) return;

        const fieldProfile = CHARACTER_PROFILE_RIO_MAPPING.get(
          <RaiderIoCharacterMappingKey>key,
        );
        rioProfileCharacter[fieldProfile] =
          fieldProfile === 'gender' ? capitalize(value) : value;
      });

      const realmEntity = await findRealm(
        this.realmsRepository,
        raiderIoProfile.realm,
      );
      if (realmEntity) rioProfileCharacter.realmId = realmEntity.id;

      rioProfileCharacter.raidProgress = raiderIoProfile.raid_progression;

      const [season] = raiderIoProfile.mythic_plus_scores_by_season;
      rioProfileCharacter.raiderIoScore = season.scores.all;
      rioProfileCharacter.updatedByRaiderIo = new Date();

      this.logger.log(
        `${chalk.blue('✓ RIO')} ${guid} - Score: ${chalk.bold(season.scores.all)}`,
      );

      return rioProfileCharacter;
    } catch (errorOrException) {
      this.logger.error(
        `${chalk.red('✗ RIO')} ${guid} - ${errorOrException.message}`,
      );

      return rioProfileCharacter;
    }
  }
}
