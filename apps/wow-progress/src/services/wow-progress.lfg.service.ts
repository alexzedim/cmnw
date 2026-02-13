import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import chalk from 'chalk';
import { difference, union } from 'lodash';
import { In, Repository } from 'typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import {
  getKeys,
  getRandomElement,
  GLOBAL_OSINT_KEY,
  ICharacterQueueWP,
  LFG_STATUS,
  OSINT_SOURCE,
  OSINT_LFG_WOW_PROGRESS,
  toGuid,
  CharacterMessageDto,
  QueueMessageDto,
  ICharacterMessageBase,
  IProfileMessageBase,
} from '@app/resources';
import { findRealm } from '@app/resources/dao/realms.dao';

@Injectable()
export class WowProgressLfgService {
  private readonly logger = new Logger(WowProgressLfgService.name);

  private stats = {
    charactersRemoved: 0,
    charactersFound: 0,
    charactersNew: 0,
    charactersQueued: 0,
    realmNotFound: 0,
    errors: 0,
    startTime: Date.now(),
  };

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectQueue('osint.characters')
    private readonly charactersQueue: Queue<ICharacterMessageBase>,
    @InjectQueue('osint.profiles')
    private readonly profileQueue: Queue<IProfileMessageBase>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexWowProgressLfg(
    clearance: string = GLOBAL_OSINT_KEY,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.log(chalk.cyan('\n🔍 Starting WoW Progress LFG indexing...'));
      /**
       * Revoke character status from old NOW => to PREV
       */
      const charactersLfgRemoveOld =
        await this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.OLD,
          },
          {
            lfgStatus: null,
          },
        );

      this.stats.charactersRemoved += charactersLfgRemoveOld.affected || 0;
      this.logger.log(
        `${chalk.yellow('⊘')} Removed ${chalk.bold(charactersLfgRemoveOld.affected || 0)} old LFG entries`,
      );

      const [nowUpdatedResult, newUpdatedResult] = await Promise.all([
        this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.NOW,
          },
          {
            lfgStatus: LFG_STATUS.OLD,
          },
        ),
        this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.NEW,
          },
          {
            lfgStatus: LFG_STATUS.OLD,
          },
        ),
      ]);

      this.logger.debug(
        chalk.dim(
          `Revoked status: NOW ${nowUpdatedResult.affected} | NEW ${newUpdatedResult.affected}`,
        ),
      );

      const keysEntity = await getKeys(this.keysRepository, clearance);
      const [firstPageUrl, secondPageUrl] = OSINT_LFG_WOW_PROGRESS;

      const [firstPage, secondPage] = await Promise.all([
        await this.getWowProgressLfg(firstPageUrl),
        await this.getWowProgressLfg(secondPageUrl),
      ]);

      const isCondition = Boolean(firstPage.size && secondPage.size);
      if (!isCondition) {
        this.logger.warn(
          chalk.yellow(
            `⚠ Invalid pages - first: ${firstPage.size}, second: ${secondPage.size}`,
          ),
        );
        return;
      }

      const charactersLfg = new Map([...firstPage, ...secondPage]);
      const charactersLfgNow = union(
        Array.from(firstPage.keys()),
        Array.from(secondPage.keys()),
      );
      /**
       * @description If LFG.OLD not found then write NOW to PREV
       * @description Overwrite LFG status NOW
       */
      this.stats.charactersFound += charactersLfgNow.length;
      this.logger.log(
        `${chalk.green('✓')} Found ${chalk.bold(charactersLfgNow.length)} characters in LFG-${LFG_STATUS.NOW}`,
      );
      const characterProfileLfgOld =
        await this.charactersProfileRepository.findBy({
          lfgStatus: LFG_STATUS.OLD,
        });
      this.logger.log(
        `${chalk.blue('ℹ')} Found ${chalk.bold(characterProfileLfgOld.length)} characters in LFG-${LFG_STATUS.OLD}`,
      );

      const charactersLfgOld = characterProfileLfgOld.map(
        (character) => character.guid,
      );

      const charactersDiffNew = difference(charactersLfgNow, charactersLfgOld);
      const charactersDiffNow = difference(charactersLfgNow, charactersDiffNew);
      const isLfgNewExists = charactersDiffNew.length;

      await this.charactersProfileRepository.update(
        {
          guid: In(charactersDiffNow),
        },
        {
          lfgStatus: LFG_STATUS.NOW,
        },
      );

      this.stats.charactersNew += isLfgNewExists;
      this.logger.log(
        `${chalk.cyan('→')} Processing ${chalk.bold(isLfgNewExists)} new LFG characters`,
      );

      if (!isLfgNewExists) {
        this.logger.log(chalk.blue('ℹ No new characters to process'));
        return;
      }

      const realmsEntity = new Map<string, RealmsEntity>([]);

      const isLfgOldExists = Boolean(characterProfileLfgOld.length);

      const lookingForGuild = isLfgOldExists ? LFG_STATUS.NEW : LFG_STATUS.NOW;

      await lastValueFrom(
        from(charactersDiffNew).pipe(
          mergeMap(async (characterGuid) =>
            this.pushCharacterAndProfileToQueue(
              characterGuid,
              charactersLfg,
              realmsEntity,
              keysEntity,
              lookingForGuild,
            ),
          ),
        ),
      );
      const duration = Date.now() - startTime;
      this.logger.log(
        chalk.green(
          `\n✓ LFG indexing completed in ${chalk.bold(Math.round(duration / 1000))}s`,
        ),
      );
      this.logProgress();
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Error in indexWowProgressLfg:'),
        errorOrException.message,
      );
    }
  }

  private async pushCharacterAndProfileToQueue(
    characterGuid: string,
    charactersLfg: Map<string, ICharacterQueueWP>,
    realmsEntity: Map<string, RealmsEntity>,
    keysEntity: KeysEntity[],
    lookingForGuild: LFG_STATUS,
  ): Promise<void> {
    try {
      const characterQueue = charactersLfg.get(characterGuid);
      const isRealmInStore = realmsEntity.has(characterQueue.realm);

      const realmEntity = isRealmInStore
        ? realmsEntity.get(characterQueue.realm)
        : await findRealm(this.realmsRepository, characterQueue.realm);

      if (!realmEntity) {
        this.stats.realmNotFound++;
        this.logger.warn(
          `${chalk.yellow('⚠')} Realm not found: ${chalk.dim(characterQueue.realm)}`,
        );
        return;
      }

      if (!isRealmInStore) realmsEntity.set(characterQueue.realm, realmEntity);

      const key = getRandomElement(keysEntity);

      const characterMessageDto = CharacterMessageDto.fromWowProgressLfg({
        name: characterQueue.name,
        realm: realmEntity.slug,
        realmId: realmEntity.id,
        realmName: realmEntity.name,
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const profileMessageDto = new QueueMessageDto(
        'osint.profiles.lfg.normal',
        {
          guid: characterQueue.guid,
          name: characterQueue.name,
          realm: realmEntity.slug,
          region: 'eu' as const,
          lookingForGuild,
          updateRIO: true,
          updateWCL: true,
          updateWP: true,
        },
        {
          jobId: characterQueue.guid,
          priority: 1,
        },
      );

      await Promise.allSettled([
        this.profileQueue.add(
          profileMessageDto.name,
          profileMessageDto.data,
          profileMessageDto.opts,
        ),
        this.charactersQueue.add(
          characterMessageDto.name,
          characterMessageDto.data,
          characterMessageDto.opts,
        ),
      ]);

      this.stats.charactersQueued++;
      this.logger.log(
        `${chalk.cyan('→')} Queued ${chalk.dim(characterQueue.guid)}`,
      );
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Error queuing character:'),
        errorOrException.message,
      );
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 WOW PROGRESS LFG SERVICE')}\n` +
        `${chalk.green('  ✓ Characters Found:')} ${chalk.green.bold(this.stats.charactersFound)}\n` +
        `${chalk.cyan('  → Characters New:')} ${chalk.cyan.bold(this.stats.charactersNew)}\n` +
        `${chalk.cyan('  → Characters Queued:')} ${chalk.cyan.bold(this.stats.charactersQueued)}\n` +
        `${chalk.yellow('  ⊘ Characters Removed:')} ${chalk.yellow.bold(this.stats.charactersRemoved)}\n` +
        `${chalk.yellow('  ⚠ Realms Not Found:')} ${chalk.yellow.bold(this.stats.realmNotFound)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Uptime:')} ${chalk.bold(`${hours}h ${minutes}m`)}\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  private async getWowProgressLfg(url: string) {
    const wpCharactersQueue = new Map<string, ICharacterQueueWP>([]);
    try {
      const response = await this.httpService.axiosRef.get(url);

      const wowProgressHTML = cheerio.load(response.data);
      const listingLookingForGuild = wowProgressHTML.html(
        'table.rating tbody tr',
      );

      await Promise.allSettled(
        wowProgressHTML(listingLookingForGuild).map(async (_x, node) => {
          const tableRowElement = wowProgressHTML(node).find('td');
          const [
            preName,
            preGuild,
            preRaid,
            preRealm,
            preItemLevel,
            preTimestamp,
          ] = tableRowElement;

          const name = wowProgressHTML(preName).text().trim();
          const guild = wowProgressHTML(preGuild).text();
          const raid = wowProgressHTML(preRaid).text();
          const [, rawRealm] = wowProgressHTML(preRealm).text().split('-');
          const itemLevel = wowProgressHTML(preItemLevel).text();
          const timestamp = wowProgressHTML(preTimestamp).text();

          const realm = rawRealm.trim();
          const isCharacterValid = Boolean(name && realm);
          if (!isCharacterValid) return;

          const guid = toGuid(name, realm);

          wpCharactersQueue.set(guid, {
            guid,
            name,
            guild,
            raid,
            realm,
            itemLevel,
            timestamp,
          });
        }),
      );

      return wpCharactersQueue;
    } catch (errorOrException) {
      this.stats.errors++;
      this.logger.error(
        chalk.red('✗ Error fetching WP LFG:'),
        errorOrException.message,
        chalk.dim(url),
      );
      return wpCharactersQueue;
    }
  }
}
