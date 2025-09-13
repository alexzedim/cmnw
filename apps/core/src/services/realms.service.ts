import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { InjectQueue } from '@nestjs/bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { lastValueFrom, mergeMap, range } from 'rxjs';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  delay,
  findRealm,
  getKeys,
  GLOBAL_KEY,
  OSINT_TIMEOUT_TOLERANCE,
  REALM_ENTITY_ANY,
  RealmJobQueue,
  realmsQueue,
} from '@app/resources';

@Injectable()
export class RealmsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RealmsService.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectQueue(realmsQueue.name)
    private readonly queue: Queue<RealmJobQueue, number>,
  ) {}

  /**
   * Handle AxiosError specifically with detailed error information
   * @param error - The error to handle
   * @param logTag - Context tag for logging
   * @param additionalInfo - Additional context information
   */
  private handleAxiosError(error: unknown, logTag: string, additionalInfo?: Record<string, any>): void {
    if (error instanceof AxiosError) {
      const errorInfo = {
        logTag,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        responseData: error.response?.data,
        code: error.code,
        ...additionalInfo,
      };

      this.logger.error(errorInfo);
    } else {
      // Fallback for non-Axios errors
      this.logger.error({
        logTag,
        error,
        ...additionalInfo,
      });
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.init();
    await this.indexRealms(GLOBAL_KEY);
    await this.getRealmsWarcraftLogsId();
  }

  async init() {
    const anyRealmEntity = this.realmsRepository.create(REALM_ENTITY_ANY);
    await this.realmsRepository.save(anyRealmEntity);
    this.logger.log(`init: Realm AANNYY was seeded`);
    this.logger.debug(`realms: wait for 180 seconds`);
    await delay(60 * 3);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexRealms(clearance: string = GLOBAL_KEY): Promise<void> {
    const logTag =this.indexRealms.name;
    try {
      const [keyEntity] = await getKeys(this.keysRepository, clearance);

      await this.queue.drain(true);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
      });

      const { realms: realmList }: Record<string, any> = await this.BNet.query(
        '/data/wow/realm/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE),
      );

      for (const { id, name, slug } of realmList) {
        this.logger.log(`${id}:${name}`);
        await this.queue.add(
          slug,
          {
            id: id,
            name: name,
            slug: slug,
            region: 'eu',
            clientId: keyEntity.client,
            clientSecret: keyEntity.secret,
            accessToken: keyEntity.token,
          },
          {
            jobId: slug,
          },
        );
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: errorOrException,
        }
      );
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
            const response = await this.httpService.axiosRef.get<string>(
              `https://www.warcraftlogs.com/server/id/${realmId}`,
            );
            const warcraftLogsPage = cheerio.load(response.data);
            const warcraftLogsRealmElement = warcraftLogsPage.html('.server-name');
            const realmName = warcraftLogsPage(warcraftLogsRealmElement).text();
            const realmEntity = await findRealm(this.realmsRepository, realmName);
            if (!realmEntity) {
              throw new NotFoundException(`${realmId}:${realmName} not found!`);
            }

            await this.realmsRepository.update(
              { id: realmEntity.id },
              { warcraftLogsId: realmId },
            );

            this.logger.debug(
              `getRealmsWarcraftLogsID: ${realmId}:${realmName} | ${realmEntity.id} updated!`,
            );
          } catch (errorOrException) {
            this.handleAxiosError(errorOrException, logTag, {
              realmId,
              url: `https://www.warcraftlogs.com/server/id/${realmId}`,
            });
          }
        }, 2),
      ),
    );
  }
  // TODO populations & stats
}
