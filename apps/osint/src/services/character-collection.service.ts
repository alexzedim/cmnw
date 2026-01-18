import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { difference } from 'lodash';
import { hash32 } from 'farmhash';
import {
  BlizzardApiPetsCollection,
  IMounts,
  IPets,
  IPetType,
  STATUS_CODES,
  toGuid,
} from '@app/resources';
import {
  CharactersMountsEntity,
  CharactersPetsEntity,
  MountsEntity,
  PetsEntity,
} from '@app/pg';
import { CharacterEntityIndexingService } from './character-entity-indexing.service';

@Injectable()
export class CharacterCollectionService {
  private readonly logger = new Logger(CharacterCollectionService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(MountsEntity)
    private readonly mountsRepository: Repository<MountsEntity>,
    @InjectRepository(PetsEntity)
    private readonly petsRepository: Repository<PetsEntity>,
    @InjectRepository(CharactersMountsEntity)
    private readonly charactersMountsRepository: Repository<CharactersMountsEntity>,
    @InjectRepository(CharactersPetsEntity)
    private readonly charactersPetsRepository: Repository<CharactersPetsEntity>,
    private readonly entityIndexingService: CharacterEntityIndexingService,
  ) {}

  async syncCharacterMounts(
    nameSlug: string,
    realmSlug: string,
    mountsResponse: any,
    isIndex = false,
  ): Promise<Partial<IMounts>> {
    const mountsCollection: Partial<IMounts> = {};

    try {
      const mountEntities: Array<MountsEntity> = [];
      const characterMountsEntities: Array<CharactersMountsEntity> = [];

      const { mounts } = mountsResponse;
      const characterGuid = toGuid(nameSlug, realmSlug);

      const charactersMountEntities = await this.charactersMountsRepository.findBy({
        characterGuid,
      });

      const updatedMountIds = new Set<number>();
      const originalMountIds = new Set(
        charactersMountEntities.map((charactersMount) => charactersMount.mountId),
      );

      await lastValueFrom(
        from(mounts).pipe(
          mergeMap(async (mount: any) => {
            const isAddedToCollection = originalMountIds.has(mount.mount.id);
            updatedMountIds.add(mount.mount.id);

            const shouldIndexMount = isIndex;
            if (shouldIndexMount) {
              const isMountExists = await this.mountsRepository.existsBy({
                id: mount.mount.id,
              });

              const isNewMount = !isMountExists;
              if (isNewMount) {
                const mountEntity = this.mountsRepository.create({
                  id: mount.mount.id,
                  name: mount.mount.name,
                });

                mountEntities.push(mountEntity);
              }
            }

            const isNewMountForCharacter = !isAddedToCollection;
            if (isNewMountForCharacter) {
              const characterMountEntity = this.charactersMountsRepository.create({
                mountId: mount.mount.id,
                characterGuid,
              });

              characterMountsEntities.push(characterMountEntity);
            }
          }),
        ),
      );

      const hasNewMountEntities = Boolean(isIndex && mountEntities.length);
      if (hasNewMountEntities) {
        await this.entityIndexingService.indexMounts(mountEntities);
      }

      const removeMountIds = difference(
        Array.from(originalMountIds),
        Array.from(updatedMountIds),
      );

      await this.charactersMountsRepository.save(characterMountsEntities);

      const hasMountsToRemove = Boolean(removeMountIds.length);
      if (hasMountsToRemove) {
        await this.charactersMountsRepository.delete({
          characterGuid: characterGuid,
          mountId: In(removeMountIds),
        });
      }

      mountsCollection.mountsNumber = mounts.length;
      mountsCollection.statusCode = STATUS_CODES.SUCCESS_MOUNTS;

      return mountsCollection;
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'syncCharacterMounts',
        guid: `${nameSlug}@${realmSlug}`,
        error: JSON.stringify(errorOrException),
      });
      return mountsCollection;
    }
  }

  async syncCharacterPets(
    nameSlug: string,
    realmSlug: string,
    petsResponse: BlizzardApiPetsCollection,
    isIndex = false,
  ): Promise<Partial<IPets>> {
    const petsCollection: Partial<IPets> = {};

    try {
      const hashB: Array<string | number> = [];
      const hashA: Array<string | number> = [];
      const characterPetsEntities: Array<CharactersPetsEntity> = [];
      const petsEntities = new Map<number, PetsEntity>([]);

      const { pets } = petsResponse;
      const characterGuid = toGuid(nameSlug, realmSlug);

      const charactersPetsEntities = await this.charactersPetsRepository.findBy({
        characterGuid,
      });

      const updatedPetIds = new Set<number>();
      const originalPetIds = new Set(
        charactersPetsEntities.map((charactersPet) => charactersPet.petId),
      );

      await lastValueFrom(
        from(pets).pipe(
          mergeMap(async (pet: IPetType) => {
            try {
              const isAddedToCollection = originalPetIds.has(pet.id);
              const isNamed = 'name' in pet;

              const creatureId =
                'creature_display' in pet ? pet.creature_display.id : null;
              const characterPetId = pet.id;
              const petId = pet.species.id;
              const petName = isNamed ? pet.name : pet.species.name;
              const petLevel = Number(pet.level) || 1;
              const isActive = 'is_active' in pet;
              const petQuality = 'quality' in pet ? pet.quality.name : null;
              const breedId = 'stats' in pet ? pet.stats.breed_id : null;

              const shouldIndexPet =
                isIndex && creatureId && !petsEntities.has(creatureId);

              updatedPetIds.add(pet.id);

              if (isActive) {
                const petIdentifier = isNamed
                  ? `${pet.name}.${pet.species.name}`
                  : `${pet.species.name}`;
                hashA.push(petIdentifier, pet.level);
              }

              const petIdentifier = isNamed
                ? `${pet.name}.${pet.species.name}`
                : `${pet.species.name}`;
              hashB.push(petIdentifier, pet.level);

              if (shouldIndexPet) {
                const isPetExists = Boolean(
                  await this.redisService.exists(`PETS:${petId}`),
                );

                const isNewPetType = !isPetExists;
                if (isNewPetType) {
                  const petEntity = this.petsRepository.create({
                    id: petId,
                    creatureId: creatureId,
                    name: pet.species.name,
                  });

                  petsEntities.set(creatureId, petEntity);
                }
              }

              const isNewPetForCharacter = !isAddedToCollection;
              if (isNewPetForCharacter) {
                const characterPetEntity = this.charactersPetsRepository.create({
                  petId,
                  characterPetId,
                  creatureId,
                  petQuality,
                  breedId,
                  characterGuid,
                  petName,
                  petLevel,
                  isActive,
                });

                characterPetsEntities.push(characterPetEntity);
              }
            } catch (error) {
              this.logger.error({
                logTag: 'syncCharacterPets|processPet',
                error: JSON.stringify(error),
              });
            }
          }, 5),
        ),
      );

      const hasNewPetEntities = Boolean(isIndex && petsEntities.size);
      if (hasNewPetEntities) {
        await this.entityIndexingService.indexPets(petsEntities);
      }

      const removePetIds = difference(
        Array.from(originalPetIds),
        Array.from(updatedPetIds),
      );

      await this.charactersPetsRepository.save(characterPetsEntities);

      const hasPetsToRemove = Boolean(removePetIds.length);
      if (hasPetsToRemove) {
        await this.charactersPetsRepository.delete({
          characterGuid: characterGuid,
          petId: In(removePetIds),
        });
      }

      petsCollection.petsNumber = pets.length;
      petsCollection.statusCode = STATUS_CODES.SUCCESS_PETS;

      const hasHashB = Boolean(hashB.length);
      if (hasHashB) {
        petsCollection.hashB = hash32(hashB.join('.')).toString(16).padStart(8, '0');
      }

      const hasHashA = Boolean(hashA.length);
      if (hasHashA) {
        petsCollection.hashA = hash32(hashA.join('.')).toString(16).padStart(8, '0');
      }

      return petsCollection;
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'syncCharacterPets',
        guid: `${nameSlug}@${realmSlug}`,
        error: JSON.stringify(errorOrException),
      });
      return petsCollection;
    }
  }
}
