import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BattleNetClient } from './battle-net-client';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [BattleNetClient],
  exports: [BattleNetClient, HttpModule],
})
export class BattleNetModule {}
