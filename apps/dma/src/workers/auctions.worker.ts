import Redis from 'ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import chalk from 'chalk';
import { bufferCount, concatMap } from 'rxjs/operators';
import { from, lastValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiAuctions,
  DMA_TIMEOUT_TOLERANCE,
  IAuctionsOrder,
  ICommodityOrder,
  IPetList,
  isAuctions,
  isResponseError,
  ITEM_KEY_GUARD,
  MARKET_TYPE,
  PETS_KEY_GUARD,
  REALM_ENTITY_ANY,
  toGold,
  transformPrice,
  AuctionMessageDto,
} from '@app/resources';
import { createHash } from 'crypto';
import { RabbitMQMonitorService } from '@app/rabbitmq';

@Injectable()
export class AuctionsWorker {
  private readonly logger = new Logger(AuctionsWorker.name, {
    timestamp: true,
  });

  private stats = {
    total: 0,
    success: 0,
    rateLimit: 0,
    errors: 0,
    notModified: 0,
    noData: 0,
    startTime: Date.now(),
  };

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly _itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    private readonly rabbitMQMonitorService: RabbitMQMonitorService,
  ) {}

  @RabbitSubscribe({
    exchange: 'dma.exchange',
    routingKey: 'dma.auctions.*',
    queue: 'dma.auctions',
    queueOptions: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.auctions',
      },
    },
  })
  public async handleAuctionMessage(message: AuctionMessageDto): Promise<void> {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const args: AuctionMessageDto = message;

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });
      /**
       * @description If no connected realm passed, then deal with it, as COMMODITY
       * @description Else, it's an auctions' request
       */
      const isCommodity = args.connectedRealmId === REALM_ENTITY_ANY.id;

      const previousTimestamp = isCommodity
        ? args.commoditiesTimestamp
        : args.auctionsTimestamp;

      const ifModifiedSince = DateTime.fromMillis(previousTimestamp).toHTTP();
      const getMarketApiEndpoint = isCommodity
        ? '/data/wow/auctions/commodities'
        : `/data/wow/connected-realm/${args.connectedRealmId}/auctions`;

      const marketResponse = await this.BNet.query<BlizzardApiAuctions>(
        getMarketApiEndpoint,
        apiConstParams(
          API_HEADERS_ENUM.DYNAMIC,
          DMA_TIMEOUT_TOLERANCE,
          false,
          ifModifiedSince,
        ),
      );

      const isAuctionsValid = isAuctions(marketResponse);
      if (!isAuctionsValid) {
        this.stats.notModified++;
        const duration = Date.now() - startTime;
        const realmId = args.connectedRealmId;
        this.logger.warn(
          `${chalk.blue('ℹ')} ${chalk.blue('304')} [${chalk.bold(this.stats.total)}] realm ${realmId} ${chalk.dim(`(${duration}ms) Not modified`)}`,
        );
        return;
      }

      const connectedRealmId = isCommodity
        ? REALM_ENTITY_ANY.id
        : args.connectedRealmId;

      const timestamp = DateTime.fromRFC2822(marketResponse.lastModified).toMillis();

      const { auctions } = marketResponse;

      const auctionsHash = this.computeAuctionsPayloadHash(auctions);
      const auctionsHashKey = `DMA:AUCTIONS:HASH:${auctionsHash}`;

      const previouslyPersistedHash =
        await this.redisService.exists(auctionsHashKey);
      if (previouslyPersistedHash) {
        this.stats.notModified++;
        const duration = Date.now() - startTime;
        this.logger.warn(
          `${chalk.yellow('⚠')} ${chalk.yellow('HASH')} [${chalk.bold(this.stats.total)}] realm ${connectedRealmId} ${chalk.dim(`(${duration}ms) Duplicate payload hash ${auctionsHash}`)}`,
        );
        return;
      }

      let iterator = 0;
      let hasPersistedOrders = false;

      // Handle empty auctions array to prevent EmptyError
      if (auctions.length === 0) {
        this.stats.noData++;
        const duration = Date.now() - startTime;
        this.logger.warn(
          `${chalk.yellow('⊘')} Empty [${chalk.bold(this.stats.total)}] realm ${connectedRealmId} ${chalk.dim(`(${duration}ms) No auctions`)}`,
        );
      } else {
        await lastValueFrom(
          from(auctions).pipe(
            bufferCount(5_000),
            concatMap(async (ordersBatch) => {
              try {
                const ordersBulkAuctions = this.transformOrders(
                  ordersBatch,
                  timestamp,
                  connectedRealmId,
                  isCommodity,
                );

                await this.marketRepository.save(ordersBulkAuctions);

                if (ordersBulkAuctions.length > 0) {
                  hasPersistedOrders = true;
                }

                iterator += ordersBulkAuctions.length;
                this.logger.log(
                  `${chalk.cyan('→')} realm ${connectedRealmId} ${chalk.dim('|')} ${chalk.bold(iterator)} orders ${chalk.dim('|')} ${timestamp}`,
                );
              } catch (errorOrException) {
                this.logger.error({
                  logTag: 'ordersBatch',
                  error: JSON.stringify(errorOrException),
                });
              }
            }),
          ),
        );
      }

      if (hasPersistedOrders) {
        await this.redisService.set(auctionsHashKey, auctionsHash, 'EX', 86400);
      }

      if (isCommodity) {
        await this.redisService.set(
          `COMMODITY:TS:${timestamp}`,
          timestamp,
          'EX',
          86400,
        );
      }

      const updateQuery: Partial<RealmsEntity> = isCommodity
        ? { commoditiesTimestamp: timestamp }
        : { auctionsTimestamp: timestamp };

      await this.realmsRepository.update(
        { connectedRealmId: connectedRealmId },
        updateQuery,
      );

      const duration = Date.now() - startTime;
      this.stats.success++;
      this.logger.log(
        `${chalk.green('✓')} ${chalk.green('200')} [${chalk.bold(this.stats.total)}] realm ${connectedRealmId} ${chalk.dim(`(${duration}ms)`)} ${chalk.dim(`${iterator} orders`)}`,
      );

      this.rabbitMQMonitorService.recordMessageProcessingDuration(
        'dma.auctions',
        duration / 1000,
        'success',
      );

      await this.rabbitMQMonitorService.emitMessageCompleted(
        'dma.auctions',
        message,
      );

      // Progress report every 10 realms
      if (this.stats.total % 10 === 0) {
        this.logProgress();
      }
    } catch (errorOrException) {
      const duration = Date.now() - startTime;
      const realmId = message?.connectedRealmId || 'unknown';
      const responseError = isResponseError(errorOrException);

      if (responseError) {
        const statusCode = errorOrException.response.status;

        if (statusCode === 429) {
          this.stats.rateLimit++;
          this.logger.warn(
            `${chalk.yellow('⚠')} ${chalk.yellow('429')} Rate limited [${chalk.bold(this.stats.total)}] realm ${realmId} ${chalk.dim(`(${duration}ms)`)}`,
          );
        } else {
          this.logger.warn(
            `${chalk.blue('ℹ')} ${statusCode} [${chalk.bold(this.stats.total)}] realm ${realmId} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.response.statusText}`,
          );
        }
      } else {
        this.stats.errors++;
        this.logger.error(
          `${chalk.red('✗')} Failed [${chalk.bold(this.stats.total)}] realm ${realmId} ${chalk.dim(`(${duration}ms)`)} - ${errorOrException.message}`,
        );
      }

      this.rabbitMQMonitorService.recordMessageProcessingDuration(
        'dma.auctions',
        duration / 1000,
        'failure',
      );
      await this.rabbitMQMonitorService.emitMessageFailed(
        'dma.auctions',
        message,
        errorOrException,
      );

      throw errorOrException;
    }
  }

  private transformOrders(
    orders: Array<IAuctionsOrder | ICommodityOrder>,
    timestamp: number,
    connectedRealmId: number,
    isCommodity: boolean,
  ): MarketEntity[] {
    return orders
      .map((order) => {
        // Skip orders without valid item.id
        if (!order.item.id) {
          this.logger.debug(`Skipping order ${order.id} - missing item.id`);
          return null;
        }

        const marketEntity = this.marketRepository.create({
          orderId: `${order.id}`,
          itemId: order.item.id,
          connectedRealmId: connectedRealmId,
          timeLeft: order.time_left,
          timestamp: timestamp,
        });

        const isPetOrder = marketEntity.itemId === 82800;

        const bid = 'bid' in order ? toGold((order as IAuctionsOrder).bid) : null;

        const price = transformPrice(order);
        if (!price) {
          this.logger.debug(`Skipping order ${order.id} - invalid price`);
          return null;
        }

        if (!isCommodity) {
          for (const [path, key] of ITEM_KEY_GUARD.entries()) {
            if (path in order.item) marketEntity[key] = order.item[path];
          }

          if (isPetOrder) {
            // TODO pet fix for pet cage item
            const petList: Partial<IPetList> = {};
            for (const [path, key] of PETS_KEY_GUARD.entries()) {
              if (path in order.item) petList[key] = order.item[path];
            }
          }
        }

        const quantity =
          'quantity' in order ? (order as ICommodityOrder).quantity : 1;

        marketEntity.type = isCommodity ? MARKET_TYPE.C : MARKET_TYPE.A;

        if (bid) marketEntity.bid = bid;
        if (price) marketEntity.price = price;
        if (quantity) marketEntity.quantity = quantity;

        const isValue = Boolean(price) && Boolean(quantity);
        if (isValue) marketEntity.value = price * quantity;

        return marketEntity;
      })
      .filter((entity): entity is MarketEntity => entity !== null); // Filter out null values and provide type guard
  }

  private logProgress(): void {
    const uptime = Date.now() - this.stats.startTime;
    const rate = (this.stats.total / (uptime / 1000)).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);

    this.logger.log(
      `\n${chalk.magenta.bold('━'.repeat(60))}\n` +
        `${chalk.magenta('📊 AUCTIONS PROGRESS REPORT')}\n` +
        `${chalk.dim('  Total:')} ${chalk.bold(this.stats.total)} realms processed\n` +
        `${chalk.green('  ✓ Success:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.blue('  ℹ Not Modified:')} ${chalk.blue.bold(this.stats.notModified)}\n` +
        `${chalk.yellow('  ⊘ No Data:')} ${chalk.yellow.bold(this.stats.noData)}\n` +
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
        `${chalk.cyan.bold('  🎯 AUCTIONS FINAL SUMMARY')}\n` +
        `${chalk.cyan.bold('═'.repeat(60))}\n` +
        `${chalk.dim('  Total Realms:')} ${chalk.bold.white(this.stats.total)}\n` +
        `${chalk.green('  ✓ Successful:')} ${chalk.green.bold(this.stats.success)} ${chalk.dim(`(${successRate}%)`)}\n` +
        `${chalk.yellow('  ⚠ Rate Limited:')} ${chalk.yellow.bold(this.stats.rateLimit)}\n` +
        `${chalk.blue('  ℹ Not Modified:')} ${chalk.blue.bold(this.stats.notModified)}\n` +
        `${chalk.yellow('  ⊘ No Data:')} ${chalk.yellow.bold(this.stats.noData)}\n` +
        `${chalk.red('  ✗ Failed:')} ${chalk.red.bold(this.stats.errors)}\n` +
        `${chalk.dim('  Total Time:')} ${chalk.bold((uptime / 1000).toFixed(1))}s\n` +
        `${chalk.dim('  Avg Rate:')} ${chalk.bold(avgRate)} realms/sec\n` +
        `${chalk.cyan.bold('═'.repeat(60))}`,
    );
  }

  private computeAuctionsPayloadHash(
    auctions: BlizzardApiAuctions['auctions'],
  ): string {
    return createHash('sha1').update(JSON.stringify(auctions)).digest('hex');
  }
}
