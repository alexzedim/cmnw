import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
import { BlizzAPI } from '@alexzedim/blizzapi';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  getKey,
  getKeys,
  GLOBAL_WCL_KEY_V1,
  GLOBAL_WCL_KEY_V2,
} from '@app/resources';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';

@Injectable()
export class TestsCore implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsCore.name, { timestamp: true });

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: cmnwConfig.clientId,
    clientSecret: cmnwConfig.clientSecret,
  });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {}

  async onApplicationBootstrap() {
    console.log('--- TestsCore onApplicationBootstrap ---');
    const r = await this.leadingGroups();
    console.log(JSON.stringify(r));
    console.log('--- | ---');
  }

  async characterStats(nameSlug: string, realmSlug: string): Promise<any> {
    try {
      this.logger.log(`${nameSlug}:${realmSlug}`);

      return await this.BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/statistics`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );
    } catch (errorOrException) {
      this.logger.error({
        context: 'logs',
        guid: 'guid',
        error: JSON.stringify(errorOrException),
      });
      return errorOrException;
    }
  }

  async dungeonIndex(): Promise<any> {
    return this.BNet.query(
      `/data/wow/mythic-keystone/dungeon/index`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async mythicLeaderboard() {
    return this.BNet.query(
      `/data/wow/connected-realm/1615/mythic-leaderboard/index `,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async seasonIndex(): Promise<any> {
    return this.BNet.query(
      `/data/wow/mythic-keystone/season/index`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async seasonOne() {
    return await this.BNet.query<any>(
      `/data/wow/mythic-keystone/season/1`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async leadingGroups() {
    return await this.BNet.query<any>(
      `/data/wow/connected-realm/1615/mythic-leaderboard/197/period/641`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async getWclKeys() {
    const keyV1 = await getKey(this.keysRepository, GLOBAL_WCL_KEY_V1);
    const keysV1 = await getKeys(this.keysRepository, GLOBAL_WCL_KEY_V1);
    const keyV2 = await getKey(this.keysRepository, GLOBAL_WCL_KEY_V2);
    const keysV2 = await getKeys(this.keysRepository, GLOBAL_WCL_KEY_V2);

    return [keyV1, keysV1, keyV2, keysV2];
  }
}
