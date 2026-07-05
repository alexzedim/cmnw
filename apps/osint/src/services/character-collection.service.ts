import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { hash32 } from 'farmhash';
import {
  BlizzardApiCharacterProfessions,
  BlizzardApiPetsCollection,
  IMounts,
  IPets,
  toGuid,
  setStatusString,
  CharacterStatusState,
  EXPANSION_TICKER,
  EXPANSION_TICKER_MAP,
} from '@app/resources';
import {
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  MountsEntity,
  PetsEntity,
} from '@app/pg';
import { formatServiceErrorLog } from '@app/logger';
import { CharacterEntityIndexingService } from './character-entity-indexing.service';

@Injectable()
export class CharacterCollectionService implements OnApplicationBootstrap {
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
    @InjectRepository(CharactersProfessionsEntity)
    private readonly charactersProfessionsRepository: Repository<CharactersProfessionsEntity>,
    private readonly entityIndexingService: CharacterEntityIndexingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.truncateCollectionsTables();
  }

  private async truncateCollectionsTables(): Promise<void> {
    try {
      const mountsCount = await this.charactersMountsRepository.count();
      if (mountsCount > 0) {
        await this.charactersMountsRepository.clear();
        this.logger.log(`Truncated characters_mounts (${mountsCount} rows removed)`);
      }

      const petsCount = await this.charactersPetsRepository.count();
      if (petsCount > 0) {
        await this.charactersPetsRepository.clear();
        this.logger.log(`Truncated characters_pets (${petsCount} rows removed)`);
      }
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'truncateCollectionsTables',
          'bootstrap',
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
    }
  }

  async syncCharacterMounts(
    nameSlug: string,
    realmSlug: string,
    mountsResponse: any,
    isIndex = false,
  ): Promise<Partial<IMounts>> {
    const mountsCollection: Partial<IMounts> = {};

    try {
      const mountEntities: Array<MountsEntity> = [];

      const { mounts } = mountsResponse;

      if (mounts.length > 0 && isIndex) {
        for (const mount of mounts) {
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
      }

      const hasNewMountEntities = Boolean(isIndex && mountEntities.length);
      if (hasNewMountEntities) {
        await this.entityIndexingService.indexMounts(mountEntities);
      }

      mountsCollection.mountsNumber = mounts.length;

      mountsCollection.status = setStatusString(
        mountsCollection.status || '------',
        'MOUNTS',
        CharacterStatusState.SUCCESS,
      );

      return mountsCollection;
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'syncCharacterMounts',
          `${nameSlug}@${realmSlug}`,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
      mountsCollection.status = setStatusString(
        mountsCollection.status || '------',
        'MOUNTS',
        CharacterStatusState.ERROR,
      );
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
      const petsEntities = new Map<number, PetsEntity>([]);

      const { pets } = petsResponse;

      if (pets.length > 0) {
        for (const pet of pets) {
          try {
            const isNamed = 'name' in pet;

            const creatureId = 'creature_display' in pet ? pet.creature_display.id : null;
            const petId = pet.species.id;

            const isActive = 'is_active' in pet;
            if (isActive) {
              const petIdentifier = isNamed ? `${pet.name}.${pet.species.name}` : `${pet.species.name}`;
              hashA.push(petIdentifier, pet.level);
            }

            const petIdentifier = isNamed ? `${pet.name}.${pet.species.name}` : `${pet.species.name}`;
            hashB.push(petIdentifier, pet.level);

            const shouldIndexPet = isIndex && creatureId && !petsEntities.has(creatureId);
            if (shouldIndexPet) {
              const isPetExists = Boolean(await this.redisService.exists(`PETS:${petId}`));

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
          } catch (error) {
            this.logger.error(
              formatServiceErrorLog(
                'syncCharacterPets',
                `${nameSlug}@${realmSlug}`,
                0,
                error instanceof Error ? error.message : String(error),
                'processPet',
              ),
            );
          }
        }
      }

      const hasNewPetEntities = Boolean(isIndex && petsEntities.size);
      if (hasNewPetEntities) {
        await this.entityIndexingService.indexPets(petsEntities);
      }

      petsCollection.petsNumber = pets.length;
      petsCollection.status = setStatusString(petsCollection.status || '------', 'PETS', CharacterStatusState.SUCCESS);

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
      this.logger.error(
        formatServiceErrorLog(
          'syncCharacterPets',
          `${nameSlug}@${realmSlug}`,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
      petsCollection.status = setStatusString(petsCollection.status || '------', 'PETS', CharacterStatusState.ERROR);
      return petsCollection;
    }
  }

  async syncCharacterProfessions(
    nameSlug: string,
    realmSlug: string,
    professionsData: BlizzardApiCharacterProfessions,
  ): Promise<string[]> {
    const professionsSummary: string[] = [];

    try {
      if (!professionsData) {
        return professionsSummary;
      }

      const professionRecords: CharactersProfessionsEntity[] = [];
      const { primaries, secondaries } = professionsData;
      const characterGuid = toGuid(nameSlug, realmSlug);

      const allProfessions: Array<{ prof: any; isPrimary: boolean }> = [
        ...(primaries || []).map((prof) => ({ prof, isPrimary: true })),
        ...(secondaries || []).map((prof) => ({ prof, isPrimary: false })),
      ];

      if (allProfessions.length > 0) {
        await lastValueFrom(
          from(allProfessions).pipe(
            mergeMap(async ({ prof, isPrimary }) => {
              const { profession, tiers, specialization: profSpecialization } = prof;
              const { id: professionId, name: professionName } = profession;

              tiers?.forEach((tier: any) => {
                const { tier: tierInfo, skill_points, max_skill_points } = tier;
                const { id: tierId, name: tierName } = tierInfo;

                const record = this.charactersProfessionsRepository.create({
                  characterGuid,
                  professionId,
                  professionName,
                  tierId,
                  tierName,
                  skillPoints: skill_points,
                  maxSkillPoints: max_skill_points,
                  isPrimary,
                  specialization: profSpecialization?.name || null,
                });

                professionRecords.push(record);
                let expansionTicker = EXPANSION_TICKER.CLSC;
                Array.from(EXPANSION_TICKER_MAP.entries()).some(([key, ticker]) => {
                  if (tierName.includes(key)) {
                    expansionTicker = ticker;
                    return true;
                  }
                  return false;
                });
                const specializationSuffix = profSpecialization?.name ? ` (${profSpecialization.name})` : '';
                professionsSummary.push(
                  `${expansionTicker} ${professionName}${specializationSuffix} ${skill_points}/${max_skill_points}`,
                );
              });
            }, 5),
          ),
        );
      }

      if (professionRecords.length > 0) {
        await this.charactersProfessionsRepository.delete({ characterGuid });
        await this.charactersProfessionsRepository.save(professionRecords);
      }

      // Set status to SUCCESS for PROFESSIONS endpoint
      professionsData.status = setStatusString(
        professionsData.status || '------',
        'PROFESSIONS',
        CharacterStatusState.SUCCESS,
      );

      return professionsSummary;
    } catch (errorOrException) {
      this.logger.error(
        formatServiceErrorLog(
          'syncCharacterProfessions',
          `${nameSlug}@${realmSlug}`,
          0,
          errorOrException instanceof Error ? errorOrException.message : String(errorOrException),
        ),
      );
      professionsData.status = setStatusString(
        professionsData.status || '------',
        'PROFESSIONS',
        CharacterStatusState.ERROR,
      );
      return professionsSummary;
    }
  }
}
