import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { dmaConfig } from '@app/configuration';
import { S3Service } from '@app/s3';
import csv from 'async-csv';
import { lastValueFrom, mergeMap, range } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';
import {
  EXPANSION_TICKER_ID,
  getKey,
  GLOBAL_KEY,
  GOLD_ITEM_ENTITY,
  IItemMessageBase,
  IItemsParse,
  ItemMessageDto,
  itemsQueue,
  toStringOrNumber,
} from '@app/resources';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ItemsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ItemsService.name, { timestamp: true });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectQueue(itemsQueue.name)
    private readonly queue: Queue<IItemMessageBase>,
    private readonly s3Service: S3Service,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexItems(
      GLOBAL_KEY,
      1,
      250_000,
      dmaConfig.isItemsForceUpdate,
      dmaConfig.isItemsIndex,
    );

    await this.buildItems(dmaConfig.isItemsBuild);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexItems(
    clearance: string = GLOBAL_KEY,
    from = 0,
    to = 250_000,
    isItemsForceUpdate = true,
    isItemsIndex = true,
  ): Promise<void> {
    const logTag = this.indexItems.name;
    try {
      this.logger.log({
        logTag,
        isItemsIndex,
        isItemsForceUpdate,
        from,
        to,
        message: `Index items: enabled=${isItemsIndex}, forceUpdate=${isItemsForceUpdate}, range=${from}-${to}`,
      });
      if (!isItemsIndex) return;

      const count = Math.abs(from - to);
      const key = await getKey(this.keysRepository, clearance);

      const goldItemEntity = this.itemsRepository.create(GOLD_ITEM_ENTITY);
      await this.itemsRepository.save(goldItemEntity);

      await lastValueFrom(
        range(from, count).pipe(
          mergeMap(async (itemId) => {
            if (!isItemsForceUpdate) {
              const isItemExists = await this.itemsRepository.exists({
                where: { id: itemId },
              });

              if (isItemExists) return;
            }

            const itemMessage = ItemMessageDto.create({
              itemId: itemId,
              region: 'eu',
              clientId: key.client,
              clientSecret: key.secret,
              accessToken: key.token,
            });

            await this.queue.add(
              itemMessage.name,
              itemMessage.data,
              itemMessage.opts,
            );

            this.logger.log({
              logTag,
              itemId,
              message: `Item ${itemId} placed in queue`,
            });
          }),
        ),
      );
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  async buildItems(isItemsBuild = false): Promise<void> {
    const logTag = this.buildItems.name;
    try {
      this.logger.log({
        logTag,
        isItemsBuild,
        message: `Build items enabled: ${isItemsBuild}`,
      });
      if (!isItemsBuild) return;

      // Check if itemsparse.csv exists in S3
      const fileName = 'itemsparse.csv';
      const fileExists = await this.s3Service.fileExists(fileName, 'cmnw');

      if (!fileExists) {
        this.logger.warn({
          logTag,
          fileName,
          bucket: 'cmnw',
          message: `File not found in S3 bucket`,
        });
        return;
      }

      await this.extendItemsWithExpansionTicker(fileName);
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  async extendItemsWithExpansionTicker(fileName: string) {
    const logTag = this.extendItemsWithExpansionTicker.name;
    try {
      // Read CSV file from S3
      const csvString = await this.s3Service.readFile(fileName, 'cmnw');
      this.logger.log({
        logTag,
        fileName,
        bucket: 'cmnw',
        message: 'CSV file loaded from S3',
      });

      const rows = await csv.parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: number | string) => toStringOrNumber(value),
      });

      this.logger.log({
        logTag,
        rowCount: rows.length,
        message: `Processing ${rows.length} rows from CSV`,
      });

      for (const row of rows as Array<IItemsParse>) {
        const { ID: itemId, Stackable: stackable, ExpansionID: expansionId } = row;
        const itemEntity: Partial<ItemsEntity> = {
          stackable,
        };

        const hasExpansion = EXPANSION_TICKER_ID.has(expansionId);
        if (hasExpansion) {
          itemEntity.expansion = EXPANSION_TICKER_ID.get(expansionId);
        }

        await this.itemsRepository.update({ id: itemId }, itemEntity);
      }

      this.logger.log({
        logTag,
        rowCount: rows.length,
        message: `Successfully processed ${rows.length} items`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, fileName, errorOrException });
      throw errorOrException;
    }
  }
}
