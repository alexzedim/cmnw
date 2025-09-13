import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { coreConfig } from '@app/configuration';
import { S3Service } from '@app/s3';
import { IKeyConfig } from '@app/configuration/interfaces/key.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { ArrayContains, Repository } from 'typeorm';
import {
  BlizzardApiKeys,
  GLOBAL_BLIZZARD_KEY,
  GLOBAL_WCL_KEY_V2,
  IWarcraftLogsToken,
  KEY_LOCK_ERRORS_NUM,
  KEY_STATUS,
} from '@app/resources';

@Injectable()
export class KeysService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeysService.name, { timestamp: true });

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly s3Service: S3Service,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.initKeys();
    await this.indexWarcraftLogsKeys();
    await this.indexBlizzardKeys();
  }

  private async initKeys(): Promise<void> {
    const logTag = this.initKeys.name;
    try {
      // Load keys from S3 cmnw-default bucket
      const s3Key = `config/${coreConfig.path.split('/').pop()}`;
      
      let keysJson: string;
      try {
        keysJson = await this.s3Service.readFile(s3Key, 'cmnw-default');
        this.logger.log(`${logTag}: Keys loaded from S3 (cmnw-default)`);
      } catch (error) {
        this.logger.error(`${logTag}: File not found in S3 bucket 'cmnw-default': ${s3Key}`);
        throw new Error(`Keys configuration file not found in S3: ${s3Key}`);
      }
      
      const { keys } = JSON.parse(keysJson);

      await lastValueFrom(
        from(keys).pipe(
          mergeMap(async (key: IKeyConfig) => {
            let keyEntity = await this.keysRepository.findOneBy({
              client: key.client,
            });
            if (!keyEntity) {
              keyEntity = this.keysRepository.create(key);
              await this.keysRepository.save(keyEntity);
            }
          }, 5),
        ),
      );
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: errorOrException,
        }
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexBlizzardKeys(): Promise<void> {
    const logTag = this.indexBlizzardKeys.name;
    try {
      const now = DateTime.now();
      const keysEntity = await this.keysRepository.findBy({
        tags: ArrayContains([GLOBAL_BLIZZARD_KEY]),
      });

      for (const keyEntity of keysEntity) {
        const isResetErrorsCount =
          keyEntity.status != KEY_STATUS.FREE &&
          keyEntity.resetAt &&
          DateTime.fromJSDate(keyEntity.resetAt) < now;

        if (isResetErrorsCount) {
          keyEntity.resetAt = now.toJSDate();
          keyEntity.errorCounts = 0;
          keyEntity.status = KEY_STATUS.FREE;
        }

        const isTooManyErrors =
          keyEntity.errorCounts > KEY_LOCK_ERRORS_NUM &&
          Boolean(keyEntity.status != KEY_STATUS.TOO_MANY_REQUESTS);

        if (isTooManyErrors) {
          keyEntity.status = KEY_STATUS.TOO_MANY_REQUESTS;
          keyEntity.resetAt = now.plus({ hour: 2 }).toJSDate();
        }

        const { data } = await this.httpService.axiosRef.request<BlizzardApiKeys>({
          url: 'https://eu.battle.net/oauth/token',
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          params: {
            grant_type: 'client_credentials',
          },
          auth: {
            username: keyEntity.client,
            password: keyEntity.secret,
          },
        });

        keyEntity.token = data.access_token;
        keyEntity.expiredIn = data.expires_in;
        this.logger.log(`Updated: key ${keyEntity.client}`);

        await this.keysRepository.save(keyEntity);
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: errorOrException,
        }
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexWarcraftLogsKeys(): Promise<void> {
    const logTag = this.indexWarcraftLogsKeys.name;
    try {
      const keyEntities = await this.keysRepository.findBy({
        tags: ArrayContains([GLOBAL_WCL_KEY_V2]),
      });

      for (const keyEntity of keyEntities) {
        const { data } = await this.httpService.axiosRef.request<
          Partial<IWarcraftLogsToken>
        >({
          method: 'post',
          url: 'https://www.warcraftlogs.com/oauth/token',
          data: {
            grant_type: 'client_credentials',
          },
          auth: {
            username: keyEntity.client,
            password: keyEntity.secret,
          },
        });
        this.logger.debug(data);
        keyEntity.token = data.access_token;
        keyEntity.expiredIn = data.expires_in;

        await this.keysRepository.save(keyEntity);
        this.logger.log(`Updated: key ${keyEntity.client} | wcl`);
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: errorOrException,
        }
      );
    }
  }
}
