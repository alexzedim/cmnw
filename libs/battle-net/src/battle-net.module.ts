import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BattleNetService } from './battle-net.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [BattleNetService],
  exports: [BattleNetService, HttpModule],
})
export class BattleNetModule {}
