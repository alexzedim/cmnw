import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  getKey,
  getKeys,
} from '@app/resources';
import { BATTLE_NET_KEY_TAG_WCL_V1, BATTLE_NET_KEY_TAG_WCL_V2 } from '@app/battle-net';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TestsCore implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsCore.name, { timestamp: true });

  // TODO: Replace with new Blizzard API client implementation
  // private BNet: any = ...;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {}

  async onApplicationBootstrap() {
    console.log('--- TestsCore onApplicationBootstrap ---');
    const r = await this.pvpSeasonLeaderboard();
    const output = JSON.stringify(r, null, 2);
    const filePath = join(process.cwd(), 'pvp-season-leaderboard.json');
    writeFileSync(filePath, output, 'utf-8');
    console.log(`PvP season leaderboard data written to: ${filePath}`);
    console.log('--- | ---');
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async characterStats(nameSlug: string, realmSlug: string): Promise<any> {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client: ${nameSlug}:${realmSlug}`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async dungeonIndex(): Promise<any> {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async mythicLeaderboard() {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async seasonIndex(): Promise<any> {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async seasonOne() {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async leadingGroups() {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async pvpIndexIndex() {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  // TODO: Blizzard API call skipped - reimplement with new client
  async pvpSeasonLeaderboard() {
    this.logger.debug(`TODO: Blizzard API call skipped - reimplement with new client`);
    return null;
  }

  async getWclKeys() {
    const keyV1 = await getKey(this.keysRepository, BATTLE_NET_KEY_TAG_WCL_V1);
    const keysV1 = await getKeys(this.keysRepository, BATTLE_NET_KEY_TAG_WCL_V1);
    const keyV2 = await getKey(this.keysRepository, BATTLE_NET_KEY_TAG_WCL_V2);
    const keysV2 = await getKeys(this.keysRepository, BATTLE_NET_KEY_TAG_WCL_V2);

    return [keyV1, keysV1, keyV2, keysV2];
  }
}
