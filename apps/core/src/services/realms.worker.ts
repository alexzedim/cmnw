import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
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
  toLocale,
  toSlug,
  transformConnectedRealmId,
  transformNamedField,
  RealmMessageDto,
} from '@app/resources';

@Injectable()
export class RealmsWorker {
  private readonly logger = new Logger(RealmsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  /**
   * Handle AxiosError specifically with detailed error information
   * @param error - The error to handle
   * @param messageData - Message context data for additional logging
   * @param additionalInfo - Additional context information
   */
  private handleAxiosError(
    error: unknown,
    messageData?: RealmJobQueue,
    additionalInfo?: Record<string, any>,
  ): void {
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
        messageData: messageData
          ? {
              id: messageData.id,
              name: messageData.name,
              slug: messageData.slug,
              region: messageData.region,
            }
          : undefined,
        ...additionalInfo,
      };

      this.logger.error(errorInfo);
    } else {
      // Fallback for non-Axios errors
      this.logger.error({
        logTag: RealmsWorker.name,
        error,
        messageData: messageData
          ? {
              id: messageData.id,
              name: messageData.name,
              slug: messageData.slug,
              region: messageData.region,
            }
          : undefined,
        ...additionalInfo,
      });
    }
  }

  @RabbitSubscribe({
    exchange: 'core.exchange',
    routingKey: 'core.realms.*',
    queue: 'core.realms',
  })
  public async handleRealmMessage(message: RealmMessageDto): Promise<void> {
    try {
      const args: RealmJobQueue = message.payload;

      let realmEntity = await this.realmsRepository.findOneBy({ id: args.id });

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

      const response: Record<string, any> = await this.BNet.query(
        `/data/wow/realm/${args.slug}`,
        apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE),
      );

      realmEntity.id = get(response, 'id', null);
      realmEntity.slug = get(response, 'slug', null);

      const name = isFieldNamed(response.name)
        ? get(response, 'name.name', null)
        : response.name;

      if (name) realmEntity.name = name;

      const ticker = REALM_TICKER.has(realmEntity.name)
        ? REALM_TICKER.get(realmEntity.name)
        : null;

      if (ticker) realmEntity.ticker = ticker;

      realmEntity.locale = response.locale ? response.locale : null;

      if (realmEntity.locale != 'enGB') {
        const realmLocale = await this.BNet.query<BlizzardApiResponse>(
          `/data/wow/realm/${args.slug}`,
          apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE, true),
        );

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

        const isRealmsExists =
          'realms' in connectedRealm && Array.isArray(connectedRealm.realms);

        if (isRealmsExists) {
          realmEntity.connectedRealms = connectedRealm.realms.map(
            ({ slug }) => slug,
          );
        }
      }

      await this.realmsRepository.save(realmEntity);
      this.logger.log(
        `✓ Realm processed: ${realmEntity.name} (${realmEntity.slug})`,
      );
    } catch (errorOrException) {
      this.handleAxiosError(errorOrException, message.payload, {
        timestamp: new Date().toISOString(),
      });
      throw errorOrException;
    }
  }
}
