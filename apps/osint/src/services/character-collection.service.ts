import { formatServiceErrorLog } from '@app/logger';
import { CharactersProfessionsEntity, MountsEntity, PetsEntity } from '@app/pg';
import {
  type BlizzardApiCharacterProfessions,
  type BlizzardApiMountsCollection,
  type BlizzardApiPetsCollection,
  EXPANSION_TICKER,
  EXPANSION_TICKER_MAP,
  type IMounts,
  type IPets,
  toGuid,
} from '@app/resources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { hash32 } from 'farmhash';
import type Redis from 'ioredis';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import type { Repository } from 'typeorm';
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
    @InjectRepository(CharactersProfessionsEntity)
    private readonly charactersProfessionsRepository: Repository<CharactersProfessionsEntity>,
    private readonly entityIndexingService: CharacterEntityIndexingService,
  ) {}

  async syncCharacterMounts(
    nameSlug: string,
    realmSlug: string,
    mountsResponse: BlizzardApiMountsCollection,
    isIndex = false,
  ): Promise<Partial<IMounts> | null> {
    const mountsCollection: Partial<IMounts> = {};

    try {
      const mountEntities: Array<MountsEntity> = [];

      const { mounts } = mountsResponse ?? {};

      if (mounts?.length && isIndex) {
        for (const mount of mounts) {
          try {
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
          } catch (error) {
            this.logger.error(
              formatServiceErrorLog(
                'syncCharacterMounts',
                `${nameSlug}@${realmSlug}`,
                0,
                error instanceof Error ? error.message : String(error),
                'processMount',
              ),
            );
          }
        }
      }

      const hasNewMountEntities = Boolean(isIndex && mountEntities.length);
      if (hasNewMountEntities) {
        await this.entityIndexingService.indexMounts(mountEntities);
      }

      mountsCollection.mountsNumber = mounts?.length ?? 0;

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
      return null;
    }
  }

  async syncCharacterPets(
    nameSlug: string,
    realmSlug: string,
    petsResponse: BlizzardApiPetsCollection,
    isIndex = false,
  ): Promise<Partial<IPets> | null> {
    const petsCollection: Partial<IPets> = {};

    try {
      const hashB: Array<string | number> = [];
      const hashA: Array<string | number> = [];
      const petsEntities = new Map<number, PetsEntity>([]);

      const { pets } = petsResponse ?? {};

      if (pets?.length) {
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

      petsCollection.petsNumber = pets?.length ?? 0;

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
      return null;
    }
  }

  async syncCharacterProfessions(
    nameSlug: string,
    realmSlug: string,
    professionsData: BlizzardApiCharacterProfessions,
  ): Promise<string[] | null> {
    const professionsSummary: string[] = [];

    try {
      if (!professionsData) {
        return null;
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
              try {
                const { profession, tiers, specialization: profSpecialization } = prof;
                const { id: professionId, name: professionName } = profession;

                const resolvedTiers: any[] =
                  tiers?.length > 0
                    ? tiers
                    : prof.skill_points != null
                      ? [
                          {
                            tier: null,
                            skill_points: prof.skill_points,
                            max_skill_points: prof.max_skill_points ?? null,
                          },
                        ]
                      : [];

                resolvedTiers.forEach((tier: any) => {
                  const { tier: tierInfo, skill_points, max_skill_points } = tier;
                  const tierId = tierInfo?.id ?? null;
                  const tierName = tierInfo?.name ?? null;

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
                  let tierMatched = false;
                  if (tierName) {
                    Array.from(EXPANSION_TICKER_MAP.entries()).some(([key, ticker]) => {
                      if (tierName.includes(key)) {
                        expansionTicker = ticker;
                        tierMatched = true;
                        return true;
                      }
                      return false;
                    });
                    if (!tierMatched) {
                      this.logger.warn(
                        `syncCharacterProfessions: tier "${tierName}" matched no EXPANSION_TICKER_MAP key; falling back to CLSC`,
                      );
                    }
                  }
                  const specializationSuffix = profSpecialization?.name ? ` (${profSpecialization.name})` : '';
                  const tickerPrefix = tierMatched ? `${expansionTicker} ` : '';
                  professionsSummary.push(
                    `${tickerPrefix}${professionName}${specializationSuffix} ${skill_points}/${max_skill_points}`,
                  );
                });
              } catch (error) {
                this.logger.error(
                  formatServiceErrorLog(
                    'syncCharacterProfessions',
                    `${nameSlug}@${realmSlug}`,
                    0,
                    error instanceof Error ? error.message : String(error),
                    'processProfession',
                  ),
                );
              }
            }, 5),
          ),
          { defaultValue: undefined },
        );
      }

      if (professionRecords.length > 0) {
        await this.upsertProfessions(characterGuid, professionRecords);
      }

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
      return null;
    }
  }

  private async upsertProfessions(characterGuid: string, records: CharactersProfessionsEntity[]): Promise<void> {
    const upsertParams: Array<string | number | boolean | null> = [];

    const upsertValues = records
      .map((record) => {
        upsertParams.push(
          characterGuid,
          record.professionId,
          record.professionName ?? null,
          record.tierId ?? null,
          record.tierName ?? null,
          record.skillPoints ?? null,
          record.maxSkillPoints ?? null,
          record.isPrimary,
          record.specialization ?? null,
        );
        const base = upsertParams.length - 9;
        return `(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
      })
      .join(', ');

    const upsert = await this.charactersProfessionsRepository.query(
      `INSERT INTO characters_professions
         (uuid, character_guid, profession_id, profession_name, tier_id, tier_name,
          skill_points, max_skill_points, is_primary, specialization)
       VALUES ${upsertValues}
       ON CONFLICT (character_guid, profession_id, tier_id) DO UPDATE SET
         profession_name = EXCLUDED.profession_name,
         tier_name = EXCLUDED.tier_name,
         skill_points = EXCLUDED.skill_points,
         max_skill_points = EXCLUDED.max_skill_points,
         is_primary = EXCLUDED.is_primary,
         specialization = EXCLUDED.specialization,
         updated_at = now()
       WHERE characters_professions.profession_name IS DISTINCT FROM EXCLUDED.profession_name
          OR characters_professions.tier_name IS DISTINCT FROM EXCLUDED.tier_name
          OR characters_professions.skill_points IS DISTINCT FROM EXCLUDED.skill_points
          OR characters_professions.max_skill_points IS DISTINCT FROM EXCLUDED.max_skill_points
          OR characters_professions.is_primary IS DISTINCT FROM EXCLUDED.is_primary
          OR characters_professions.specialization IS DISTINCT FROM EXCLUDED.specialization`,
      upsertParams,
    );

    // drop professions/tiers no longer present on the character
    // (COALESCE sentinel kills NULL semantics of NOT IN against tier-less rows)
    const deleteParams: Array<string | number | null> = [characterGuid];

    const deleteValues = records
      .map((record) => {
        deleteParams.push(record.professionId, record.tierId ?? -1);
        return `($${deleteParams.length - 1}::int, $${deleteParams.length}::int)`;
      })
      .join(', ');

    const removed = await this.charactersProfessionsRepository.query(
      `DELETE FROM characters_professions
       WHERE character_guid = $1
         AND ROW(profession_id, COALESCE(tier_id, -1)) NOT IN (VALUES ${deleteValues})`,
      deleteParams,
    );

    this.logger.verbose({
      logTag: 'upsertProfessions',
      characterGuid,
      total: records.length,
      changed: upsert.rowCount ?? 0,
      removed: removed.rowCount ?? 0,
    });
  }
}
