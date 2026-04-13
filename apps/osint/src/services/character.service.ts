import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BattleNetService, BattleNetNamespace, IBattleNetClientConfig } from '@app/battle-net';
import { isAxiosError } from 'axios';
import { get, set } from 'lodash';
import {
  BlizzardApiCharacterMedia,
  BlizzardApiCharacterSummary,
  BlizzardApiPetsCollection,
  CHARACTER_ARGS_ENTITY_KEYS,
  CHARACTER_MEDIA_FIELD_MAPPING,
  GUILD_INHERIT_KEYS,
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
  ICharacterMessageBase,
  BlizzardApiMountsCollection,
  BlizzardApiCharacterProfessions,
  isCharacterProfessions,
  setStatusString,
  CharacterStatusState,
  toPositiveInt,
  normalizeLocaleField,
} from '@app/resources';
import { CharactersEntity } from '@app/pg';
import { formatServiceLog, formatServiceErrorLog, WorkerLogStatus } from '@app/logger';

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
  ): Promise<Partial<CharacterStatus>> {
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

      const statusCode = isAxiosError(errorOrException) ? errorOrException.response?.status : errorOrException.status;

      const isStatusNotFound = statusCode === 404;
      if (isStatusNotFound) {
        this.logger.debug(formatServiceLog(WorkerLogStatus.NOT_FOUND, 'getStatus', `${nameSlug}@${realmSlug}`, 0));
      } else {
        this.logger.warn(
          formatServiceLog(WorkerLogStatus.WARNING, 'getStatus', `${nameSlug}@${realmSlug}`, 0, characterStatus.status),
        );
      }

      return characterStatus;
    }
  }

  async getSummary(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<Partial<CharacterSummary>> {
    const summary: Partial<CharacterSummary> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterSummary>(
        `/profile/wow/character/${realmSlug}/${nameSlug}`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidSummary = isCharacterSummary(response);
      if (!isValidSummary) {
        return summary;
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
      summary.lastModified = toDate(summary.lastModified);

      if (!response.guild) {
        summary.guildId = null;
        summary.guild = null;
        summary.guildGuid = null;
        summary.guildRank = null;
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

      summary.status = setStatusString(summary.status || '------', 'SUMMARY', CharacterStatusState.SUCCESS);

      return summary;
    } catch (errorOrException) {
      summary.status = setStatusString(summary.status || '------', 'SUMMARY', CharacterStatusState.ERROR);

      this.logger.error(
        formatServiceErrorLog('getSummary', `${nameSlug}@${realmSlug}`, 0, errorOrException.message, summary.status),
      );

      return summary;
    }
  }

  async getMedia(nameSlug: string, realmSlug: string, config?: IBattleNetClientConfig): Promise<Partial<Media>> {
    const media: Partial<Media> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterMedia>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/character-media`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidMedia = isCharacterMedia(response);
      if (!isValidMedia) return media;

      const { assets } = response;

      assets.forEach(({ key, value }) => {
        const hasMapping = CHARACTER_MEDIA_FIELD_MAPPING.has(key);
        if (!hasMapping) return;

        media[CHARACTER_MEDIA_FIELD_MAPPING.get(key)] = value;
      });

      media.status = setStatusString(media.status || '------', 'MEDIA', CharacterStatusState.SUCCESS);

      return media;
    } catch (errorOrException) {
      media.status = setStatusString(media.status || '------', 'MEDIA', CharacterStatusState.ERROR);

      const statusCode = isAxiosError(errorOrException)
        ? errorOrException.response?.status
        : get(errorOrException, 'status', 400);

      this.logger.error(
        formatServiceErrorLog('getMedia', `${nameSlug}@${realmSlug}`, 0, `${statusCode} - ${errorOrException.message}`),
      );

      return media;
    }
  }

  async getMountsCollection(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<BlizzardApiMountsCollection> {
    const mounts: Partial<BlizzardApiMountsCollection> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiMountsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/mounts`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidCollection = isMountCollection(response);
      if (!isValidCollection) {
        mounts.status = setStatusString(mounts.status || '------', 'MOUNTS', CharacterStatusState.ERROR);
        return mounts as BlizzardApiMountsCollection;
      }

      Object.assign(mounts, response);

      mounts.status = setStatusString(mounts.status || '------', 'MOUNTS', CharacterStatusState.SUCCESS);

      return mounts as BlizzardApiMountsCollection;
    } catch (errorOrException) {
      mounts.status = setStatusString(mounts.status || '------', 'MOUNTS', CharacterStatusState.ERROR);

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

      return mounts as BlizzardApiMountsCollection;
    }
  }

  async getPetsCollection(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<BlizzardApiPetsCollection | null> {
    const pets: Partial<BlizzardApiPetsCollection> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiPetsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/pets`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidCollection = isPetsCollection(response);
      if (!isValidCollection) {
        pets.status = setStatusString(pets.status || '------', 'PETS', CharacterStatusState.ERROR);
        return pets as BlizzardApiPetsCollection;
      }

      Object.assign(pets, response);

      pets.status = setStatusString(pets.status || '------', 'PETS', CharacterStatusState.SUCCESS);

      return pets as BlizzardApiPetsCollection;
    } catch (errorOrException) {
      pets.status = setStatusString(pets.status || '------', 'PETS', CharacterStatusState.ERROR);

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

      return pets as BlizzardApiPetsCollection;
    }
  }

  async getProfessions(
    nameSlug: string,
    realmSlug: string,
    config?: IBattleNetClientConfig,
  ): Promise<BlizzardApiCharacterProfessions | null> {
    const professions: Partial<BlizzardApiCharacterProfessions> = {};

    try {
      const response = await this.battleNetService.query<BlizzardApiCharacterProfessions>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/professions`,
        this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE),
        config,
      );

      const isValidProfessions = isCharacterProfessions(response);
      if (!isValidProfessions) {
        professions.status = setStatusString(professions.status || '------', 'PROFESSIONS', CharacterStatusState.ERROR);
        return professions as BlizzardApiCharacterProfessions;
      }

      Object.assign(professions, response);

      professions.status = setStatusString(professions.status || '------', 'PROFESSIONS', CharacterStatusState.SUCCESS);

      return professions as BlizzardApiCharacterProfessions;
    } catch (errorOrException) {
      professions.status = setStatusString(professions.status || '------', 'PROFESSIONS', CharacterStatusState.ERROR);

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

      return professions as BlizzardApiCharacterProfessions;
    }
  }
}
