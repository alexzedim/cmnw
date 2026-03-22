import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleNetService } from './battle-net.service';
import { KeysEntity } from '@app/pg';

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
