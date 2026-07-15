import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CharactersRaidLogsEntity, RealmsEntity } from '@app/pg';
import { KEY_LOCK, delay } from '@app/resources';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { WarcraftLogsService } from './warcraft-logs.service';

@Injectable()
export class WarcraftLogsMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarcraftLogsMigrationService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRedis()
    private readonly redisService: Redis,
    private readonly warcraftLogsService: WarcraftLogsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.backfillRealmSlug();
  }

  async backfillRealmSlug(): Promise<{ rowsUpdated: number; realmsProcessed: number }> {
    const logTag = 'backfillRealmSlug';
    const pendingCount = await this.charactersRaidLogsRepository.count({
      where: { realmSlug: IsNull() },
    });

    if (pendingCount === 0) {
      this.logger.log({ logTag, message: 'No raid logs to backfill realm_slug' });
      return { rowsUpdated: 0, realmsProcessed: 0 };
    }

    this.logger.log(
      chalk.cyan(`🔄 Backfilling realm_slug for ${chalk.bold(pendingCount)} raid logs`),
    );

    const isJobLocked = Boolean(await this.redisService.exists(KEY_LOCK.WARCRAFT_LOGS));
    if (isJobLocked) {
      this.logger.warn(
        chalk.yellow('⚠ Skipping backfill - WCL indexing already running, will retry on next boot'),
      );
      return { rowsUpdated: 0, realmsProcessed: 0 };
    }

    await this.redisService.set(KEY_LOCK.WARCRAFT_LOGS, '1', 'EX', 60 * 60 * 23);

    try {
      const realms = await this.realmsRepository.findBy({
        warcraftLogsId: Not(IsNull()),
        slug: Not(IsNull()),
      });

      if (!realms.length) {
        this.logger.warn({ logTag, message: 'No realms with warcraftLogsId and slug found' });
        return { rowsUpdated: 0, realmsProcessed: 0 };
      }

      let rowsUpdated = 0;

      for (let i = 0; i < realms.length; i++) {
        const realmEntity = realms[i];
        const updated = await this.backfillRealm(realmEntity);
        rowsUpdated += updated;

        this.logger.log(
          chalk.dim(
            `Progress | ${i + 1}/${realms.length} realms | ${chalk.bold(rowsUpdated)} rows updated`,
          ),
        );
      }

      this.logger.log(
        chalk.green(
          `✓ Backfill complete | ${chalk.bold(rowsUpdated)} rows updated across ${chalk.bold(realms.length)} realms`,
        ),
      );

      return { rowsUpdated, realmsProcessed: realms.length };
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
      return { rowsUpdated: 0, realmsProcessed: 0 };
    } finally {
      await this.redisService.del(KEY_LOCK.WARCRAFT_LOGS);
    }
  }

  private async backfillRealm(realmEntity: RealmsEntity): Promise<number> {
    let realmRowsUpdated = 0;

    for (let page = 1; ; page++) {
      const wclLogsFromPage =
        (await this.warcraftLogsService.getLogsFromPage(realmEntity.warcraftLogsId, page)) ?? [];

      if (!wclLogsFromPage.length) break;

      const logIds = wclLogsFromPage.map((log) => log.logId);
      const existingLogs = await this.charactersRaidLogsRepository.find({
        where: { logId: In(logIds) },
        select: ['logId', 'realmSlug'],
      });

      const toUpdate = existingLogs.filter((log) => !log.realmSlug).map((log) => log.logId);

      if (toUpdate.length > 0) {
        await this.charactersRaidLogsRepository.update(
          { logId: In(toUpdate) },
          { realmSlug: realmEntity.slug },
        );
        realmRowsUpdated += toUpdate.length;
      }

      await delay(2);
    }

    return realmRowsUpdated;
  }
}
