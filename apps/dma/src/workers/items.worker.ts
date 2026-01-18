import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import chalk from 'chalk';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { get } from 'lodash';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiItem,
  DMA_SOURCE,
  IItem,
  isItem,
  isItemMedia,
  isNamedField,
  ITEM_FIELD_MAPPING,
  ItemJobQueue,
  toGold,
  TOLERANCE_ENUM,
  VALUATION_TYPE,
  ItemMessageDto,
} from '@app/resources';
import { RabbitMQMonitorService } from '@app/rabbitmq';

@Injectable()
export class ItemsWorker {
  private readonly logger = new Logger(ItemsWorker.name, { timestamp: true });

  private stats = {
    total: 0,
    success: 0,
    notFound: 0,
    errors: 0,
    updated: 0,
    created: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    private readonly rabbitMQMonitorService: RabbitMQMonitorService,
  ) {}

  @RabbitSubscribe({
    exchange: 'dma.exchange',
    routingKey: 'dma.items.*',
    queue: 'dma.items',
    queueOptions: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.items',
      },
    },
  })
  public async handleItemMessage(message: ItemMessageDto): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const args: ItemJobQueue = message.payload;

      // --- Check exits, if not, create --- //
      let itemEntity = await this.itemsRepository.findOneBy({
        id: args.itemId,
      });
      const isNew = !itemEntity;
      if (isNew) {
        itemEntity = this.itemsRepository.create({
          id: args.itemId,
          indexBy: DMA_SOURCE.API,
        });
      }

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      // --- Request item data --- //
      const isMultiLocale = true;
      const [getItemSummary, getItemMedia] = await Promise.allSettled([
        this.BNet.query<BlizzardApiItem>(
          `/data/wow/item/${args.itemId}`,
          apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA, isMultiLocale),
        ),
        this.BNet.query(
          `/data/wow/media/item/${args.itemId}`,
          apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA),
        ),
      ]);

      const isItemValid = isItem(getItemSummary);
      if (!isItemValid) {
        this.stats.notFound++;
        const duration = Date.now() - startTime;
        this.logger.warn(
          `${chalk.blue('ℹ')} ${chalk.blue('404')} [${chalk.bold(this.stats.total)}] item ${args.itemId} ${chalk.dim(`(${duration}ms)`)}`,
        );
        return;
      }

      const gold = new Set(['sell_price', 'purchase_price']);
      const namedFields = new Set([
        'name',
        'quality',
        'item_class',
        'item_subclass',
        'inventory_type',
      ]);

      Object.keys(getItemSummary.value).forEach((key: keyof IItem) => {
        const isKeyInPath = ITEM_FIELD_MAPPING.has(key);
        if (isKeyInPath) {
          const property = ITEM_FIELD_MAPPING.get(key);
          let value = get(getItemSummary.value, property.path, null);
          const isFieldName = namedFields.has(key) ? isNamedField(value) : false;

          if (isFieldName) value = get(value, `en_GB`, null);

          if (gold.has(key)) {
            value = toGold(value);
          }

          if (value && value !== itemEntity[property.key])
            (itemEntity[property.key] as string | number) = value;
        }
      });

      if (isMultiLocale) {
        itemEntity.names = getItemSummary.value.name as unknown as string;
      }

      const isVSP =
        (itemEntity.vendorSellPrice && isNew) ||
        (itemEntity.vendorSellPrice &&
          itemEntity.assetClass &&
          !itemEntity.assetClass.includes(VALUATION_TYPE.VSP));

      if (isVSP) {
        const assetClass = new Set(itemEntity.assetClass).add(VALUATION_TYPE.VSP);
        itemEntity.assetClass = Array.from(assetClass);
      }

      const isItemMediaValid = isItemMedia(getItemMedia);
      if (isItemMediaValid) {
        const [icon] = getItemMedia.value.assets;
        itemEntity.icon = icon.value;
      }

      await this.itemsRepository.save(itemEntity);

      const duration = Date.now() - startTime;
      this.stats.success++;

      if (isNew) {
        this.stats.created++;
      } else {
        this.stats.updated++;
      }

      this.logger.log(
        `${chalk.green('✓')} ${chalk.green('200')} [${chalk.bold(this.stats.total)}] ${isNew ? chalk.cyan('created') : chalk.yellow('updated')} item ${itemEntity.id} ${chalk.dim('|')} ${itemEntity.name} ${chalk.dim(`(${duration}ms)`)}`,
      );

      this.rabbitMQMonitorService.recordMessageProcessingDuration(
        'dma.items',
        duration / 1000,
        'success',
      );
      await this.rabbitMQMonitorService.emitMessageCompleted('dma.items', message);

      // Progress report every 50 items
      if (this.stats.total % 50 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      this.stats.errors++;
      const duration = Date.now() - startTime;
      const itemId = message.payload?.itemId || 'unknown';

      this.logger.error(
        `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] item ${itemId} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`,
      );
      this.rabbitMQMonitorService.recordMessageProcessingDuration(
        'dma.items',
        duration / 1000,
        'failure',
      );
      await this.rabbitMQMonitorService.emitMessageFailed(
        'dma.items',
        message,
        errorOrException,
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
        `${chalk.magenta('📊 ITEMS PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} items processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.cyan('    → Created:')} ${chalk.cyan.bold(this.stats.created)}\n` +
        `${chalk.yellow('    → Updated:')} ${chalk.yellow.bold(this.stats.updated)}\n` +
        `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(this.stats.notFound)}\n` +
        `${chalk.red('  ✗ Errors:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Rate:')} ${chalk.bold(rate)} items/sec\n` +
        `${chalk.magenta.bold('━'.repeat(60))}`,
    );
  }

  public logFinalSummary(): void {
    const uptime = Date.now() - this.stats.startTime;
    const avgRate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.cyan.bold('  🎯 ITEMS FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Items:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.cyan('    → Created:')} ${chalk.cyan.bold(this.stats.created)}\n` +
        `${chalk.yellow('    → Updated:')} ${chalk.yellow.bold(this.stats.updated)}\n` +
        `${chalk.blue('  ℹ Not Found:')} ${chalk.blue.bold(this.stats.notFound)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} items/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
  }
}
