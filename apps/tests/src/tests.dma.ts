import { Injectable, Logger } from '@nestjs/common';
import { BattleNetService, BattleNetApiNamespace } from '@app/battle-net';
import { BATTLE_NET_DMA_TIMEOUT } from '@app/battle-net';

@Injectable()
export class TestsDma {
  private readonly logger = new Logger(TestsDma.name, { timestamp: true });

  constructor(private readonly battleNetService: BattleNetService) {}

  async commodity(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetApiNamespace.DYNAMIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query('/data/wow/auctions/commodities', options);
  }

  async auctions(connectedRealmId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetApiNamespace.DYNAMIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query(`/data/wow/connected-realm/${connectedRealmId}/auctions`, options);
  }

  async wowToken(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetApiNamespace.DYNAMIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query('/data/wow/token/index', options);
  }

  async item(itemId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetApiNamespace.STATIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query(`/data/wow/item/${itemId}`, options);
  }

  async itemMedia(itemId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetApiNamespace.STATIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query(`/data/wow/media/item/${itemId}`, options);
  }
}
