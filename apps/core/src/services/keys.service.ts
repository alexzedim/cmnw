import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { S3Service } from '@app/s3';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { ArrayContains, Repository } from 'typeorm';
import { LoggerService } from '@app/logger';
import {
  GLOBAL_BLIZZARD_KEY,
  GLOBAL_WCL_KEY_V2,
  GLOBAL_WCL_KEY_V1,
  IKeyConfig,
  IKeysJson,
} from '@app/resources';

@Injectable()
export class KeysService implements OnApplicationBootstrap {
  private readonly logger = new LoggerService(KeysService.name);

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
      let keysJson: string;
      try {
        keysJson = await this.s3Service.readFile('keys.json', 'cmnw');
        this.logger.log({ logTag, message: 'Keys loaded from S3 (cmnw)' });
      } catch (error) {
        this.logger.error({
          logTag,
          errorOrException: error,
          message: 'File not found in S3 bucket cmnw',
        });
        throw new Error(`Keys configuration file not found in S3`);
      }

      const { keys } = JSON.parse(keysJson) as IKeysJson;

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
      this.logger.error({ logTag, errorOrException });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexBlizzardKeys(): Promise<void> {
    const logTag = this.indexBlizzardKeys.name;
    try {
      const keysEntity = await this.keysRepository.findBy({
        tags: ArrayContains([GLOBAL_BLIZZARD_KEY]),
      });

      for (const keyEntity of keysEntity) {
        const { data } = await this.httpService.axiosRef.request<{ access_token: string; expires_in: number }>({
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
        this.logger.log({
          logTag,
          client: keyEntity.client,
          message: `Updated Blizzard key: ${keyEntity.client}`,
        });

        await this.keysRepository.save(keyEntity);
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
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
        const { data } = await this.httpService.axiosRef.request<{ access_token: string; expires_in: number }>({
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

        keyEntity.token = data.access_token;
        keyEntity.expiredIn = data.expires_in;

        await this.keysRepository.save(keyEntity);
        this.logger.log({
          logTag,
          client: keyEntity.client,
          keyType: 'wcl',
          message: `Updated WCL key: ${keyEntity.client}`,
        });
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }
}
