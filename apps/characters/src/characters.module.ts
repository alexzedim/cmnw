import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue } from '@app/resources';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, KeysEntity } from '@app/pg';
import { bullConfig, postgresConfig, redisConfig, s3Config } from '@app/configuration';
import { S3Module } from '@app/s3';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    S3Module.forRoot(s3Config),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, CharactersEntity]),
    BullModule.forRoot({
      connection: {
        host: bullConfig.host,
        port: bullConfig.port,
        password: bullConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [CharactersService],
})
export class CharactersModule {}
