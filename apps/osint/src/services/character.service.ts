import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlizzAPI } from '@alexzedim/blizzapi';
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
  STATUS_CODES,
  incErrorCount,
  isCharacterMedia,
  isCharacterSummary,
  isMountCollection,
  isPetsCollection,
  Media,
  toDate,
  toGuid,
  IBlizzardStatusResponse,
} from '@app/resources';
import { KeysEntity } from '@app/pg';

@Injectable()
export class CharacterService {
  private readonly logger = new Logger(CharacterService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {}

  async getStatus(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<CharacterStatus>> {
    const characterStatus: Partial<CharacterStatus> = {};

    try {
      const statusResponse = await BNet.query<IBlizzardStatusResponse>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      ) as IBlizzardStatusResponse;

      characterStatus.isValid = false;

      if (statusResponse.id) characterStatus.id = statusResponse.id;
      if (statusResponse.is_valid) characterStatus.isValid = statusResponse.is_valid;

      const hasLastModified = statusResponse.last_modified;
      if (hasLastModified) {
        characterStatus.lastModified = toDate(statusResponse.last_modified);
      }

      characterStatus.statusCode = STATUS_CODES.SUCCESS_STATUS;

      return characterStatus;
    } catch (errorOrException) {
      characterStatus.statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_STATUS);

      const isTooManyRequests = characterStatus.statusCode === 429;
      if (isTooManyRequests) {
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );
      }

      const isStatusNotFound = characterStatus.statusCode === 404;
      if (isStatusNotFound) {
        this.logger.warn(
          `character: ${nameSlug}@${realmSlug} | status: ${characterStatus.statusCode}`,
        );
      } else {
        this.logger.error({
          logTag: 'getStatus',
          guid: `${nameSlug}@${realmSlug}`,
          statusCode: characterStatus.statusCode,
          error: JSON.stringify(errorOrException),
        });
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
        if (hasValue) summary[key] = value;
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

      summary.statusCode = STATUS_CODES.SUCCESS_SUMMARY;

      return summary;
    } catch (errorOrException) {
      summary.statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_SUMMARY);

      const isTooManyRequests = summary.statusCode === 429;
      if (isTooManyRequests) {
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );
      }

      this.logger.error({
        logTag: 'getSummary',
        guid: `${nameSlug}@${realmSlug}`,
        statusCode: summary.statusCode,
        error: JSON.stringify(errorOrException),
      });

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

      return media;
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_MEDIA);

      this.logger.error({
        logTag: 'getMedia',
        guid: `${nameSlug}@${realmSlug}`,
        statusCode,
        error: JSON.stringify(errorOrException),
      });

      return media;
    }
  }

  async getMountsCollection(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<any> {
    try {
      const response = await BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/mounts`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidCollection = isMountCollection(response);
      if (!isValidCollection) return null;

      return response;
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_MOUNTS);

      this.logger.error({
        logTag: 'getMountsCollection',
        guid: `${nameSlug}@${realmSlug}`,
        statusCode,
        error: JSON.stringify(errorOrException),
      });

      return null;
    }
  }

  async getPetsCollection(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<BlizzardApiPetsCollection | null> {
    try {
      const response = await BNet.query<BlizzardApiPetsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/pets`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      const isValidCollection = isPetsCollection(response);
      if (!isValidCollection) return null;

      return response;
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'status', STATUS_CODES.ERROR_PETS);

      this.logger.error({
        logTag: 'getPetsCollection',
        guid: `${nameSlug}@${realmSlug}`,
        statusCode,
        error: JSON.stringify(errorOrException),
      });

      return null;
    }
  }
}
