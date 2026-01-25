import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import {
  capitalize,
  GuildExistsOrCreate,
  IGuildMessageBase,
  OSINT_SOURCE,
  TIME_MS,
  toGuid,
  toSlug,
} from '@app/resources';
import { GuildsEntity, RealmsEntity } from '@app/pg';
import { findRealm } from '@app/resources/dao/realms.dao';

@Injectable()
export class GuildService {
  private readonly logger = new Logger(GuildService.name, { timestamp: true });

  constructor(
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  async findOrCreate(guildJob: IGuildMessageBase): Promise<GuildExistsOrCreate> {
    const forceUpdate = guildJob.forceUpdate || TIME_MS.FOUR_HOURS;
    const nameSlug = toSlug(guildJob.name);
    const timestampNow = new Date().getTime();

    const realmEntity = await findRealm(this.realmsRepository, guildJob.realm);
    if (!realmEntity) {
      throw new NotFoundException(`Realm ${guildJob.realm} not found`);
    }

    const guid = toGuid(nameSlug, realmEntity.slug);
    const guildEntity = await this.guildsRepository.findOneBy({ guid });

    if (!guildEntity) {
      return this.createNew(guildJob, realmEntity);
    }

    if (guildJob.createOnlyUnique) {
      return {
        guildEntity,
        isNew: false,
        isCreateOnlyUnique: true,
        isNotReadyToUpdate: false,
      };
    }

    const updateSafe = timestampNow - forceUpdate;
    const updatedAt = guildEntity.updatedAt.getTime();
    const isNotReadyToUpdate = updateSafe < updatedAt;

    if (isNotReadyToUpdate) {
      return {
        guildEntity,
        isNew: false,
        isNotReadyToUpdate,
        isCreateOnlyUnique: false,
      };
    }

    guildEntity.status = '--';

    return {
      guildEntity,
      isNew: false,
      isNotReadyToUpdate: false,
      isCreateOnlyUnique: false,
    };
  }

  private createNew(
    guildJob: IGuildMessageBase,
    realmEntity: RealmsEntity,
  ): GuildExistsOrCreate {
    const nameSlug = toSlug(guildJob.name);
    const guid = toGuid(nameSlug, realmEntity.slug);
    const createdBy = guildJob.createdBy || OSINT_SOURCE.GUILD_GET;

    const guildNew = this.guildsRepository.create({
      guid,
      id: Number(guildJob.id) || null,
      name: capitalize(guildJob.name),
      realm: realmEntity.slug,
      realmId: realmEntity.id,
      realmName: realmEntity.name,
      status: '--',
      createdBy,
      updatedBy: OSINT_SOURCE.GUILD_GET,
    });

    return {
      guildEntity: guildNew,
      isNew: true,
      isNotReadyToUpdate: false,
      isCreateOnlyUnique: false,
    };
  }

  async save(guild: GuildsEntity): Promise<GuildsEntity> {
    return this.guildsRepository.save(guild);
  }

  async findById(id: number, realm: string): Promise<GuildsEntity | null> {
    return this.guildsRepository.findOneBy({ id, realm });
  }

  createSnapshot(guild: GuildsEntity): GuildsEntity {
    return this.guildsRepository.create(guild);
  }
}
