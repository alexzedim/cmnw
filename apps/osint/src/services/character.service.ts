import { BattleNetNamespace, BattleNetService, type IBattleNetClientConfig } from '@app/battle-net';
import { formatServiceErrorLog, formatServiceLog, WorkerLogStatus } from '@app/logger';
import { CharactersEntity } from '@app/pg';
import {
  type BlizzardApiCharacterAchievements,
  type BlizzardApiCharacterMedia,
  type BlizzardApiCharacterProfessions,
  type BlizzardApiCharacterSummary,
  type BlizzardApiMountsCollection,
  type BlizzardApiPetsCollection,
  CHARACTER_ARGS_ENTITY_KEYS,
  CHARACTER_MEDIA_FIELD_MAPPING,
  CHARACTER_SUMMARY_FIELD_MAPPING,
  type CharacterAchievementsScan,
  type CharacterStatus,
  type CharacterSummary,
  collectBlizzardEmployeeFos,
  detectCharacterAgeAndLevelBoost,
  GUILD_INHERIT_KEYS,
  type IBlizzardStatusResponse,
  type ICharacterMessageBase,
  isCharacterAchievements,
  isCharacterMedia,
  isCharacterProfessions,
  isCharacterSummary,
  isMountCollection,
  isPetsCollection,
  type Media,
  normalizeLocaleField,
  toDate,
  toGuid,
  toPositiveInt,
} from '@app/resources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isAxiosError } from 'axios';
import { get, set } from 'lodash';
import type { Repository } from 'typeorm';

@Injectable()
export class CharacterService {
  private readonly logger = new Logger(CharacterService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    private readonly battleNetService: BattleNetService,
  ) {}

  async save(entity: CharactersEntity): Promise<CharactersEntity> {
    return this.charactersRepository.save(entity);
  }

  inheritSafeValuesFromArgs(entity: CharactersEntity, args: ICharacterMessageBase): void {
    for (const key of CHARACTER_ARGS_ENTITY_KEYS) {
      const value = args[key];
      if (value != null && !entity[key]) {
        if ((GUILD_INHERIT_KEYS as readonly string[]).includes(key) && entity.guildGuid == null) {
          continue;
        }
        set(entity, key, value);
      }
    }
  }

  async getStatus(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<Partial<CharacterStatus> | null> {
    const characterStatus: Partial<CharacterStatus> = {};

    try {
      const statusResponse = await this.battleNetService.query<IBlizzardStatusResponse>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      characterStatus.isValid = false;

      if (statusResponse.id) {
        const numericId = Number(statusResponse.id);
        if (!Number.isNaN(numericId) && Number.isInteger(numericId) && numericId > 0) {
          characterStatus.id = numericId;
        }
      }

      if (statusResponse.is_valid) characterStatus.isValid = statusResponse.is_valid;

      const hasLastModified = statusResponse.last_modified;
      if (hasLastModified) {
        characterStatus.lastModified = toDate(statusResponse.last_modified);
      }

      return characterStatus;
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException) ? errorOrException.response?.status : errorOrException.status;

      const isStatusNotFound = statusCode === 404;
      if (isStatusNotFound) {
        this.logger.debug(formatServiceLog(WorkerLogStatus.NOT_FOUND, 'getStatus', `${nameSlug}@${realmSlug}`, 0));
      } else {
        this.logger.warn(
          formatServiceLog(WorkerLogStatus.WARNING, 'getStatus', `${nameSlug}@${realmSlug}`, 0, `${statusCode}`),
        );
      }

      return null;
    }
  }

  async getSummary(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<Partial<CharacterSummary> | null> {
    const summary: Partial<CharacterSummary> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterSummary>(
        `/profile/wow/character/${realmSlug}/${nameSlug}`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidSummary = isCharacterSummary(response);
      if (!isValidSummary) {
        this.logger.error(
          formatServiceErrorLog(
            'getSummary',
            `${nameSlug}@${realmSlug}`,
            0,
            `invalid summary schema: ${Object.keys(response ?? {}).join(',')}`,
          ),
        );
        return null;
      }

      for (const [key, mapping] of CHARACTER_SUMMARY_FIELD_MAPPING.entries()) {
        const rawValue = get(response, mapping.path, null);
        if (rawValue == null) continue;

        let value: unknown;

        if (mapping.transform) {
          value = mapping.transform(rawValue);
        } else if (typeof rawValue === 'number') {
          value = toPositiveInt(rawValue);
        } else if (typeof rawValue === 'object') {
          value = normalizeLocaleField(rawValue);
        } else {
          value = rawValue;
        }

        if (value != null) {
          summary[key] = value;
        }
      }

      summary.guid = toGuid(nameSlug, summary.realm);

      if (summary.lastModified) {
        summary.lastModified = toDate(summary.lastModified);
      }

      if (!response.guild) {
        summary.isGuildless = true;
      }

      if (response.guild) {
        const guildName = get(response, 'guild.name', null);
        const guildRealmSlug = get(response, 'guild.realm.slug', null);
        const guildId = get(response, 'guild.id', null);

        if (guildId) {
          summary.guildId = guildId;
        }

        if (guildName) {
          summary.guild = guildName;
        }

        if (guildName && guildRealmSlug) {
          summary.guildGuid = toGuid(guildName, guildRealmSlug);
        }
      }

      return summary;
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      this.logger.error(
        formatServiceErrorLog(
          'getSummary',
          `${nameSlug}@${realmSlug}`,
          0,
          `${statusCode} - ${errorOrException.message}`,
        ),
      );

      return null;
    }
  }

  async getMedia(nameSlug: string, realmSlug: string, config?: IBattleNetClientConfig): Promise<Partial<Media> | null> {
    const media: Partial<Media> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterMedia>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/character-media`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidMedia = isCharacterMedia(response);
      if (!isValidMedia) {
        this.logger.error(
          formatServiceErrorLog(
            'getMedia',
            `${nameSlug}@${realmSlug}`,
            0,
            `invalid media schema: ${Object.keys(response ?? {}).join(',')}`,
          ),
        );
        return null;
      }

      const { assets } = response;

      assets.forEach(({ key, value }) => {
        const hasMapping = CHARACTER_MEDIA_FIELD_MAPPING.has(key);
        if (!hasMapping) return;

        media[CHARACTER_MEDIA_FIELD_MAPPING.get(key)] = value;
      });

      return media;
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      this.logger.error(
        formatServiceErrorLog('getMedia', `${nameSlug}@${realmSlug}`, 0, `${statusCode} - ${errorOrException.message}`),
      );

      return null;
    }
  }

  async getMountsCollection(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<BlizzardApiMountsCollection | null> {
    try {
      const response = await this.battleNetService.query<BlizzardApiMountsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/mounts`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidCollection = isMountCollection(response);
      if (!isValidCollection) {
        this.logger.error(
          formatServiceErrorLog(
            'getMountsCollection',
            `${nameSlug}@${realmSlug}`,
            0,
            `invalid mounts schema: ${Object.keys(response ?? {}).join(',')}`,
          ),
        );
        return null;
      }

      return response;
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      this.logger.error(
        formatServiceErrorLog(
          'getMountsCollection',
          `${nameSlug}@${realmSlug}`,
          0,
          `${statusCode} - ${errorOrException.message}`,
        ),
      );

      return null;
    }
  }

  async getPetsCollection(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<BlizzardApiPetsCollection | null> {
    try {
      const response = await this.battleNetService.query<BlizzardApiPetsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/pets`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidCollection = isPetsCollection(response);
      if (!isValidCollection) {
        this.logger.error(
          formatServiceErrorLog(
            'getPetsCollection',
            `${nameSlug}@${realmSlug}`,
            0,
            `invalid pets schema: ${Object.keys(response ?? {}).join(',')}`,
          ),
        );
        return null;
      }

      return response;
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      this.logger.error(
        formatServiceErrorLog(
          'getPetsCollection',
          `${nameSlug}@${realmSlug}`,
          0,
          `${statusCode} - ${errorOrException.message}`,
        ),
      );

      return null;
    }
  }

  async getProfessions(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<BlizzardApiCharacterProfessions | null> {
    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterProfessions>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/professions`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidProfessions = isCharacterProfessions(response);
      if (!isValidProfessions) {
        this.logger.error(
          formatServiceErrorLog('getProfessions', `${nameSlug}@${realmSlug}`, 0, 'invalid professions schema'),
        );
        return null;
      }

      return response;
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      this.logger.error(
        formatServiceErrorLog(
          'getProfessions',
          `${nameSlug}@${realmSlug}`,
          0,
          `${statusCode} - ${errorOrException.message}`,
        ),
      );

      return null;
    }
  }

  async getAchievements(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
    characterClass?: string | null,
  ): Promise<CharacterAchievementsScan | null> {
    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterAchievements>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/achievements`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidAchievements = isCharacterAchievements(response);
      if (!isValidAchievements) {
        return null;
      }

      return {
        ...detectCharacterAgeAndLevelBoost(response.achievements ?? [], characterClass),
        employeeFos: collectBlizzardEmployeeFos(response.achievements ?? []),
      };
    } catch (errorOrException) {
      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      const isNotFound = statusCode === 404;
      if (isNotFound) {
        this.logger.debug(
          formatServiceLog(WorkerLogStatus.NOT_FOUND, 'getAchievements', `${nameSlug}@${realmSlug}`, 0),
        );
      } else {
        this.logger.error(
          formatServiceErrorLog(
            'getAchievements',
            `${nameSlug}@${realmSlug}`,
            0,
            `${statusCode} - ${errorOrException.message}`,
          ),
        );
      }

      return null;
    }
  }
}
