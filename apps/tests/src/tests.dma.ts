import { Injectable } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { apiConstParams, BattleNetApiNamespace } from '@app/battle-net';
import { API_HEADERS_ENUM, TOLERANCE_ENUM } from '@app/resources';

@Injectable()
export class TestsDma {
  // private readonly logger = new Logger(TestsDma.name, { timestamp: true });

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: cmnwConfig.clientId,
    clientSecret: cmnwConfig.clientSecret,
  });

  async commodity(): Promise<any> {
    return this.BNet.query('/data/wow/auctions/commodities', apiConstParams(BattleNetApiNamespace.DYNAMIC));
  }

  async auctions(connectedRealmId: number): Promise<any> {
    return this.BNet.query(
      `/data/wow/connected-realm/${connectedRealmId}/auctions`,
      apiConstParams(BattleNetApiNamespace.DYNAMIC),
    );
  }

  async wowToken(): Promise<any> {
    return this.BNet.query('/data/wow/token/index', apiConstParams(BattleNetApiNamespace.DYNAMIC));
  }

  async item(itemId: number): Promise<any> {
    return this.BNet.query(
      `/data/wow/item/${itemId}`,
      apiConstParams(BattleNetApiNamespace.STATIC, TOLERANCE_ENUM.DMA),
    );
  }

  async itemMedia(itemId: number): Promise<any> {
    return this.BNet.query(
      `/data/wow/media/item/${itemId}`,
      apiConstParams(BattleNetApiNamespace.STATIC, TOLERANCE_ENUM.DMA),
    );
  }
}
