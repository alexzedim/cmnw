import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiResponse,
  IConnectedRealm,
  IRealmMessageBase,
  isFieldNamed,
  OSINT_TIMEOUT_TOLERANCE,
  REALM_TICKER,
  realmsQueue,
  toLocale,
  toSlug,
  transformConnectedRealmId,
  transformNamedField,
} from '@app/resources';
import { KeysEntity, RealmsEntity } from '@app/pg';

import { Job } from 'bullmq';
import { get } from 'lodash';

@Injectable()
@Processor(realmsQueue)
export class RealmsWorker extends WorkerHost {
  private readonly logger = new Logger(RealmsWorker.name, {
    timestamp: true,
  });

  private stats = {
    total: 0,
    success: 0,
    rateLimit: 0,
    errors: 0,
    skipped: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {
    super();
  }

  async process(job: Job<IRealmMessageBase>): Promise<void> {
    const message = job.data;
    const startTime = Date.now();
    this.stats.total++;

    try {
      await job.updateProgress(1);

      let realmEntity = await this.realmsRepository.findOneBy({ id: message.id });

      await job.updateProgress(5);

      if (!realmEntity) {
        realmEntity = this.realmsRepository.create({
          id: message.id,
        });
      }

      this.BNet = new BlizzAPI({
        region: message.region,
        clientId: message.clientId,
        clientSecret: message.clientSecret,
        accessToken: message.accessToken,
      });

      await job.updateProgress(10);

      const response: Record<string, any> = await this.BNet.query(
        `/data/wow/realm/${message.slug}`,
        apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE),
      );

      await job.updateProgress(20);

      realmEntity.id = get(response, 'id', null);
      realmEntity.slug = get(response, 'slug', null);

      await job.updateProgress(25);

      const name = isFieldNamed(response.name)
        ? get(response, 'name.name', null)
        : response.name;

      if (name) realmEntity.name = name;

      const ticker = REALM_TICKER.has(realmEntity.name)
        ? REALM_TICKER.get(realmEntity.name)
        : null;

      if (ticker) realmEntity.ticker = ticker;

      await job.updateProgress(30);

      realmEntity.locale = response.locale ? response.locale : null;

      if (realmEntity.locale != 'enGB') {
        const realmLocale = await this.BNet.query<BlizzardApiResponse>(
          `/data/wow/realm/${message.slug}`,
          apiConstParams(API_HEADERS_ENUM.DYNAMIC, OSINT_TIMEOUT_TOLERANCE, true),
        );

        await job.updateProgress(40);
        const locale = toLocale(realmEntity.locale);

        const localeName = get(realmLocale, `name.${locale}`, null);
        if (localeName) {
          realmEntity.localeName = localeName;
          realmEntity.localeSlug = toSlug(localeName);
        }
      } else {
        const localeNameSlug = get(response, 'name', null);
        if (localeNameSlug) {
          realmEntity.localeName = localeNameSlug;
          realmEntity.localeSlug = toSlug(localeNameSlug);
        }
        await job.updateProgress(45);
      }

      const region = transformNamedField(response.region);
      if (region) realmEntity.region = region;
      if (response.timezone) realmEntity.timezone = response.timezone;

      const category = get(response, 'category', null);
      if (category) realmEntity.category = category;

      const connectedRealmId = transformConnectedRealmId(response);
      if (connectedRealmId) {
        const connectedRealm = await this.BNet.query<IConnectedRealm>(
          `/data/wow/connected-realm/${connectedRealmId}`,
          apiConstParams(API_HEADERS_ENUM.DYNAMIC),
        );

        realmEntity.connectedRealmId = get(connectedRealm, 'id', null);
        realmEntity.status = get(connectedRealm, 'status.name', null);
        realmEntity.populationStatus = get(connectedRealm, 'population.name', null);
        await job.updateProgress(50);

        const isRealmsExists =
          'realms' in connectedRealm && Array.isArray(connectedRealm.realms);

        if (isRealmsExists) {
          realmEntity.connectedRealms = connectedRealm.realms.map(
            ({ slug }) => slug,
          );
        }
      }

      await this.realmsRepository.save(realmEntity);
      await job.updateProgress(100);

      // Progress report every 25 realms
      if (this.stats.total % 25 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const guid = message.id || 'unknown';

      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] ${guid} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`,
      );

      throw errorOrException;
    }
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const rate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 REALMS PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} realms processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Rate:')} ${chalk.bold(rate)} realms/sec\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.cyan.bold('  🎯 REALMS FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Realms:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.yellow('  ⊘ Skipped:')} ${chalk.yellow.bold(this.stats.skipped)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} realms/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
  }
}
