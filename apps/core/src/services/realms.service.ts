import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { lastValueFrom, mergeMap, range } from 'rxjs';
import { BattleNetNamespace, BattleNetService } from '@app/battle-net';
import {
  getRandomizedHeaders,
  delay,
  GLOBAL_KEY,
  REALM_ENTITY_ANY,
  realmsQueue,
  IRealmMessageBase,
  RealmMessageDto,
} from '@app/resources';
import { findRealm } from '@app/resources/dao/realms.dao';
import { LoggerService } from '@app/logger';

@Injectable()
export class RealmsService implements OnApplicationBootstrap {
  private readonly logger = new LoggerService(RealmsService.name);

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectQueue(realmsQueue.name)
    private readonly realmsQueue: Queue<IRealmMessageBase>,
    private readonly battleNetService: BattleNetService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.battleNetService.initialize(GLOBAL_KEY);
    await this.init();
    await this.indexRealms();
    await this.getRealmsWarcraftLogsId();
  }

  async init() {
    const anyRealmEntity = this.realmsRepository.create(REALM_ENTITY_ANY);
    await this.realmsRepository.save(anyRealmEntity);
    this.logger.log({ logTag: 'init', message: 'Realm AANNYY was seeded' });
    this.logger.debug({ logTag: 'realms', message: 'wait for 180 seconds' });
    await delay(60 * 3);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexRealms(): Promise<void> {
    const logTag = this.indexRealms.name;
    try {
      await this.realmsQueue.drain(true);

      const config = await this.battleNetService.initialize(GLOBAL_KEY);
      const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, 60_000);
      const { realms: realmList } = await this.battleNetService.query<{
        realms: Array<{ id: number; name: string; slug: string }>;
      }>('/data/wow/realm/index', options, config);

      for (const { id, name, slug } of realmList) {
        this.logger.log({
          logTag,
          realmId: id,
          realmName: name,
          message: `Processing realm: ${id}:${name}`,
        });

        const dto = RealmMessageDto.create({
          id: id,
          name: name,
          slug: slug,
          region: 'eu',
        });

        await this.realmsQueue.add(dto.name, dto.data, {
          priority: 5,
        });
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  /**
   * Index every realm for WCL id, US:0,246 EU:247,517 (RU: 492) Korea: 517
   * @param from
   * @param to
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  private async getRealmsWarcraftLogsId(from = 246, to = 517): Promise<void> {
    if (from < 1) from = 1;
    const count = Math.abs(from - to);
    const logTag = this.getRealmsWarcraftLogsId.name;

    await lastValueFrom(
      range(from, count).pipe(
        mergeMap(async (realmId) => {
          try {
            // Add delay to respect rate limits
            await delay(2);

            const response = await this.httpService.axiosRef.get<string>(
              `https://www.warcraftlogs.com/server/id/${realmId}`,
              {
                headers: getRandomizedHeaders({ type: 'browser' }),
                timeout: 10000,
              },
            );
            const warcraftLogsPage = cheerio.load(response.data);
            const warcraftLogsRealmElement = warcraftLogsPage.html('.server-name');
            const realmName = warcraftLogsPage(warcraftLogsRealmElement).text();
            const realmEntity = await findRealm(this.realmsRepository, realmName);
            if (!realmEntity) {
              throw new NotFoundException(`${realmId}:${realmName} not found!`);
            }

            await this.realmsRepository.update({ id: realmEntity.id }, { warcraftLogsId: realmId });

            this.logger.debug({
              logTag,
              realmId,
              realmName,
              entityId: realmEntity.id,
              message: `getRealmsWarcraftLogsID: ${realmId}:${realmName} | ${realmEntity.id} updated!`,
            });
          } catch (errorOrException) {
            // Skip logging for 403/404 errors to reduce noise
            const isExpectedError = errorOrException?.status === 403 || errorOrException?.status === 404;
            if (!isExpectedError) {
              this.logger.error({
                logTag,
                errorOrException,
                realmId,
                url: `https://www.warcraftlogs.com/server/id/${realmId}`,
              });
            }
          }
        }, 1),
      ),
    );
  }
  // TODO populations & stats
}
