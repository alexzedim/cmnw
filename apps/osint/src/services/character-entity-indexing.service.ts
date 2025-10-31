import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { MountsEntity, PetsEntity } from '@app/pg';

@Injectable()
export class CharacterEntityIndexingService {
  private readonly logger = new Logger(CharacterEntityIndexingService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(PetsEntity)
    private readonly petsRepository: Repository<PetsEntity>,
    @InjectRepository(MountsEntity)
    private readonly mountsRepository: Repository<MountsEntity>,
  ) {}

  async indexMounts(mountEntities: MountsEntity[]): Promise<void> {
    try {
      const mounts = Array.from(mountEntities.values());

      await this.mountsRepository.upsert(mounts, {
        conflictPaths: ['id'],
        skipUpdateIfNoValuesChanged: true,
      });
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'indexMounts',
        error: JSON.stringify(errorOrException),
      });
    }
  }

  async indexPets(petEntities: Map<number, PetsEntity>): Promise<void> {
    try {
      const pets = Array.from(petEntities.values());

      await Promise.allSettled(
        pets.map(async (pet) => {
          const isPetExists = await this.petsRepository.existsBy({
            id: pet.id,
          });

          const isNewPet = !isPetExists;
          if (isNewPet) {
            await this.petsRepository.save(pet);
            await this.redisService.set(`PETS:${pet.id}`, 1);
          }
        }),
      );
    } catch (errorOrException) {
      this.logger.error({
        logTag: 'indexPets',
        error: JSON.stringify(errorOrException),
      });
    }
  }
}
