import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { postgresConfig, redisConfig } from '@app/configuration';
import { GuildsService } from './guilds.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';
import { guildsQueue } from '@app/resources';
import { BattleNetModule } from '@app/battle-net';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity, CharactersEntity]),
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
