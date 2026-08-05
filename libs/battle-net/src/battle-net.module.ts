import { KeysEntity } from '@app/pg';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleNetService } from './battle-net.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([KeysEntity]),
  ],
  providers: [BattleNetService],
  exports: [BattleNetService, HttpModule, TypeOrmModule],
})
export class BattleNetModule {}
