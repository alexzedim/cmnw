import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { apiConstParams, BattleNetApiNamespace } from '@app/battle-net';
import { API_HEADERS_ENUM, BlizzardApiResponse } from '@app/resources';
import { cmnwConfig } from '@app/configuration';

@Injectable()
export class TestsOsint implements OnApplicationBootstrap {
  // private readonly logger = new Logger(TestsOsint.name, { timestamp: true });

  // TODO: Replace with new Blizzard API client implementation
  // private BNet: any = ...;

  async onApplicationBootstrap() {
    /* _ */
    const g = await this.guild('рак-гейминг', 'soulflayer');
    console.log(JSON.stringify(g));
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async realm(realmSlug: string): Promise<BlizzardApiResponse> {
    // return this.BNet.query(`/data/wow/realm/${realmSlug}`, apiConstParams(BattleNetApiNamespace.DYNAMIC));
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async connectedRealm(connectedRealmId: number): Promise<BlizzardApiResponse> {
    // return this.BNet.query(
    //   `/data/wow/connected-realm/${connectedRealmId}`,
    //   apiConstParams(BattleNetApiNamespace.DYNAMIC),
    // );
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async summary(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    // return this.BNet.query(
    //   `/profile/wow/character/${realmSlug}/${nameSlug}`,
    //   apiConstParams(BattleNetApiNamespace.PROFILE),
    // );
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async status(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    // return this.BNet.query(
    //   `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
    //   apiConstParams(BattleNetApiNamespace.PROFILE),
    // );
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async mounts(characterName: string, realmSlug: string): Promise<any> {
    // return this.BNet.query(
    //   `/profile/wow/character/${realmSlug}/${characterName}/collections/mounts`,
    //   apiConstParams(BattleNetApiNamespace.PROFILE),
    // );
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async pets(characterName: string, realmSlug: string): Promise<any> {
    // return this.BNet.query(
    //   `/profile/wow/character/${realmSlug}/${characterName}/collections/pets`,
    //   apiConstParams(BattleNetApiNamespace.PROFILE),
    // );
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async professions(characterName: string, realmSlug: string): Promise<BlizzardApiResponse> {
    // return this.BNet.query(
    //   `/profile/wow/character/${realmSlug}/${characterName}/professions`,
    //   apiConstParams(BattleNetApiNamespace.PROFILE),
    // );
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async guild(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    // return this.BNet.query(`/data/wow/guild/${realmSlug}/${nameSlug}`, apiConstParams(BattleNetApiNamespace.PROFILE));
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async guildRoster(nameSlug: string, realmSlug: string): Promise<any> {
    // return this.BNet.query(
    //   `/data/wow/guild/${realmSlug}/${nameSlug}/roster`,
    //   apiConstParams(BattleNetApiNamespace.PROFILE),
    // );
    return null;
  }
}
