import { Module } from '@nestjs/common';
import { postgresConfig } from '@app/configuration';
import { RabbitMQModule } from '@app/rabbitmq';
import { OsintController } from './osint.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AnalyticsEntity,
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  CharactersProfileEntity,
  GuildsEntity,
  KeysEntity,
  CharactersGuildsLogsEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';
import {
  CharacterOsintService,
  GuildOsintService,
  RealmOsintService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      AnalyticsEntity,
      CharactersEntity,
      CharactersGuildsMembersEntity,
      CharactersMountsEntity,
      CharactersPetsEntity,
      CharactersProfessionsEntity,
      CharactersProfileEntity,
      GuildsEntity,
      KeysEntity,
      MountsEntity,
      PetsEntity,
      ProfessionsEntity,
      RealmsEntity,
      CharactersGuildsLogsEntity,
    ]),
    RabbitMQModule,
  ],
  controllers: [OsintController],
  providers: [CharacterOsintService, GuildOsintService, RealmOsintService],
})
export class OsintModule {}
