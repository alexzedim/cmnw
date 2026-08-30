import { GuildsEntity, RealmsEntity } from '@app/pg';
import {
  capitalize,
  type GuildExistsOrCreate,
  type IGuildMessageBase,
  OSINT_SOURCE,
  TIME_MS,
  toGuid,
  toSlug,
} from '@app/resources';
import { findRealm } from '@app/resources/dao/realms.dao';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

@Injectable()
export class GuildService {
  constructor(
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  async findOrCreate(guildJob: IGuildMessageBase): Promise<GuildExistsOrCreate> {
    const forceUpdate = guildJob.forceUpdate || TIME_MS.FOUR_HOURS;
    const nameSlug = toSlug(guildJob.name);
    const timestampNow = Date.now();

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
        isDead: false,
      };
    }

    if (guildEntity.isDead) {
      const isForceRefresh = guildJob.forceUpdate === TIME_MS.FORCE || Boolean(guildJob.sessionId);
      if (!isForceRefresh) {
        return {
          guildEntity,
          isNew: false,
          isCreateOnlyUnique: false,
          isNotReadyToUpdate: false,
          isDead: true,
        };
      }
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
        isDead: false,
      };
    }

    guildEntity.status = '-----';

    return {
      guildEntity,
      isNew: false,
      isNotReadyToUpdate: false,
      isCreateOnlyUnique: false,
      isDead: false,
    };
  }

  private createNew(guildJob: IGuildMessageBase, realmEntity: RealmsEntity): GuildExistsOrCreate {
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
      createdBy,
      updatedBy: OSINT_SOURCE.GUILD_GET,
    });

    return {
      guildEntity: guildNew,
      isNew: true,
      isNotReadyToUpdate: false,
      isCreateOnlyUnique: false,
      isDead: false,
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
