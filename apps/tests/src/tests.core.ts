import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BattleNetService, BattleNetNamespace, BATTLE_NET_KEY_TAG_WCL_V2 } from '@app/battle-net';
import { writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TestsCore implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsCore.name, { timestamp: true });

  constructor(private readonly battleNetService: BattleNetService) {}

  async onApplicationBootstrap() {
    console.log('--- TestsCore onApplicationBootstrap ---');
    const r = await this.pvpSeasonLeaderboard();
    const output = JSON.stringify(r, null, 2);
    const filePath = join(process.cwd(), 'pvp-season-leaderboard.json');
    writeFileSync(filePath, output, 'utf-8');
    console.log(`PvP season leaderboard data written to: ${filePath}`);
    console.log('--- | ---');
  }

  async characterStats(nameSlug: string, realmSlug: string): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE);
    return this.battleNetService.query(`/profile/wow/character/${realmSlug}/${nameSlug}/stats`, options);
  }

  async dungeonIndex(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query('/journal-expansion/index', options);
  }

  async mythicLeaderboard(connectedRealmId: number, dungeonId: number, period: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query(
      `/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`,
      options,
    );
  }

  async seasonIndex(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query('/pvp-season/index', options);
  }

  async seasonOne(seasonId: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query(`/pvp-season/${seasonId}`, options);
  }

  async leadingGroups(seasonId: number, bracketType: number): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query(`/pvp-season/${seasonId}/pvp-leaderboard/${bracketType}`, options);
  }

  async pvpIndexIndex(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query('/pvp-season/index', options);
  }

  async pvpSeasonLeaderboard(): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC);
    return this.battleNetService.query('/pvp-season/1/season/1/leaderboard/3v3', options);
  }

  async getWclKeys() {
    return this.battleNetService.getAllKeys([BATTLE_NET_KEY_TAG_WCL_V2]);
  }
}
