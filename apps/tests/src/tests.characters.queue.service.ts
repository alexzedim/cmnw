import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RabbitMQPublisherService } from '@app/rabbitmq';
import {
  CharacterMessageDto,
  charactersQueue,
  delay,
  FACTION,
  getKeys,
  GLOBAL_OSINT_KEY,
} from '@app/resources';
import { CharactersEntity, KeysEntity } from '@app/pg';

@Injectable()
export class TestsCharactersQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsCharactersQueueService.name, {
    timestamp: true,
  });

  constructor(
    private readonly publisher: RabbitMQPublisherService,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.publishRandomCharacterMessages();
  }

  private async publishRandomCharacterMessages(): Promise<void> {
    const logTag = 'publishRandomCharacterMessages';
    const randomCount = this.getEnvNumber('TESTS_CHARACTERS_RANDOM_COUNT', 10);

    const charactersEntities = await this.buildCharacterSeeds(randomCount);
    if (!charactersEntities.length) {
      this.logger.warn({ logTag, message: 'No character seeds to publish' });
      return;
    }

    const keys = await getKeys(this.keysRepository, GLOBAL_OSINT_KEY, true);
    if (!keys.length) {
      this.logger.warn({ logTag, message: 'No OSINT keys found' });
      return;
    }

    const messages: CharacterMessageDto[] = [];
    let iteration = 0;

    for (const charactersEntity of charactersEntities) {
      const key = keys[iteration % keys.length];
      const credentials = {
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      };

      messages.push(
        CharacterMessageDto.fromWarcraftLogs({
          name: charactersEntity.name,
          realm: charactersEntity.realm,
          timestamp: Date.now(),
          ...credentials,
        }),
        CharacterMessageDto.fromMythicPlusLadder({
          id: charactersEntity.id,
          name: charactersEntity.name,
          realm: charactersEntity.realm,
          faction: charactersEntity.faction,
          ...credentials,
        }),
        CharacterMessageDto.fromPvPLadder({
          name: charactersEntity.name,
          realm: charactersEntity.realm,
          faction: charactersEntity.faction ?? FACTION.H,
          ...credentials,
        }),
        CharacterMessageDto.fromGuildMaster({
          guildId: charactersEntity.guildId,
          guildGuid: charactersEntity.guildGuid,
          id: charactersEntity.id,
          name: charactersEntity.name,
          realm: charactersEntity.realm,
          guild: charactersEntity.guild,
          class: charactersEntity.class ?? null,
          race: charactersEntity.race ?? null,
          faction: charactersEntity.faction ?? null,
          level: charactersEntity.level ?? null,
          lastModified: new Date(),
          ...credentials,
        }),
        CharacterMessageDto.fromCharacterIndex({
          guid: charactersEntity.guid,
          name: charactersEntity.name,
          realm: charactersEntity.realm,
          iteration,
          ...credentials,
        }),
        CharacterMessageDto.fromMigrationFile({
          guid: charactersEntity.guid,
          ...credentials,
        }),
      );

      if (charactersEntity.realmId && charactersEntity.realmName) {
        messages.push(
          CharacterMessageDto.fromWowProgressLfg({
            name: charactersEntity.name,
            realm: charactersEntity.realm,
            realmId: charactersEntity.realmId,
            realmName: charactersEntity.realmName,
            ...credentials,
          }),
        );
      }

      messages.push(
        await CharacterMessageDto.fromCharacterRequest({
          name: charactersEntity.name,
          realm: charactersEntity.realm,
          ...credentials,
        }),
      );

      iteration += 1;
    }

    for (const message of messages) {
      await delay(3);
      await this.publisher.publishMessage(charactersQueue.exchange, message);
    }

    this.logger.log({
      logTag,
      characterCount: charactersEntities.length,
      messageCount: messages.length,
      message: 'Published test character messages',
    });
  }

  private async buildCharacterSeeds(
    randomCount: number,
  ): Promise<CharactersEntity[]> {
    const hardcodedSeeds = [
      {
        guid: 'инициатива@gordunni',
      },
    ];

    const randomEntities = await this.charactersRepository
      .createQueryBuilder('c')
      .orderBy('RANDOM()')
      .take(randomCount)
      .getMany();

    const randomSeeds = await this.charactersRepository.findBy({
      guid: In(hardcodedSeeds.map((s) => s.guid)),
    });

    return [...randomSeeds, ...randomEntities];
  }

  private getEnvNumber(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
