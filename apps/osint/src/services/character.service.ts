import { Injectable, Logger } from '@nestjs/common';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { isAxiosError } from 'axios';
import { get } from 'lodash';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiCharacterMedia,
  BlizzardApiCharacterSummary,
  BlizzardApiPetsCollection,
  CHARACTER_MEDIA_FIELD_MAPPING,
  CHARACTER_SUMMARY_FIELD_MAPPING,
  CharacterStatus,
  CharacterSummary,
  isCharacterMedia,
  isCharacterSummary,
  isMountCollection,
  isPetsCollection,
  Media,
  toDate,
  toGuid,
  IBlizzardStatusResponse,
  BlizzardApiMountsCollection,
  BlizzardApiCharacterProfessions,
  isCharacterProfessions,
  setStatusString,
  CharacterStatusState,
  TRACKED_ERROR_STATUS_CODES,
  ApiKeyErrorContext,
  KeyErrorTracker,
} from '@app/resources';
import { KeysEntity } from '@app/pg';

@Injectable()
export class CharacterService {
  private readonly logger = new Logger(CharacterService.name, {
    timestamp: true,
  });

  private readonly keyErrorTracker: KeyErrorTracker;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {
    this.keyErrorTracker = new KeyErrorTracker(keysRepository);
  }

  async getStatus(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<CharacterStatus>> {
    const characterStatus: Partial<CharacterStatus> = {};

    try {
      const statusResponse = (await BNet.query<IBlizzardStatusResponse>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      )) as IBlizzardStatusResponse;

      characterStatus.isValid = false;

      if (statusResponse.id) {
        const numericId = Number(statusResponse.id);
        if (!isNaN(numericId) && Number.isInteger(numericId) && numericId > 0) {
          characterStatus.id = numericId;
        }
      }

      if (statusResponse.is_valid) characterStatus.isValid = statusResponse.is_valid;

      const hasLastModified = statusResponse.last_modified;
      if (hasLastModified) {
        characterStatus.lastModified = toDate(statusResponse.last_modified);
      }

      characterStatus.status = setStatusString(
        characterStatus.status || '------',
        'STATUS',
        CharacterStatusState.SUCCESS,
      );

      return characterStatus;
    } catch (errorOrException) {
      characterStatus.status = setStatusString(
        characterStatus.status || '------',
        'STATUS',
        CharacterStatusState.ERROR,
      );

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : errorOrException.status;

      // Track API key errors (403, 429)
      if (statusCode && TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
        const accessToken = BNet.accessTokenObject.access_token;
        const context: ApiKeyErrorContext = {
          serviceName: 'CharacterService',
          methodName: 'getStatus',
          resourceId: `${nameSlug}@${realmSlug}`,
        };
        await this.keyErrorTracker.trackError(accessToken, statusCode, context);
      }

      const isStatusNotFound = statusCode === 404;
      if (isStatusNotFound) {
        this.logger.debug(
          `${chalk.blue('404')} Not found: ${nameSlug}@${realmSlug}`,
        );
      } else if (statusCode === 429) {
        this.logger.debug(
          `${chalk.yellow('429')} Rate limited: ${nameSlug}@${realmSlug}`,
        );
      } else {
        this.logger.error(
          `${chalk.red('getStatus')} ${nameSlug}@${realmSlug} | ${characterStatus.status} - ${errorOrException.message}`,
        );
      }

      return characterStatus;
    }
  }

  async getSummary(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<CharacterSummary>> {
    const summary: Partial<CharacterSummary> = {};

    try {
      const response = await BNet.query<BlizzardApiCharacterSummary>(
        `/profile/wow/character/${realmSlug}/${nameSlug}`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidSummary = isCharacterSummary(response);
      if (!isValidSummary) {
        return summary;
      }

      for (const [key, path] of CHARACTER_SUMMARY_FIELD_MAPPING.entries()) {
        const value = get(response, path, null);
        const hasValue = Boolean(value);
        if (hasValue) {
          if (key === 'id') {
            const numericId = Number(value);
            if (!isNaN(numericId) && Number.isInteger(numericId) && numericId > 0) {
              summary[key] = numericId;
            }
          } else {
            summary[key] = value;
          }
        }
      }

      summary.guid = toGuid(nameSlug, summary.realm);
      summary.lastModified = toDate(summary.lastModified);

      const hasNoGuild = !summary.guild;
      if (hasNoGuild) {
        summary.guildId = null;
        summary.guild = null;
        summary.guildGuid = null;
        summary.guildRank = null;
      } else {
        summary.guildGuid = toGuid(summary.guild, summary.realm);
      }

      summary.status = setStatusString(
        summary.status || '------',
        'SUMMARY',
        CharacterStatusState.SUCCESS,
      );

      return summary;
    } catch (errorOrException) {
      summary.status = setStatusString(
        summary.status || '------',
        'SUMMARY',
        CharacterStatusState.ERROR,
      );

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : errorOrException.status;

      // Track API key errors (403, 429)
      if (statusCode && TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
        const accessToken = BNet.accessTokenObject.access_token;
        const context: ApiKeyErrorContext = {
          serviceName: 'CharacterService',
          methodName: 'getSummary',
          resourceId: `${nameSlug}@${realmSlug}`,
        };
        await this.keyErrorTracker.trackError(accessToken, statusCode, context);
      }

      if (statusCode === 429) {
        this.logger.debug(
          `${chalk.yellow('429')} Rate limited (getSummary): ${nameSlug}@${realmSlug}`,
        );
      } else {
        this.logger.error(
          `${chalk.red('getSummary')} ${nameSlug}@${realmSlug} | ${summary.status} - ${errorOrException.message}`,
        );
      }

      return summary;
    }
  }

  async getMedia(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<Media>> {
    const media: Partial<Media> = {};

    try {
      const response = await BNet.query<BlizzardApiCharacterMedia>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/character-media`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidMedia = isCharacterMedia(response);
      if (!isValidMedia) return media;

      const { assets } = response;

      assets.forEach(({ key, value }) => {
        const hasMapping = CHARACTER_MEDIA_FIELD_MAPPING.has(key);
        if (!hasMapping) return;

        media[CHARACTER_MEDIA_FIELD_MAPPING.get(key)] = value;
      });

      media.status = setStatusString(
        media.status || '------',
        'MEDIA',
        CharacterStatusState.SUCCESS,
      );

      return media;
    } catch (errorOrException) {
      media.status = setStatusString(
        media.status || '------',
        'MEDIA',
        CharacterStatusState.ERROR,
      );

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      // Track API key errors (403, 429)
      if (statusCode && TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
        const accessToken = BNet.accessTokenObject.access_token;
        const context: ApiKeyErrorContext = {
          serviceName: 'CharacterService',
          methodName: 'getMedia',
          resourceId: `${nameSlug}@${realmSlug}`,
        };
        await this.keyErrorTracker.trackError(accessToken, statusCode, context);
      }

      if (statusCode === 429) {
        this.logger.debug(
          `${chalk.yellow('429')} Rate limited (getMedia): ${nameSlug}@${realmSlug}`,
        );
      } else {
        this.logger.error(
          `${chalk.red('getMedia')} ${nameSlug}@${realmSlug} | ${statusCode} - ${errorOrException.message}`,
        );
      }

      return media;
    }
  }

  async getMountsCollection(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<BlizzardApiMountsCollection> {
    const mounts: Partial<BlizzardApiMountsCollection> = {};

    try {
      const response = await BNet.query<BlizzardApiMountsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/mounts`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidCollection = isMountCollection(response);
      if (!isValidCollection) {
        mounts.status = setStatusString(
          mounts.status || '------',
          'MOUNTS',
          CharacterStatusState.ERROR,
        );
        return mounts as BlizzardApiMountsCollection;
      }

      Object.assign(mounts, response);

      mounts.status = setStatusString(
        mounts.status || '------',
        'MOUNTS',
        CharacterStatusState.SUCCESS,
      );

      return mounts as BlizzardApiMountsCollection;
    } catch (errorOrException) {
      mounts.status = setStatusString(
        mounts.status || '------',
        'MOUNTS',
        CharacterStatusState.ERROR,
      );

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      // Track API key errors (403, 429)
      if (statusCode && TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
        const accessToken = BNet.accessTokenObject.access_token;
        const context: ApiKeyErrorContext = {
          serviceName: 'CharacterService',
          methodName: 'getMountsCollection',
          resourceId: `${nameSlug}@${realmSlug}`,
        };
        await this.keyErrorTracker.trackError(accessToken, statusCode, context);
      }

      if (statusCode === 429) {
        this.logger.debug(
          `${chalk.yellow('429')} Rate limited (getMountsCollection): ${nameSlug}@${realmSlug}`,
        );
      } else {
        this.logger.error(
          `${chalk.red('getMountsCollection')} ${nameSlug}@${realmSlug} | ${statusCode} - ${errorOrException.message}`,
        );
      }

      return mounts as BlizzardApiMountsCollection;
    }
  }

  async getPetsCollection(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<BlizzardApiPetsCollection | null> {
    const pets: Partial<BlizzardApiPetsCollection> = {};

    try {
      const response = await BNet.query<BlizzardApiPetsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/pets`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidCollection = isPetsCollection(response);
      if (!isValidCollection) {
        pets.status = setStatusString(
          pets.status || '------',
          'PETS',
          CharacterStatusState.ERROR,
        );
        return pets as BlizzardApiPetsCollection;
      }

      Object.assign(pets, response);

      pets.status = setStatusString(
        pets.status || '------',
        'PETS',
        CharacterStatusState.SUCCESS,
      );

      return pets as BlizzardApiPetsCollection;
    } catch (errorOrException) {
      pets.status = setStatusString(
        pets.status || '------',
        'PETS',
        CharacterStatusState.ERROR,
      );

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      // Track API key errors (403, 429)
      if (statusCode && TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
        const accessToken = BNet.accessTokenObject.access_token;
        const context: ApiKeyErrorContext = {
          serviceName: 'CharacterService',
          methodName: 'getPetsCollection',
          resourceId: `${nameSlug}@${realmSlug}`,
        };
        await this.keyErrorTracker.trackError(accessToken, statusCode, context);
      }

      if (statusCode === 429) {
        this.logger.debug(
          `${chalk.yellow('429')} Rate limited (getPetsCollection): ${nameSlug}@${realmSlug}`,
        );
      } else {
        this.logger.error(
          `${chalk.red('getPetsCollection')} ${nameSlug}@${realmSlug} | ${statusCode} - ${errorOrException.message}`,
        );
      }

      return pets as BlizzardApiPetsCollection;
    }
  }

  async getProfessions(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<BlizzardApiCharacterProfessions | null> {
    const professions: Partial<BlizzardApiCharacterProfessions> = {};

    try {
      const response = await BNet.query<BlizzardApiCharacterProfessions>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/professions`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidProfessions = isCharacterProfessions(response);
      if (!isValidProfessions) {
        professions.status = setStatusString(
          professions.status || '------',
          'PROFESSIONS',
          CharacterStatusState.ERROR,
        );
        return professions as BlizzardApiCharacterProfessions;
      }

      Object.assign(professions, response);

      professions.status = setStatusString(
        professions.status || '------',
        'PROFESSIONS',
        CharacterStatusState.SUCCESS,
      );

      return professions as BlizzardApiCharacterProfessions;
    } catch (errorOrException) {
      professions.status = setStatusString(
        professions.status || '------',
        'PROFESSIONS',
        CharacterStatusState.ERROR,
      );

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      // Track API key errors (403, 429)
      if (statusCode && TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
        const accessToken = BNet.accessTokenObject.access_token;
        const context: ApiKeyErrorContext = {
          serviceName: 'CharacterService',
          methodName: 'getProfessions',
          resourceId: `${nameSlug}@${realmSlug}`,
        };
        await this.keyErrorTracker.trackError(accessToken, statusCode, context);
      }

      if (statusCode === 429) {
        this.logger.debug(
          `${chalk.yellow('429')} Rate limited (getProfessions): ${nameSlug}@${realmSlug}`,
        );
      } else {
        this.logger.error(
          `${chalk.red('getProfessions')} ${nameSlug}@${realmSlug} | ${statusCode} - ${errorOrException.message}`,
        );
      }

      return professions as BlizzardApiCharacterProfessions;
    }
  }
}
