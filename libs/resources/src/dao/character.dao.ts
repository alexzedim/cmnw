import type { CharactersEntity, GuildsEntity, RealmsEntity } from '@app/pg';
import { findRealm, type ICharacterGuildMember, OSINT_SOURCE, toGuid } from '@app/resources';
import type { Repository } from 'typeorm';
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
    const isUpdateByGuild = isGuildUpdateMoreRecent(guildEntity.lastModified, characterEntity.updatedAt);

    if (isUpdateByGuild) {
      characterEntity.guildGuid = guildEntity.guid;
      characterEntity.guild = guildEntity.name;
      characterEntity.guildId = guildEntity.id;
      characterEntity.guildRank = guildMember.rank;
      if (guildMember.level) characterEntity.level = guildMember.level;
      if (guildMember.class) characterEntity.class = guildMember.class;
      if (guildMember.race) characterEntity.race = guildMember.race;
      if (guildMember.faction) characterEntity.faction = guildMember.faction;
      characterEntity.lastModified = guildEntity.lastModified;
      characterEntity.updatedBy = OSINT_SOURCE.GUILD_ROSTER;
      await charactersRepository.save(characterEntity);
    } else if (guildEntity.guid === characterEntity.guildGuid) {
      characterEntity.guildRank = guildMember.rank;
      if (guildMember.faction) characterEntity.faction = guildMember.faction;
      characterEntity.updatedBy = OSINT_SOURCE.GUILD_ROSTER;
      await charactersRepository.save(characterEntity);
    }
  }

  if (!characterEntity) {
    const realmEntity = await findRealm(realmsRepository, guildMember.realmSlug);

    if (!realmEntity) {
      // @todo add somekind of logging here
      return;
    }

    const realmId = realmEntity.id;
    const realm = realmEntity.slug;
    const realmName = realmEntity.name;

    characterEntity = charactersRepository.create({
      id: guildMember.id,
      guid: toGuid(guildMember.name, realmEntity.slug),
      name: guildMember.name,
      realm: realm,
      realmId: realmId,
      realmName: realmName,
      guildGuid: toGuid(guildMember.guildNameSlug, guildEntity.realm),
      guild: guildEntity.name,
      guildRank: guildMember.rank,
      guildId: guildEntity.id,
      class: guildMember.class,
      race: guildMember.race ?? null,
      faction: guildMember.faction ?? guildEntity.faction,
      level: guildMember.level,
      lastModified: guildEntity.lastModified,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
    });

    await charactersRepository.save(characterEntity);
  }
};
