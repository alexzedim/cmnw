import { Repository } from 'typeorm';
import { CharactersEntity, GuildsEntity, RealmsEntity } from '@app/pg';
import {
  OSINT_SOURCE,
  toGuid,
  ICharacterGuildMember,
  findRealm,
} from '@app/resources';
import { isGuildUpdateMoreRecent } from '../utils/helpers';

export const characterAsGuildMember = async (
  charactersRepository: Repository<CharactersEntity>,
  realmsRepository: Repository<RealmsEntity>,
  guildEntity: GuildsEntity,
  guildMember: ICharacterGuildMember,
) => {
  let characterEntity = await charactersRepository.findOneBy({
    guid: guildMember.guid,
  });

  if (characterEntity) {
    const isUpdateByGuild = isGuildUpdateMoreRecent(
      guildEntity.lastModified,
      characterEntity.lastModified,
    );

    if (isUpdateByGuild) {
      characterEntity.guildGuid = guildEntity.guid;
      characterEntity.guild = guildEntity.name;
      characterEntity.guildId = guildEntity.id;
      characterEntity.guildRank = guildMember.rank;
      if (guildMember.level) characterEntity.level = guildMember.level;
      if (guildMember.class) characterEntity.class = guildMember.class;
      characterEntity.lastModified = guildEntity.lastModified;
      characterEntity.updatedBy = OSINT_SOURCE.GUILD_ROSTER;
      await charactersRepository.save(characterEntity);
    } else if (guildEntity.guid === characterEntity.guildGuid) {
      characterEntity.guildRank = guildMember.rank;
      characterEntity.updatedBy = OSINT_SOURCE.GUILD_ROSTER;
      await charactersRepository.save(characterEntity);
    }
  }

  if (!characterEntity) {
    const realmEntity = await findRealm(
      realmsRepository,
      guildMember.realmSlug,
    );

    if (!realmEntity) {
      // @todo add somekind of logging here
      return;
    }

    const realmId = realmEntity.id;
    const realm = realmEntity.name;
    const realmName = realmEntity.localeName;

    characterEntity = charactersRepository.create({
      id: guildMember.id,
      guid: guildMember.guid,
      name: guildMember.name,
      realm: realm,
      realmId: realmId,
      realmName: realmName,
      guildGuid: toGuid(guildMember.guildNameSlug, guildEntity.realm),
      guild: guildEntity.name,
      guildRank: guildMember.rank,
      guildId: guildEntity.id,
      class: guildMember.class,
      faction: guildEntity.faction,
      level: guildMember.level,
      lastModified: guildEntity.lastModified,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
    });

    await charactersRepository.save(characterEntity);
  }
};
