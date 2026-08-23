import { BATTLE_NET_DMA_TIMEOUT, BattleNetNamespace, BattleNetService } from '@app/battle-net';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TestsDma {
  constructor(private readonly battleNetService: BattleNetService) {}

  async commodity(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query('/data/wow/auctions/commodities', options);
  }

  async auctions(connectedRealmId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query(`/data/wow/connected-realm/${connectedRealmId}/auctions`, options);
  }

  async wowToken(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query('/data/wow/token/index', options);
  }

  async item(itemId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.STATIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query(`/data/wow/item/${itemId}`, options);
  }

  async itemMedia(itemId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.STATIC, BATTLE_NET_DMA_TIMEOUT);
    return this.battleNetService.query(`/data/wow/media/item/${itemId}`, options);
  }
}
