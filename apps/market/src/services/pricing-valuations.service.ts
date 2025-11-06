import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { S3Service } from '@app/s3';
import { InjectQueue } from '@nestjs/bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Queue } from 'bullmq';
import csv from 'async-csv';
import { Cron, CronExpression } from '@nestjs/schedule';
import { get } from 'lodash';
import { CsvFileName, DISENCHANTING, MILLING, PROSPECTING } from '../libs';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  KeysEntity,
  PricingEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
  ItemsEntity,
  MarketEntity,
  ValuationEntity,
  RealmsEntity,
} from '@app/pg';
import { Repository } from 'typeorm';
import { dmaConfig } from '@app/configuration';
import {
  DMA_SOURCE,
  GLOBAL_DMA_KEY,
  PRICING_TYPE,
  pricingQueue,
  IQPricing,
  getKey,
  ItemPricing,
  toStringOrNumber,
  SKILL_LINE_KEY_MAPPING,
  SPELL_EFFECT_KEY_MAPPING,
  EXPANSION_TICKER_MAP,
  BnetProfessionIndexQueryResponse,
  BnetProfessionDetailQueryResponse,
  BnetSkillTierDetailQueryResponse,
  isBnetProfessionIndexResponse,
  isBnetProfessionDetailResponse,
  isBnetSkillTierDetailResponse,
  IAssetClassBuildArgs,
  MARKET_TYPE,
  VALUATION_TYPE,
} from '@app/resources';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class PricingValuationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PricingValuationsService.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectQueue(pricingQueue.name)
    private readonly queue: Queue<IQPricing, number>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(PricingEntity)
    private readonly pricingRepository: Repository<PricingEntity>,
    @InjectRepository(SkillLineEntity)
    private readonly skillLineRepository: Repository<SkillLineEntity>,
    @InjectRepository(SpellReagentsEntity)
    private readonly spellReagentsRepository: Repository<SpellReagentsEntity>,
    @InjectRepository(SpellEffectEntity)
    private readonly spellEffectRepository: Repository<SpellEffectEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ValuationEntity)
    private readonly valuationRepository: Repository<ValuationEntity>,
    private readonly s3Service: S3Service,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Phase 1: PRICING - Build all pricing methods
    await this.indexPricing(
      GLOBAL_DMA_KEY,
      dmaConfig.isItemsPricingInit && dmaConfig.isPricingIndexProfessions,
    );

    await this.libPricing(
      dmaConfig.isItemsPricingLab,
      dmaConfig.isPricingLabProspecting,
      dmaConfig.isPricingLabDisenchanting,
      dmaConfig.isPricingLabMilling,
    );

    await this.buildSkillLine(
      dmaConfig.isItemsPricingBuild && dmaConfig.isPricingBuildSkillLine,
    );
    await this.buildSpellEffect(
      dmaConfig.isItemsPricingBuild && dmaConfig.isPricingBuildSpellEffect,
    );
    await this.buildSpellReagents(
      dmaConfig.isItemsPricingBuild && dmaConfig.isPricingBuildSpellReagents,
    );

    // Phase 2: VALUATIONS - Assign asset classes
    await this.buildAssetClasses(
      {
        isByPricing: dmaConfig.isValuationsFromPricing,
        isByAuctions: dmaConfig.isValuationsFromAuctions,
        isByPremium: dmaConfig.isValuationsForPremium,
        isByCurrency: dmaConfig.isValuationsForCurrency,
        isByTags: dmaConfig.isValuationsBuildTags,
      },
      dmaConfig.isValuationsBuild,
    );
  }

  // ============================================================================
  // PRICING METHODS - CSV & File Processing
  // ============================================================================

  /**
   * Helper method to read CSV files from S3 cmnw bucket
   */
  private async readCsvFile(fileName: string): Promise<string> {
    const logTag = 'readCsvFile';
    try {
      return await this.s3Service.readFile(fileName, 'cmnw');
    } catch (errorOrException) {
      this.logger.error({ logTag, fileName, bucket: 'cmnw', errorOrException });
      throw new Error(`CSV file not found in S3: ${fileName}`);
    }
  }

  /**
   * Check if CSV file has been processed based on file hash
   * Returns true if already processed, false otherwise
   */
  private async isFileProcessed(
    fileName: string,
    fileContent: string,
  ): Promise<boolean> {
    const fileHash = createHash('md5').update(fileContent).digest('hex');
    const redisKey = `PRICING_CSV_PROCESSED:${fileName}:${fileHash}`;
    const exists = await this.redisService.exists(redisKey);
    return exists === 1;
  }

  /**
   * Mark CSV file as processed in Redis (expires after 30 days)
   */
  private async markFileAsProcessed(
    fileName: string,
    fileContent: string,
  ): Promise<void> {
    const fileHash = createHash('md5').update(fileContent).digest('hex');
    const redisKey = `PRICING_CSV_PROCESSED:${fileName}:${fileHash}`;
    const ttl = 60 * 60 * 24 * 30; // 30 days
    await this.redisService.setex(redisKey, ttl, new Date().toISOString());
    this.logger.debug({
      logTag: 'markFileAsProcessed',
      fileName,
      fileHash,
      redisKey,
      ttl,
      message: `Marked file as processed: ${fileName}`,
    });
  }

  // ============================================================================
  // PRICING METHODS - Lab Pricing (Reverse Methods)
  // ============================================================================

  async libPricing(
    isItemsPricingLab: boolean = true,
    isProspect: boolean = false,
    isDisenchant: boolean = false,
    isMilling: boolean = false,
  ): Promise<void> {
    const logTag = 'libPricing';
    try {
      if (!isItemsPricingLab) {
        this.logger.debug({
          logTag,
          isItemsPricingLab,
          message: `Items pricing lab disabled: ${isItemsPricingLab}`,
        });
        return;
      }

      if (!isProspect && !isDisenchant && !isMilling) {
        this.logger.debug({
          logTag,
          message: `All lab methods disabled, skipping`,
        });
        return;
      }

      const deletePricing = await this.pricingRepository.delete({
        createdBy: DMA_SOURCE.LAB,
      });
      this.logger.log({
        logTag,
        source: DMA_SOURCE.LAB,
        deletedCount: deletePricing.affected,
        message: `Deleted ${deletePricing.affected} lab pricing entries`,
      });

      if (isProspect) {
        this.logger.debug({
          logTag,
          method: 'prospecting',
          message: 'Prospecting method enabled',
        });
        await this.libPricingProspect();
      }

      if (isMilling) {
        this.logger.debug({
          logTag,
          method: 'milling',
          message: 'Milling method enabled',
        });
        await this.libPricingMilling();
      }

      if (isDisenchant) {
        this.logger.debug({
          logTag,
          method: 'disenchanting',
          message: 'Disenchanting method enabled',
        });
        await this.libPricingDisenchant();
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  private async libPricingProspect(): Promise<void> {
    const logTag = 'libPricingProspect';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: PROSPECTING.name,
        media: PROSPECTING.media,
        spellId: PROSPECTING.spellId,
        profession: PROSPECTING.name,
        expansion: 'TWW',
        type: PRICING_TYPE.REVERSE,
        createdBy: DMA_SOURCE.LAB,
        updatedBy: DMA_SOURCE.LAB,
      });

      let methodCount = 0;

      await lastValueFrom(
        from(PROSPECTING.methods).pipe(
          mergeMap(async (method) => {
            const entry = {
              ...reversePricingMethod,
              reagents: method.reagents,
              derivatives: method.derivatives,
              recipeId: parseInt(
                `${reversePricingMethod.spellId}${method.reagents[0].itemId}`,
              ),
            };

            await this.pricingRepository.save(entry);
            methodCount++;
          }),
        ),
      );

      this.logger.log({
        logTag,
        method: PROSPECTING.name,
        count: methodCount,
        spellId: reversePricingMethod.spellId,
        message: `Processed ${methodCount} prospecting methods`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, method: PROSPECTING.name, errorOrException });
    }
  }

  private async libPricingMilling(): Promise<void> {
    const logTag = 'libPricingMilling';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: MILLING.name,
        media: MILLING.media,
        spellId: MILLING.spellId,
        profession: MILLING.name,
        expansion: 'TWW',
        type: PRICING_TYPE.REVERSE,
        createdBy: DMA_SOURCE.LAB,
        updatedBy: DMA_SOURCE.LAB,
      });

      let methodCount = 0;

      await lastValueFrom(
        from(MILLING.methods).pipe(
          mergeMap(async (method) => {
            const entry = {
              ...reversePricingMethod,
              reagents: method.reagents,
              derivatives: method.derivatives,
              recipeId: parseInt(
                `${reversePricingMethod.spellId}${method.reagents[0].itemId}`,
              ),
            };

            await this.pricingRepository.save(entry);
            methodCount++;
          }),
        ),
      );

      this.logger.log({
        logTag,
        method: MILLING.name,
        count: methodCount,
        spellId: reversePricingMethod.spellId,
        message: `Processed ${methodCount} milling methods`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, method: MILLING.name, errorOrException });
    }
  }

  private async libPricingDisenchant(): Promise<void> {
    const logTag = 'libPricingDisenchant';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: DISENCHANTING.name,
        media: DISENCHANTING.media,
        spellId: DISENCHANTING.spellId,
        profession: DISENCHANTING.name,
        expansion: 'TWW',
        type: PRICING_TYPE.REVERSE,
        createdBy: DMA_SOURCE.LAB,
        updatedBy: DMA_SOURCE.LAB,
      });

      let methodCount = 0;

      await lastValueFrom(
        from(DISENCHANTING.methods).pipe(
          mergeMap(async (method) => {
            const entry = {
              ...reversePricingMethod,
              reagents: method.reagents,
              derivatives: method.derivatives,
              recipeId: parseInt(
                `${reversePricingMethod.spellId}${method.reagents[0].itemId}`,
              ),
            };

            await this.pricingRepository.save(entry);
            methodCount++;
          }),
        ),
      );

      this.logger.log({
        logTag,
        method: DISENCHANTING.name,
        count: methodCount,
        spellId: reversePricingMethod.spellId,
        message: `Processed ${methodCount} disenchanting methods`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, method: DISENCHANTING.name, errorOrException });
    }
  }

  // ============================================================================
  // PRICING METHODS - Blizzard API Indexing
  // ============================================================================

  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_10AM)
  async indexPricing(
    clearance: string = GLOBAL_DMA_KEY,
    isItemsPricingInit: boolean = true,
  ): Promise<void> {
    const logTag = 'indexPricing';
    try {
      if (!isItemsPricingInit) {
        this.logger.debug({
          logTag,
          isItemsPricingInit,
          message: `Items pricing init disabled: ${isItemsPricingInit}`,
        });
        return;
      }

      this.logger.log({
        logTag,
        message: 'Starting profession indexing from Blizzard API',
      });

      const key = await getKey(this.keysRepository, clearance);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const professionIndexResponse =
        await this.BNet.query<BnetProfessionIndexQueryResponse>(
          '/data/wow/profession/index',
          {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'static-eu' },
          },
        );

      if (!isBnetProfessionIndexResponse(professionIndexResponse)) {
        this.logger.error({
          logTag,
          error: professionIndexResponse,
          message: 'Invalid profession index response',
        });
        return;
      }

      const { professions } = professionIndexResponse;

      for (let profession of professions) {
        const professionDetailResponse =
          await this.BNet.query<BnetProfessionDetailQueryResponse>(
            `/data/wow/profession/${profession.id}`,
            {
              timeout: 10000,
              headers: { 'Battlenet-Namespace': 'static-eu' },
            },
          );

        if (!isBnetProfessionDetailResponse(professionDetailResponse)) {
          this.logger.warn({
            logTag,
            professionId: profession.id,
            message: `Invalid or missing profession detail for ID ${profession.id}`,
          });
          continue;
        }

        const { skill_tiers } = professionDetailResponse;

        for (let tier of skill_tiers) {
          let expansion: string = 'CLSC';

          Array.from(EXPANSION_TICKER_MAP.entries()).some(([k, v]) => {
            tier.name.en_GB?.includes(k) ? (expansion = v) : '';
          });

          const skillTierDetailResponse =
            await this.BNet.query<BnetSkillTierDetailQueryResponse>(
              `/data/wow/profession/${profession.id}/skill-tier/${tier.id}`,
              {
                timeout: 10000,
                headers: { 'Battlenet-Namespace': 'static-eu' },
              },
            );

          if (!isBnetSkillTierDetailResponse(skillTierDetailResponse)) {
            this.logger.warn({
              logTag,
              professionId: profession.id,
              tierId: tier.id,
              message: `Invalid or missing skill tier detail for profession ${profession.id}, tier ${tier.id}`,
            });
            continue;
          }

          const { categories } = skillTierDetailResponse;

          for (let category of categories) {
            const { recipes } = category;
            if (!recipes) continue;

            for (let recipe of recipes) {
              await this.queue.add(
                `${recipe.id}`,
                {
                  recipeId: recipe.id,
                  expansion: expansion,
                  profession: profession.id,
                  region: 'eu',
                  clientId: key.client,
                  clientSecret: key.secret,
                  accessToken: key.token,
                },
                { jobId: `R${recipe.id}` },
              );
            }
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  // ============================================================================
  // PRICING METHODS - CSV Data Building
  // ============================================================================

  async buildSkillLine(buildSkillLine: boolean = true): Promise<void> {
    const logTag = 'buildSkillLine';
    if (!buildSkillLine) {
      this.logger.debug({
        logTag,
        buildSkillLine,
        message: `Skill line build disabled: ${buildSkillLine}`,
      });
      return;
    }

    try {
      const skillLineAbilityCsv = await this.readCsvFile(
        CsvFileName.SkillLineAbility,
      );

      const isProcessed = await this.isFileProcessed(
        CsvFileName.SkillLineAbility,
        skillLineAbilityCsv,
      );

      if (isProcessed) {
        this.logger.log({
          logTag,
          fileName: CsvFileName.SkillLineAbility,
          message: `File already processed, skipping`,
        });
        return;
      }

      const skillLineAbilityRows: any[] = await csv.parse(skillLineAbilityCsv, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string | number) => toStringOrNumber(value),
      });

      const skillLineEntities: SkillLineEntity[] = [];

      for (const row of skillLineAbilityRows) {
        const isIdExists = 'ID' in row;

        if (!isIdExists) continue;

        const id = row.ID;

        const isExists = await this.skillLineRepository.existsBy({ id });
        if (isExists) continue;

        const skillLineEntity = this.skillLineRepository.create({
          id: id,
        });

        for (const [key, path] of SKILL_LINE_KEY_MAPPING.entries()) {
          const value = get(row, path, null);
          if (value && key !== 'id') {
            (skillLineEntity as any)[key] = value;
          }
        }

        skillLineEntities.push(skillLineEntity);
      }

      const skillLineMethodsCount = skillLineEntities.length;

      this.logger.log({
        logTag,
        created: skillLineMethodsCount,
        message: `Created ${skillLineMethodsCount} skill line entities`,
      });

      await this.skillLineRepository.save(skillLineEntities, { chunk: 500 });

      this.logger.log({
        logTag,
        saved: skillLineMethodsCount,
        message: `Saved ${skillLineMethodsCount} skill line entities`,
      });

      await this.markFileAsProcessed(
        CsvFileName.SkillLineAbility,
        skillLineAbilityCsv,
      );
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  async buildSpellEffect(isItemsPricingBuild: boolean = true): Promise<void> {
    const logTag = 'buildSpellEffect';
    if (!isItemsPricingBuild) {
      this.logger.debug({
        logTag,
        isItemsPricingBuild,
        message: `Spell effect build disabled: ${isItemsPricingBuild}`,
      });
      return;
    }

    try {
      const spellEffectCsv = await this.readCsvFile(CsvFileName.SpellEffect);

      const isProcessed = await this.isFileProcessed(
        CsvFileName.SpellEffect,
        spellEffectCsv,
      );

      if (isProcessed) {
        this.logger.log({
          logTag,
          fileName: CsvFileName.SpellEffect,
          message: `File already processed, skipping`,
        });
        return;
      }

      const spellEffectRows: any[] = await csv.parse(spellEffectCsv, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string | number) => toStringOrNumber(value),
      });

      let spellEffectCount = 0;

      for (const row of spellEffectRows) {
        const isIdExists = 'ID' in row;

        if (!isIdExists) continue;

        const id = row.ID;

        const isExists = await this.spellEffectRepository.existsBy({ id });
        if (isExists) continue;

        const spellEffectEntity = this.spellEffectRepository.create({
          id: id,
        });

        for (const [key, path] of SPELL_EFFECT_KEY_MAPPING.entries()) {
          const value = get(row, path, null);
          if (value && key !== 'id') {
            (spellEffectEntity as any)[key] = value;
          }
        }

        await this.spellEffectRepository.save(spellEffectEntity);

        spellEffectCount = spellEffectCount + 1;
      }

      this.logger.log({
        logTag,
        created: spellEffectCount,
        message: `Created and saved ${spellEffectCount} spell effect entities`,
      });

      await this.markFileAsProcessed(CsvFileName.SpellEffect, spellEffectCsv);
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  async buildSpellReagents(isItemsPricingBuild: boolean = true): Promise<void> {
    const logTag = 'buildSpellReagents';
    if (!isItemsPricingBuild) {
      this.logger.debug({
        logTag,
        isItemsPricingBuild,
        message: `Spell reagents build disabled: ${isItemsPricingBuild}`,
      });
      return;
    }

    try {
      const spellReagentsCsv = await this.readCsvFile(CsvFileName.SpellReagents);

      const isProcessed = await this.isFileProcessed(
        CsvFileName.SpellReagents,
        spellReagentsCsv,
      );

      if (isProcessed) {
        this.logger.log({
          logTag,
          fileName: CsvFileName.SpellReagents,
          message: `File already processed, skipping`,
        });
        return;
      }

      const spellReagentsRows: any[] = await csv.parse(spellReagentsCsv, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string | number) => toStringOrNumber(value),
      });

      const spellReagentsEntities = [];

      const reagentsKeyIndex = [2, 3, 4, 5, 6, 7, 8, 9];
      const quantityIndex = [10, 11, 12, 13, 14, 15, 16, 17];

      for (const row of spellReagentsRows) {
        const isIdExists = 'ID' in row;

        if (!isIdExists) continue;

        const id = row.ID;

        const isExists = await this.spellReagentsRepository.existsBy({ id });
        if (isExists) continue;

        const rowValues: any[] = Object.values(row);
        const reagents: Array<ItemPricing> = [];

        reagentsKeyIndex.forEach((n, i) => {
          if (rowValues[n] !== 0) {
            reagents.push({
              itemId: rowValues[n],
              quantity: rowValues[quantityIndex[i]],
            });
          }
        });

        const spellReagentsEntity = this.spellReagentsRepository.create({
          id: id,
          spellId: get(row, 'SpellID', null),
          reagents: reagents,
        });

        spellReagentsEntities.push(spellReagentsEntity);
      }

      const spellReagentsCount = spellReagentsEntities.length;

      this.logger.log({
        logTag,
        created: spellReagentsCount,
        message: `Created ${spellReagentsCount} spell reagent entities`,
      });

      await this.spellReagentsRepository.save(spellReagentsEntities, {
        chunk: 500,
      });

      this.logger.log({
        logTag,
        saved: spellReagentsCount,
        message: `Saved ${spellReagentsCount} spell reagent entities`,
      });

      await this.markFileAsProcessed(
        CsvFileName.SpellReagents,
        spellReagentsCsv,
      );
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  // ============================================================================
  // VALUATIONS METHODS - State Management
  // ============================================================================

  /**
   * Generate state hash for a stage to detect if data has changed
   */
  private async generateStateHash(stage: string): Promise<string> {
    const logTag = 'generateStateHash';
    try {
      let stateData = '';

      switch (stage) {
        case 'pricing':
          const pricingCount = await this.pricingRepository.count();
          const latestPricing = await this.pricingRepository.find({
            order: { updatedAt: 'DESC' },
            take: 1,
          });
          stateData = `${pricingCount}:${latestPricing[0]?.updatedAt || ''}`;
          break;

        case 'auctions':
          const marketCount = await this.marketRepository.count();
          const latestMarket = await this.marketRepository.find({
            order: { createdAt: 'DESC' },
            take: 1,
          });
          stateData = `${marketCount}:${latestMarket[0]?.createdAt || ''}`;
          break;

        case 'premium':
        case 'currency':
        case 'tags':
        case 'vsp':
          const itemsCount = await this.itemsRepository.count();
          stateData = `${itemsCount}:${stage}`;
          break;

        default:
          stateData = `${stage}:${Date.now()}`;
      }

      return createHash('md5').update(stateData).digest('hex');
    } catch (errorOrException) {
      this.logger.error({ logTag, stage, errorOrException });
      return createHash('md5')
        .update(`${stage}:${Date.now()}`)
        .digest('hex');
    }
  }

  /**
   * Check if a stage has been processed with current state
   */
  private async isStageProcessed(stage: string): Promise<boolean> {
    const stateHash = await this.generateStateHash(stage);
    const redisKey = `VALUATION_STAGE_PROCESSED:${stage}:${stateHash}`;
    const exists = await this.redisService.exists(redisKey);
    return exists === 1;
  }

  /**
   * Mark a stage as processed (expires after 7 days)
   */
  private async markStageAsProcessed(stage: string): Promise<void> {
    const stateHash = await this.generateStateHash(stage);
    const redisKey = `VALUATION_STAGE_PROCESSED:${stage}:${stateHash}`;
    const ttl = 60 * 60 * 24 * 7; // 7 days
    await this.redisService.setex(redisKey, ttl, new Date().toISOString());
    this.logger.debug({
      logTag: 'markStageAsProcessed',
      stage,
      stateHash,
      redisKey,
      ttl,
      message: `Marked stage as processed: ${stage}`,
    });
  }

  // ============================================================================
  // VALUATIONS METHODS - Asset Class Building
  // ============================================================================

  /**
   * Build asset classes based on various data sources
   * @param args Object with flags for each stage to process
   * @param init Whether to initialize the build
   */
  async buildAssetClasses(
    args: IAssetClassBuildArgs = {
      isByPricing: true,
      isByAuctions: true,
      isByPremium: false,
      isByCurrency: true,
      isByTags: true,
    },
    init: boolean = true,
  ): Promise<void> {
    try {
      const logTag = 'buildAssetClasses';
      this.logger.log({
        logTag,
        init,
        args,
        message: `Building asset classes: init=${init}`,
      });

      if (!init) {
        this.logger.debug({
          logTag,
          message: 'Valuations build disabled',
        });
        return;
      }

      if (args.isByPricing) {
        await this.buildAssetClassesFromPricing();
      }

      if (args.isByAuctions) {
        await this.buildAssetClassesFromAuctions();
      }

      if (args.isByPremium) {
        await this.buildAssetClassesForPremium();
      }

      if (args.isByCurrency) {
        await this.buildAssetClassesForCurrency();
      }

      // Add VSP asset class before tags
      await this.addToAssetClassVSP();

      if (args.isByTags) {
        await this.buildTags();
      }
    } catch (errorOrException) {
      const logTag = 'buildAssetClasses';
      this.logger.error({ logTag, errorOrException });
    }
  }

  /**
   * This stage adds asset_classes from pricing
   * such as REAGENT / DERIVATIVE
   */
  private async buildAssetClassesFromPricing(): Promise<void> {
    const logTag = 'buildAssetClassesFromPricing';
    this.logger.debug({ logTag, message: 'Pricing stage started' });

    const isProcessed = await this.isStageProcessed('pricing');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'pricing',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    const pricings = await this.pricingRepository.find();

    for (const pricing of pricings) {
      // Handle derivatives
      if (pricing.derivatives) {
        const derivativesArray =
          typeof pricing.derivatives === 'string'
            ? JSON.parse(pricing.derivatives)
            : pricing.derivatives;

        for (const derivative of derivativesArray) {
          const itemId =
            typeof derivative === 'object' ? derivative.itemId : derivative;
          if (itemId) {
            await this.addAssetClassToItem(itemId, VALUATION_TYPE.DERIVATIVE);
          }
        }
      }

      // Handle reagents
      if (pricing.reagents) {
        const reagentsArray =
          typeof pricing.reagents === 'string'
            ? JSON.parse(pricing.reagents)
            : pricing.reagents;

        for (const reagent of reagentsArray) {
          const itemId = typeof reagent === 'object' ? reagent.itemId : reagent;
          if (itemId) {
            await this.addAssetClassToItem(itemId, VALUATION_TYPE.REAGENT);
          }
        }
      }
    }

    await this.markStageAsProcessed('pricing');
    this.logger.debug({ logTag, message: 'Pricing stage ended' });
  }

  /**
   * This stage adds asset_classes from market/auction data
   * such as COMMDTY / ITEM and MARKET
   */
  private async buildAssetClassesFromAuctions(): Promise<void> {
    const logTag = 'buildAssetClassesFromAuctions';
    this.logger.debug({ logTag, message: 'Auctions stage started' });

    const isProcessed = await this.isStageProcessed('auctions');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'auctions',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    if (dmaConfig.isValuationsMarketAssetClass) {
      await this.addMarketAssetClass();
    }

    if (dmaConfig.isValuationsCommodityAssetClass) {
      await this.addCommodityAssetClass();
    }

    if (dmaConfig.isValuationsItemAssetClass) {
      await this.addItemAssetClass();
    }

    await this.markStageAsProcessed('auctions');
    this.logger.debug({ logTag, message: 'Auctions stage ended' });
  }

  /**
   * Add MARKET asset class to all items present in the market table
   */
  private async addMarketAssetClass(): Promise<void> {
    const logTag = 'addMarketAssetClass';
    this.logger.debug({
      logTag,
      message: 'Adding MARKET asset class',
    });

    // Get all distinct item IDs from market table
    const distinctItemIds = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.item_id', 'itemId')
      .getRawMany();

    const allItemIds = distinctItemIds.map((item) => item.itemId);

    if (allItemIds.length > 0) {
      // Add MARKET asset class to all items (if not already present)
      await this.itemsRepository
        .createQueryBuilder()
        .update(ItemsEntity)
        .set({
          assetClass: () =>
            `array_append(asset_class, '${VALUATION_TYPE.MARKET}')`,
        })
        .where('id = ANY(:ids)', { ids: allItemIds })
        .andWhere('NOT (:market = ANY(asset_class))', {
          market: VALUATION_TYPE.MARKET,
        })
        .execute();

      this.logger.debug({
        logTag,
        count: allItemIds.length,
        assetClass: VALUATION_TYPE.MARKET,
        message: `Added MARKET asset class to ${allItemIds.length} items`,
      });
    }
  }

  /**
   * Add COMMDTY asset class to commodity items (item_id = 1 OR type = 'COMMDTY')
   */
  private async addCommodityAssetClass(): Promise<void> {
    const logTag = 'addCommodityAssetClass';
    this.logger.debug({
      logTag,
      message: 'Adding COMMDTY asset class',
    });

    // Get commodity item IDs (item_id = 1 OR type = 'COMMDTY')
    const commodityItemIds = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.item_id', 'itemId')
      .where('market.item_id = :goldId', { goldId: 1 })
      .orWhere('market.type = :type', { type: MARKET_TYPE.C })
      .getRawMany();

    const commodityIds = commodityItemIds.map((item) => item.itemId);

    if (commodityIds.length > 0) {
      // Add COMMDTY asset class (if not already present)
      await this.itemsRepository
        .createQueryBuilder()
        .update(ItemsEntity)
        .set({
          assetClass: () =>
            `array_append(asset_class, '${VALUATION_TYPE.COMMDTY}')`,
        })
        .where('id = ANY(:ids)', { ids: commodityIds })
        .andWhere('NOT (:commdty = ANY(asset_class))', {
          commdty: VALUATION_TYPE.COMMDTY,
        })
        .execute();

      this.logger.debug({
        logTag,
        count: commodityIds.length,
        assetClass: VALUATION_TYPE.COMMDTY,
        message: `Added COMMDTY asset class to ${commodityIds.length} items`,
      });
    }
  }

  /**
   * Add ITEM asset class to auction items (type = 'AUCTION')
   */
  private async addItemAssetClass(): Promise<void> {
    const logTag = 'addItemAssetClass';
    this.logger.debug({
      logTag,
      message: 'Adding ITEM asset class',
    });

    // Get auction item IDs (type = 'AUCTION')
    const auctionItemIds = await this.marketRepository
      .createQueryBuilder('market')
      .select('DISTINCT market.item_id', 'itemId')
      .where('market.type = :type', { type: MARKET_TYPE.A })
      .getRawMany();

    const auctionIds = auctionItemIds.map((item) => item.itemId);

    if (auctionIds.length > 0) {
      // Add ITEM asset class (if not already present)
      await this.itemsRepository
        .createQueryBuilder()
        .update(ItemsEntity)
        .set({
          assetClass: () =>
            `array_append(asset_class, '${VALUATION_TYPE.ITEM}')`,
        })
        .where('id = ANY(:ids)', { ids: auctionIds })
        .andWhere('NOT (:item = ANY(asset_class))', {
          item: VALUATION_TYPE.ITEM,
        })
        .execute();

      this.logger.debug({
        logTag,
        count: auctionIds.length,
        assetClass: VALUATION_TYPE.ITEM,
        message: `Added ITEM asset class to ${auctionIds.length} items`,
      });
    }
  }

  /**
   * This stage defines PREMIUM asset_class for items
   * based on loot_type and asset_class: REAGENT
   */
  private async buildAssetClassesForPremium(): Promise<void> {
    const logTag = 'buildAssetClassesForPremium';
    this.logger.debug({ logTag, message: 'Premium stage started' });

    const isProcessed = await this.isStageProcessed('premium');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'premium',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    const premiumItems = await this.itemsRepository
      .createQueryBuilder('item')
      .where(':reagent = ANY(item.asset_class)', {
        reagent: VALUATION_TYPE.REAGENT,
      })
      .andWhere('item.loot_type = :lootType', { lootType: 'ON_ACQUIRE' })
      .getMany();

    for (const item of premiumItems) {
      await this.addAssetClassToItem(item.id, VALUATION_TYPE.PREMIUM);
    }

    await this.markStageAsProcessed('premium');
    this.logger.debug({ logTag, message: 'Premium stage ended' });
  }

  /**
   * This stage defines CURRENCY and WOWTOKEN asset classes
   */
  private async buildAssetClassesForCurrency(): Promise<void> {
    const logTag = 'buildAssetClassesForCurrency';
    this.logger.debug({ logTag, message: 'Currency stage started' });

    const isProcessed = await this.isStageProcessed('currency');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'currency',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    await this.addAssetClassToItem(122270, VALUATION_TYPE.WOWTOKEN);
    await this.addAssetClassToItem(122284, VALUATION_TYPE.WOWTOKEN);
    await this.addAssetClassToItem(1, VALUATION_TYPE.GOLD);

    await this.markStageAsProcessed('currency');
    this.logger.debug({ logTag, message: 'Currency stage ended' });
  }

  /**
   * Add VSP asset class to items with vendor sell price
   * Runs as a separate stage before tags
   */
  async addToAssetClassVSP(): Promise<void> {
    const logTag = 'addToAssetClassVSP';
    this.logger.debug({ logTag, message: 'VSP stage started' });

    const isProcessed = await this.isStageProcessed('vsp');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'vsp',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    // Get all items with vendor_sell_price > 0
    const itemsWithVSP = await this.itemsRepository
      .createQueryBuilder('item')
      .where('item.vendor_sell_price IS NOT NULL')
      .andWhere('item.vendor_sell_price > 0')
      .andWhere('NOT (:vsp = ANY(item.asset_class))', {
        vsp: VALUATION_TYPE.VSP,
      })
      .getMany();

    let addedCount = 0;

    for (const item of itemsWithVSP) {
      await this.addAssetClassToItem(item.id, VALUATION_TYPE.VSP);
      addedCount++;
    }

    await this.markStageAsProcessed('vsp');
    this.logger.log({
      logTag,
      count: addedCount,
      assetClass: VALUATION_TYPE.VSP,
      message: `Added VSP asset class to ${addedCount} items`,
    });
  }

  /**
   * In this stage we build tags
   */
  private async buildTags(): Promise<void> {
    const logTag = 'buildTags';
    this.logger.debug({ logTag, message: 'Tags stage started' });

    const isProcessed = await this.isStageProcessed('tags');
    if (isProcessed) {
      this.logger.log({
        logTag,
        stage: 'tags',
        message: `Stage already processed with current state, skipping`,
      });
      return;
    }

    const items = await this.itemsRepository.find();

    for (const item of items) {
      const tagsSet = new Set<string>(item.tags || []);

      if (item.expansion) tagsSet.add(item.expansion.toLowerCase());
      if (item.professionClass) tagsSet.add(item.professionClass.toLowerCase());

      if (item.assetClass) {
        item.assetClass.forEach((assetClass) => {
          tagsSet.add(assetClass.toLowerCase());
        });
      }

      if (item.itemClass) tagsSet.add(item.itemClass.toLowerCase());
      if (item.itemSubClass) tagsSet.add(item.itemSubClass.toLowerCase());
      if (item.quality) tagsSet.add(item.quality.toLowerCase());

      if (item.ticker) {
        item.ticker.split('.').forEach((ticker) => {
          const t = ticker.toLowerCase();
          if (t === 'j' || t === 'petal' || t === 'nugget') {
            tagsSet.add(t);
            return;
          }
          tagsSet.add(t);
        });
      }

      // Convert Set back to array
      const uniqueTags = Array.from(tagsSet);

      await this.itemsRepository.update({ id: item.id }, { tags: uniqueTags });

      this.logger.debug({
        logTag,
        itemId: item.id,
        tags: uniqueTags.join(', '),
        message: `Updated tags for item: ${item.id}`,
      });
    }

    await this.markStageAsProcessed('tags');
    this.logger.debug({ logTag, message: 'Tags stage ended' });
  }

  /**
   * Helper method to add an asset class to an item
   */
  private async addAssetClassToItem(
    itemId: number,
    assetClass: VALUATION_TYPE,
  ): Promise<void> {
    const logTag = 'addAssetClassToItem';

    const item = await this.itemsRepository.findOne({ where: { id: itemId } });

    if (!item) {
      this.logger.warn({
        logTag,
        itemId,
        assetClass,
        message: `Item not found: ${itemId}`,
      });
      return;
    }

    const currentAssetClasses = item.assetClass || [];

    if (!currentAssetClasses.includes(assetClass)) {
      await this.itemsRepository.update(
        { id: itemId },
        { assetClass: [...currentAssetClasses, assetClass] },
      );

      this.logger.debug({
        logTag,
        itemId,
        assetClass,
        message: `Added ${assetClass} asset class to item: ${itemId}`,
      });
    }
  }
}
