import { BattleNetModule } from '@app/battle-net';
import { postgresConfig, redisConfig } from '@app/configuration';
import { CharactersEntity, GuildHallOfFameEntity, GuildsEntity, KeysEntity } from '@app/pg';
import { guildsQueue } from '@app/resources';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { GuildsService } from './guilds.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity, GuildHallOfFameEntity, CharactersEntity]),
    BullModule.forRoot({
      connection: guildsQueue.connection,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      connection: guildsQueue.connection,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BattleNetModule,
  ],
  controllers: [],
  providers: [BattleNetModule, GuildsService],
})
export class GuildsModule {}
