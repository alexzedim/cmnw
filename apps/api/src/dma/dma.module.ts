import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { RabbitMQModule } from '@app/rabbitmq';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity, ContractEntity } from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      ItemsEntity,
      KeysEntity,
      MarketEntity,
      ContractEntity,
    ]),
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
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
