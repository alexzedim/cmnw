import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { BattleNetService, BattleNetNamespace } from '@app/battle-net';
import { BATTLE_NET_OSINT_TIMEOUT } from '@app/battle-net';
import { BlizzardApiResponse, GLOBAL_KEY } from '@app/resources';

@Injectable()
export class TestsOsint implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsOsint.name, { timestamp: true });

  constructor(private readonly battleNetService: BattleNetService) {}

  async onApplicationBootstrap() {
    await this.battleNetService.initialize(GLOBAL_KEY);
  }

  async realm(realmSlug: string): Promise<BlizzardApiResponse> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query<BlizzardApiResponse>(`/data/wow/realm/${realmSlug}`, options);
  }

  async connectedRealm(connectedRealmId: number): Promise<BlizzardApiResponse> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.DYNAMIC, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query<BlizzardApiResponse>(`/data/wow/connected-realm/${connectedRealmId}`, options);
  }

  async summary(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query<BlizzardApiResponse>(`/profile/wow/character/${realmSlug}/${nameSlug}`, options);
  }

  async status(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query<BlizzardApiResponse>(
      `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
      options,
    );
  }

  async mounts(characterName: string, realmSlug: string): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query(
      `/profile/wow/character/${realmSlug}/${characterName}/collections/mounts`,
      options,
    );
  }

  async pets(characterName: string, realmSlug: string): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query(
      `/profile/wow/character/${realmSlug}/${characterName}/collections/pets`,
      options,
    );
  }

  async professions(characterName: string, realmSlug: string): Promise<BlizzardApiResponse> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query<BlizzardApiResponse>(
      `/profile/wow/character/${realmSlug}/${characterName}/professions`,
      options,
    );
  }

  async guild(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query<BlizzardApiResponse>(`/data/wow/guild/${realmSlug}/${nameSlug}`, options);
  }

  async guildRoster(nameSlug: string, realmSlug: string): Promise<any> {
    const options = this.battleNetService.createQueryOptions(BattleNetNamespace.PROFILE, BATTLE_NET_OSINT_TIMEOUT);
    return this.battleNetService.query(`/data/wow/guild/${realmSlug}/${nameSlug}/roster`, options);
  }
}
