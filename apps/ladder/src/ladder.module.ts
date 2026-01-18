import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { LadderService } from './ladder.service';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RabbitMQModule } from '@app/rabbitmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    RabbitMQModule,
  ],
  controllers: [],
  providers: [LadderService],
})
export class LadderModule {}
