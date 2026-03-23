import { Injectable } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
// TODO: Remove BlizzAPI import and reimplement with new Blizzard API client
// import { BlizzAPI } from '@alexzedim/blizzapi';
import { apiConstParams, BattleNetApiNamespace } from '@app/battle-net';
import { API_HEADERS_ENUM, TOLERANCE_ENUM } from '@app/resources';

@Injectable()
export class TestsDma {
  // private readonly logger = new Logger(TestsDma.name, { timestamp: true });

  // TODO: Replace with new Blizzard API client implementation
  // private BNet: any = new BlizzAPI({
  //   region: 'eu',
  //   clientId: cmnwConfig.clientId,
  //   clientSecret: cmnwConfig.clientSecret,
  // });

  // TODO: Blizzard API call skipped - reimplement with new client
  async commodity(): Promise<any> {
    // return this.BNet.query('/data/wow/auctions/commodities', apiConstParams(BattleNetApiNamespace.DYNAMIC));
    throw new Error('TODO: Blizzard API call skipped - reimplement with new client');
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async auctions(connectedRealmId: number): Promise<any> {
    // return this.BNet.query(
    //   `/data/wow/connected-realm/${connectedRealmId}/auctions`,
    //   apiConstParams(BattleNetApiNamespace.DYNAMIC),
    // );
    throw new Error('TODO: Blizzard API call skipped - reimplement with new client');
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async wowToken(): Promise<any> {
    // return this.BNet.query('/data/wow/token/index', apiConstParams(BattleNetApiNamespace.DYNAMIC));
    throw new Error('TODO: Blizzard API call skipped - reimplement with new client');
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async item(itemId: number): Promise<any> {
    // return this.BNet.query(
    //   `/data/wow/item/${itemId}`,
    //   apiConstParams(BattleNetApiNamespace.STATIC, TOLERANCE_ENUM.DMA),
    // );
    throw new Error('TODO: Blizzard API call skipped - reimplement with new client');
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async itemMedia(itemId: number): Promise<any> {
    // return this.BNet.query(
    //   `/data/wow/media/item/${itemId}`,
    //   apiConstParams(BattleNetApiNamespace.STATIC, TOLERANCE_ENUM.DMA),
    // );
    throw new Error('TODO: Blizzard API call skipped - reimplement with new client');
  }
}
