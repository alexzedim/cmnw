import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ACTION_LOG,
  capitalize,
  CharacterExistsOrCreate,
  CharacterJobQueue,
  OSINT_1_DAY_MS,
  OSINT_SOURCE,
  STATUS_CODES,
  toDate,
  toSlug,
} from '@app/resources';
import { findRealm } from '@app/resources/dao/realms.dao';
import {
  CharactersEntity,
  CharactersGuildsLogsEntity,
  RealmsEntity,
} from '@app/pg';

@Injectable()
export class CharacterLifecycleService {
  private readonly logger = new Logger(CharacterLifecycleService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsLogsEntity)
    private readonly charactersGuildsLogsRepository: Repository<CharactersGuildsLogsEntity>,
  ) {}

  async findOrCreateCharacter(
    character: CharacterJobQueue,
  ): Promise<CharacterExistsOrCreate> {
    const forceUpdate = character.forceUpdate || OSINT_1_DAY_MS;
    const timestampNow = new Date().getTime();

    const realmEntity = await findRealm(this.realmsRepository, character.realm);

    const isRealmNotFound = !realmEntity;
    if (isRealmNotFound) {
      throw new NotFoundException(`Realm ${character.realm} not found`);
    }

    const characterEntity = await this.charactersRepository.findOneBy({
      guid: character.guid,
    });

    const isNewCharacter = !characterEntity;
    if (isNewCharacter) {
      return this.createNewCharacter(character, realmEntity);
    }

    const shouldCreateOnlyUnique = character.createOnlyUnique;
    if (shouldCreateOnlyUnique) {
      return {
        characterEntity,
        isNew: false,
        isCreateOnlyUnique: character.createOnlyUnique,
        isNotReadyToUpdate: false,
      };
    }

    const updateSafe = timestampNow - forceUpdate;
    const updatedAt = characterEntity.updatedAt.getTime();
    const isNotReadyToUpdate = updateSafe < updatedAt;

    if (isNotReadyToUpdate) {
      return {
        characterEntity,
        isNew: false,
        isCreateOnlyUnique: character.createOnlyUnique,
        isNotReadyToUpdate: isNotReadyToUpdate,
      };
    }

    characterEntity.statusCode = 100;

    return {
      characterEntity,
      isNew: false,
      isCreateOnlyUnique: false,
      isNotReadyToUpdate: isNotReadyToUpdate,
    };
  }

  private createNewCharacter(
    character: CharacterJobQueue,
    realmEntity: RealmsEntity,
  ): CharacterExistsOrCreate {
    const characterNew = this.charactersRepository.create({
      ...character,
      id: character.id || null,
      guid: character.guid,
      name: capitalize(character.name),
      realm: realmEntity.slug,
      realmId: realmEntity.id,
      realmName: realmEntity.name,
    });

    const hasLastModified = character.lastModified;
    if (hasLastModified) {
      characterNew.lastModified = toDate(character.lastModified);
    }

    characterNew.statusCode = STATUS_CODES.DEFAULT_STATUS;

    const hasGuild = character.guild;
    if (hasGuild) characterNew.guild = character.guild;

    const hasGuildGuid = character.guildGuid;
    if (hasGuildGuid) characterNew.guildGuid = character.guildGuid;

    const hasGuildId = character.guildId;
    if (hasGuildId) characterNew.guildId = character.guildId;

    characterNew.createdBy = character.createdBy
      ? character.createdBy
      : OSINT_SOURCE.CHARACTER_GET;

    return {
      characterEntity: characterNew,
      isNew: true,
      isCreateOnlyUnique: false,
      isNotReadyToUpdate: false,
    };
  }

  async diffAndLogChanges(
    original: CharactersEntity,
    updated: CharactersEntity,
  ): Promise<void> {
    try {
      const actionLogFields = [
        ACTION_LOG.NAME,
        ACTION_LOG.RACE,
        ACTION_LOG.GENDER,
        ACTION_LOG.FACTION,
      ];

      for (const actionLogField of actionLogFields) {
        const key = actionLogField.toLowerCase();

        const hasField = Boolean(original[key]) && Boolean(updated[key]);
        if (!hasField) continue;

        const isFieldChanged = original[key] !== updated[key];
        if (!isFieldChanged) continue;

        const logEntity = this.charactersGuildsLogsRepository.create({
          characterGuid: updated.guid,
          original: original[key],
          updated: updated[key],
          action: actionLogField,
          scannedAt: toDate(original.lastModified || original.updatedAt),
          createdAt: toDate(updated.lastModified || updated.updatedAt),
        });

        await this.charactersGuildsLogsRepository.save(logEntity);
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'diffAndLogChanges',
        guid: original.guid,
        error: JSON.stringify(errorOrException),
      });
    }
  }

  shouldUpdateCharacter(
    characterEntity: CharactersEntity,
    forceUpdate: number,
  ): boolean {
    const timestampNow = new Date().getTime();
    const updateSafe = timestampNow - forceUpdate;
    const updatedAt = characterEntity.updatedAt.getTime();

    return updateSafe >= updatedAt;
  }
}
