import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { AxiosError } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { get } from 'lodash';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiResponse,
  IConnectedRealm,
  isFieldNamed,
  OSINT_TIMEOUT_TOLERANCE,
  REALM_TICKER,
  RealmJobQueue,
  realmsQueue,
  toLocale, toSlug,
  transformConnectedRealmId,
  transformNamedField,
} from '@app/resources';

@Processor(realmsQueue.name, realmsQueue.workerOptions)
@Injectable()
export class RealmsWorker extends WorkerHost {
  private readonly logger = new Logger(RealmsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {
    super();
  }

  /**
   * Handle AxiosError specifically with detailed error information
   * @param error - The error to handle
   * @param jobData - Job context data for additional logging
   * @param additionalInfo - Additional context information
   */
  private handleAxiosError(error: unknown, jobData?: RealmJobQueue, additionalInfo?: Record<string, any>): void {
    if (error instanceof AxiosError) {
      const errorInfo = {
        logTag: RealmsWorker.name,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        responseData: error.response?.data,
        code: error.code,
        jobData: jobData ? {
          id: jobData.id,
          name: jobData.name,
          slug: jobData.slug,
          region: jobData.region,
        } : undefined,
        ...additionalInfo,
      };

      this.logger.error(errorInfo);
    } else {
      // Fallback for non-Axios errors
      this.logger.error({
        logTag: RealmsWorker.name,
        error,
        jobData: jobData ? {
          id: jobData.id,
          name: jobData.name,
          slug: jobData.slug,
          region: jobData.region,
        } : undefined,
        ...additionalInfo,
      });
    }
  }

  public async process(job: Job<RealmJobQueue, number>): Promise<void> {
    try {
      const args: RealmJobQueue = { ...job.data };

      await job.updateProgress(1);

      let realmEntity = await this.realmsRepository.findOneBy({ id: args.id });

      await job.updateProgress(5);

      if (!realmEntity) {
        realmEntity = this.realmsRepository.create({
          id: args.id,
        });
      }

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      await job.updateProgress(10);

      const response: Record<string, any> = await this.BNet.query(
        `/data/wow/realm/${args.slug}`,
        apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE),
      );

      await job.updateProgress(20);

      realmEntity.id = get(response, 'id', null);
      realmEntity.slug = get(response, 'slug', null);

      await job.updateProgress(25);

      const name = isFieldNamed(response.name)
        ? get(response, 'name.name', null)
        : response.name;

      if (name) realmEntity.name = name;

      const ticker = REALM_TICKER.has(realmEntity.name)
        ? REALM_TICKER.get(realmEntity.name)
        : null;

      if (ticker) realmEntity.ticker = ticker;

      await job.updateProgress(30);

      realmEntity.locale = response.locale ? response.locale : null;

      if (realmEntity.locale != 'enGB') {
        const realmLocale = await this.BNet.query<BlizzardApiResponse>(
          `/data/wow/realm/${args.slug}`,
          apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE, true),
        );

        await job.updateProgress(40);
        const locale = toLocale(realmEntity.locale);

        const localeName = get(realmLocale, `name.${locale}`, null);
        if (localeName) {
          realmEntity.localeName = localeName;
          realmEntity.localeSlug = toSlug(localeName);
        }
      } else {
        const localeNameSlug = get(response, 'name', null);
        if (localeNameSlug) {
          realmEntity.localeName = localeNameSlug;
          realmEntity.localeSlug = toSlug(localeNameSlug);
        }
        await job.updateProgress(45);
      }

      const region = transformNamedField(response.region);
      if (region) realmEntity.region = region;
      if (response.timezone) realmEntity.timezone = response.timezone;

      const category = get(response, 'category', null);
      if (category) realmEntity.category = category;

      const connectedRealmId = transformConnectedRealmId(response);
      if (connectedRealmId) {
        const connectedRealm = await this.BNet.query<IConnectedRealm>(
          `/data/wow/connected-realm/${connectedRealmId}`,
          apiConstParams(API_HEADERS_ENUM.DYNAMIC),
        );

        realmEntity.connectedRealmId = get(connectedRealm, 'id', null);
        realmEntity.status = get(connectedRealm, 'status.name', null);
        realmEntity.populationStatus = get(connectedRealm, 'population.name', null);
        await job.updateProgress(50);

        const isRealmsExists =
          'realms' in connectedRealm && Array.isArray(connectedRealm.realms);

        if (isRealmsExists) {
          realmEntity.connectedRealms = connectedRealm.realms.map(
            ({ slug }) => slug,
          );
        }
      }

      await this.realmsRepository.save(realmEntity);
      await job.updateProgress(100);
    } catch (errorOrException) {
      this.handleAxiosError(errorOrException, job.data, {
        jobId: job.id,
        progress: job.progress,
      });
    }
  }
}
