import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';

import { RealmDto } from '@app/resources';

@Injectable()
export class RealmOsintService {
  private readonly logger = new Logger(RealmOsintService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  async getRealmPopulation(realmId: string): Promise<string[]> {
    const logTag = 'getRealmPopulation';
    try {
      this.logger.log({
        logTag,
        realmId,
        message: `Fetching realm population for: ${realmId}`,
      });

      const mockPopulation = [realmId, `${realmId}-population-data`];

      this.logger.warn({
        logTag,
        realmId,
        message: `Returning mock data for realm population: ${realmId}`,
      });
      return mockPopulation;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        realmId,
        errorOrException,
        message: `Error fetching realm population: ${realmId}`,
      });

      throw new ServiceUnavailableException(
        `Error fetching realm population for ${realmId}`,
      );
    }
  }

  async getRealms(input: RealmDto) {
    const logTag = 'getRealms';
    try {
      this.logger.log({
        logTag,
        filters: input,
        message: 'Fetching realms with filters',
      });

      const realms = await this.realmsRepository.findBy(input);

      this.logger.log({
        logTag,
        realmCount: realms.length,
        message: `Found ${realms.length} realms matching criteria`,
      });
      return realms;
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error fetching realms',
      });

      throw new ServiceUnavailableException('Error fetching realms data');
    }
  }
}
