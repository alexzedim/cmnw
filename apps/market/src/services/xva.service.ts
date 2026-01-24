import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { S3Service } from '@app/s3';
import { BlizzAPI } from '@alexzedim/blizzapi';
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
  getKey,
  ItemPricing,
  toStringOrNumber,
  SKILL_LINE_KEY_MAPPING,
  SPELL_EFFECT_KEY_MAPPING,
  EXPANSION_TICKER_MAP,
  IProfessionResponse,
  IProfessionDetailResponse,
  ISkillTieryResponse,
  isBnetProfessionIndexResponse,
  isBnetProfessionDetailResponse,
  isBnetSkillTierDetailResponse,
  IAssetClassBuildArgs,
  MARKET_TYPE,
  VALUATION_TYPE,
  LabPricingMethod,
  REDIS_TTL,
  BATCH_SIZE,
} from '@app/resources';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class XvaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(XvaService.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
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
    await this.runPricingPhase();
    await this.runValuationsPhase();
  }

  /**
   * Phase 1: PRICING - Build all pricing methods
   */
  private async runPricingPhase(): Promise<void> {
    const logTag = 'runPricingPhase';
    this.logger.log({ logTag, message: 'Starting pricing phase' });

    // Blizzard API indexing
    if (dmaConfig.isItemsPricingInit && dmaConfig.isPricingIndexProfessions) {
      await this.indexPricing(GLOBAL_DMA_KEY, true);
    }

    // Lab pricing (reverse methods)
    if (dmaConfig.isItemsPricingLab) {
      await this.libPricing({
        isProspect: dmaConfig.isPricingLabProspecting,
        isMilling: dmaConfig.isPricingLabMilling,
        isDisenchant: dmaConfig.isPricingLabDisenchanting,
      });
    }

    // CSV data building
    if (dmaConfig.isItemsPricingBuild) {
      await this.buildSkillLine(dmaConfig.isPricingBuildSkillLine);
      await this.buildSpellEffect(dmaConfig.isPricingBuildSpellEffect);
      await this.buildSpellReagents(dmaConfig.isPricingBuildSpellReagents);
    }

    this.logger.log({ logTag, message: 'Pricing phase completed' });
  }

  /**
   * Phase 2: VALUATIONS - Assign asset classes
   */
  private async runValuationsPhase(): Promise<void> {
    const logTag = 'runValuationsPhase';
    this.logger.log({ logTag, message: 'Starting valuations phase' });

    if (!dmaConfig.isValuationsBuild) {
      this.logger.debug({ logTag, message: 'Valuations build disabled' });
      return;
    }

    await this.buildAssetClasses({
      isByPricing: dmaConfig.isValuationsFromPricing,
      isByAuctions: dmaConfig.isValuationsFromAuctions,
      isByPremium: dmaConfig.isValuationsForPremium,
      isByCurrency: dmaConfig.isValuationsForCurrency,
      isByTags: dmaConfig.isValuationsBuildTags,
    });

    this.logger.log({ logTag, message: 'Valuations phase completed' });
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
   * Mark CSV file as processed in Redis
   */
  private async markFileAsProcessed(
    fileName: string,
    fileContent: string,
  ): Promise<void> {
    const fileHash = createHash('md5').update(fileContent).digest('hex');
    const redisKey = `PRICING_CSV_PROCESSED:${fileName}:${fileHash}`;
    await this.redisService.setex(
      redisKey,
      REDIS_TTL.CSV_FILES,
      new Date().toISOString(),
    );
    this.logger.debug({
      logTag: 'markFileAsProcessed',
      fileName,
      fileHash,
      message: `Marked file as processed: ${fileName}`,
    });
  }

  // ============================================================================
  // PRICING METHODS - Lab Pricing (Reverse Methods)
  // ============================================================================

  async libPricing(options: {
    isProspect?: boolean;
    isMilling?: boolean;
    isDisenchant?: boolean;
  }): Promise<void> {
    const logTag = 'libPricing';
    const { isProspect = false, isMilling = false, isDisenchant = false } = options;

    try {
      if (!isProspect && !isMilling && !isDisenchant) {
        this.logger.debug({
          logTag,
          message: 'All lab methods disabled, skipping',
        });
        return;
      }

      // Clear existing lab pricing data
      const deletePricing = await this.pricingRepository.delete({
        createdBy: DMA_SOURCE.LAB,
      });
      this.logger.log({
        logTag,
        deletedCount: deletePricing.affected,
        message: `Cleared ${deletePricing.affected} existing lab pricing entries`,
      });

      // Process enabled methods
      const methods: Array<{ enabled: boolean; config: LabPricingMethod }> = [
        { enabled: isProspect, config: PROSPECTING },
        { enabled: isMilling, config: MILLING },
        { enabled: isDisenchant, config: DISENCHANTING },
      ];

      for (const { enabled, config } of methods) {
        if (enabled) {
          await this.processLabPricingMethod(config);
        }
      }
    } catch (errorOrException) {
      this.logger.error({ logTag, errorOrException });
    }
  }

  /**
   * Generic method to process any lab pricing method (prospecting, milling, disenchanting)
   */
  private async processLabPricingMethod(config: LabPricingMethod): Promise<void> {
    const logTag = 'processLabPricingMethod';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: config.name,
        media: config.media,
        spellId: config.spellId,
        profession: config.name,
        expansion: 'TWW',
        type: PRICING_TYPE.REVERSE,
        createdBy: DMA_SOURCE.LAB,
        updatedBy: DMA_SOURCE.LAB,
      });

      let methodCount = 0;

      await lastValueFrom(
        from(config.methods).pipe(
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
        method: config.name,
        count: methodCount,
        spellId: config.spellId,
        message: `Processed ${methodCount} ${config.name.toLowerCase()} methods`,
      });
    } catch (errorOrException) {
      this.logger.error({ logTag, method: config.name, errorOrException });
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
        await this.BNet.query<IProfessionResponse>(
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

      for (const profession of professions) {
        const professionDetailResponse =
          await this.BNet.query<IProfessionDetailResponse>(
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

        for (const tier of skill_tiers) {
          let expansion: string = 'CLSC';

          Array.from(EXPANSION_TICKER_MAP.entries()).some(([k, v]) => {
            tier.name.en_GB?.includes(k) ? (expansion = v) : '';
          });

          const skillTierDetailResponse =
            await this.BNet.query<ISkillTieryResponse>(
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

          for (const category of categories) {
            const { recipes } = category;
            if (!recipes) continue;

            for (const recipe of recipes) {
              // @todo request one by one before inserting
              const pricingExists = await this.pricingRepository.existsBy({
                recipeId: recipe.id,
                expansion: expansion,
                profession: String(profession.id),
              });

              if (!pricingExists) {
                const pricingEntity = this.pricingRepository.create({
                  recipeId: recipe.id,
                  expansion: expansion,
                  profession: String(profession.id),
                });

                await this.pricingRepository.save(pricingEntity);
              }
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

      await this.markFileAsProcessed(CsvFileName.SpellReagents, spellReagentsCsv);
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
      return createHash('md5').update(`${stage}:${Date.now()}`).digest('hex');
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
   * Mark a stage as processed
   */
  private async markStageAsProcessed(stage: string): Promise<void> {
    const stateHash = await this.generateStateHash(stage);
    const redisKey = `VALUATION_STAGE_PROCESSED:${stage}:${stateHash}`;
    await this.redisService.setex(
      redisKey,
      REDIS_TTL.VALUATION_STAGES,
      new Date().toISOString(),
    );
    this.logger.debug({
      logTag: 'markStageAsProcessed',
      stage,
      message: `Marked stage as processed: ${stage}`,
    });
  }

  // ============================================================================
  // VALUATIONS METHODS - Asset Class Building
  // ============================================================================

  /**
   * Build asset classes based on various data sources
   */
  async buildAssetClasses(args: IAssetClassBuildArgs): Promise<void> {
    const logTag = 'buildAssetClasses';
    this.logger.log({ logTag, args, message: 'Building asset classes' });

    try {
      const stages = [
        {
          enabled: args.isByPricing,
          fn: () => this.buildAssetClassesFromPricing(),
        },
        {
          enabled: args.isByAuctions,
          fn: () => this.buildAssetClassesFromAuctions(),
        },
        {
          enabled: args.isByPremium,
          fn: () => this.buildAssetClassesForPremium(),
        },
        {
          enabled: args.isByCurrency,
          fn: () => this.buildAssetClassesForCurrency(),
        },
        { enabled: true, fn: () => this.addToAssetClassVSP() }, // Always run VSP
        { enabled: args.isByTags, fn: () => this.buildTags() },
      ];

      for (const stage of stages) {
        if (stage.enabled) {
          await stage.fn();
        }
      }
    } catch (errorOrException) {
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

    if (await this.isStageProcessed('pricing')) {
      this.logger.log({ logTag, message: 'Stage already processed, skipping' });
      return;
    }

    const pricings = await this.pricingRepository.find();

    // Collect all item IDs and their asset classes
    const derivativeIds: number[] = [];
    const reagentIds: number[] = [];

    for (const pricing of pricings) {
      if (pricing.derivatives) {
        const derivatives = this.parseJsonField(pricing.derivatives);
        derivatives.forEach((d) => {
          const itemId = typeof d === 'object' ? d.itemId : d;
          if (itemId) derivativeIds.push(itemId);
        });
      }

      if (pricing.reagents) {
        const reagents = this.parseJsonField(pricing.reagents);
        reagents.forEach((r) => {
          const itemId = typeof r === 'object' ? r.itemId : r;
          if (itemId) reagentIds.push(itemId);
        });
      }
    }

    // Batch process derivatives and reagents
    await this.batchAddAssetClass(derivativeIds, VALUATION_TYPE.DERIVATIVE);
    await this.batchAddAssetClass(reagentIds, VALUATION_TYPE.REAGENT);

    await this.markStageAsProcessed('pricing');
    this.logger.log({
      logTag,
      derivatives: derivativeIds.length,
      reagents: reagentIds.length,
      message: 'Pricing stage completed',
    });
  }

  /**
   * This stage adds asset_classes from market/auction data
   * such as COMMDTY / ITEM and MARKET
   */
  private async buildAssetClassesFromAuctions(): Promise<void> {
    const logTag = 'buildAssetClassesFromAuctions';
    this.logger.debug({ logTag, message: 'Auctions stage started' });

    if (await this.isStageProcessed('auctions')) {
      this.logger.log({ logTag, message: 'Stage already processed, skipping' });
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
          assetClass: () => `array_append(asset_class, '${VALUATION_TYPE.MARKET}')`,
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
          assetClass: () => `array_append(asset_class, '${VALUATION_TYPE.COMMDTY}')`,
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
          assetClass: () => `array_append(asset_class, '${VALUATION_TYPE.ITEM}')`,
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

    if (await this.isStageProcessed('premium')) {
      this.logger.log({ logTag, message: 'Stage already processed, skipping' });
      return;
    }

    const premiumItems = await this.itemsRepository
      .createQueryBuilder('item')
      .where(':reagent = ANY(item.asset_class)', {
        reagent: VALUATION_TYPE.REAGENT,
      })
      .andWhere('item.loot_type = :lootType', { lootType: 'ON_ACQUIRE' })
      .getMany();

    const premiumIds = premiumItems.map((item) => item.id);
    await this.batchAddAssetClass(premiumIds, VALUATION_TYPE.PREMIUM);

    await this.markStageAsProcessed('premium');
    this.logger.log({
      logTag,
      count: premiumIds.length,
      message: 'Premium stage completed',
    });
  }

  /**
   * This stage defines CURRENCY and WOWTOKEN asset classes
   */
  private async buildAssetClassesForCurrency(): Promise<void> {
    const logTag = 'buildAssetClassesForCurrency';
    this.logger.debug({ logTag, message: 'Currency stage started' });

    if (await this.isStageProcessed('currency')) {
      this.logger.log({ logTag, message: 'Stage already processed, skipping' });
      return;
    }

    // WoW Token items
    await this.addAssetClassToItem(122270, VALUATION_TYPE.WOWTOKEN);
    await this.addAssetClassToItem(122284, VALUATION_TYPE.WOWTOKEN);
    // Gold currency
    await this.addAssetClassToItem(1, VALUATION_TYPE.GOLD);

    await this.markStageAsProcessed('currency');
    this.logger.log({ logTag, message: 'Currency stage completed' });
  }

  /**
   * Add VSP asset class to items with vendor sell price
   * Runs as a separate stage before tags
   */
  async addToAssetClassVSP(): Promise<void> {
    const logTag = 'addToAssetClassVSP';
    this.logger.debug({ logTag, message: 'VSP stage started' });

    if (await this.isStageProcessed('vsp')) {
      this.logger.log({ logTag, message: 'Stage already processed, skipping' });
      return;
    }

    const itemsWithVSP = await this.itemsRepository
      .createQueryBuilder('item')
      .select('item.id')
      .where('item.vendor_sell_price IS NOT NULL')
      .andWhere('item.vendor_sell_price > 0')
      .andWhere('NOT (:vsp = ANY(item.asset_class))', {
        vsp: VALUATION_TYPE.VSP,
      })
      .getMany();

    const vspIds = itemsWithVSP.map((item) => item.id);
    await this.batchAddAssetClass(vspIds, VALUATION_TYPE.VSP);

    await this.markStageAsProcessed('vsp');
    this.logger.log({
      logTag,
      count: vspIds.length,
      message: 'VSP stage completed',
    });
  }

  /**
   * In this stage we build tags
   */
  private async buildTags(): Promise<void> {
    const logTag = 'buildTags';
    this.logger.debug({ logTag, message: 'Tags stage started' });

    if (await this.isStageProcessed('tags')) {
      this.logger.log({ logTag, message: 'Stage already processed, skipping' });
      return;
    }

    const items = await this.itemsRepository.find();
    const updates: Array<{ id: number; tags: string[] }> = [];

    for (const item of items) {
      const tags = this.buildTagsForItem(item);
      if (tags.length > 0) {
        updates.push({ id: item.id, tags });
      }
    }

    // Batch update tags
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk = updates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map((update) =>
          this.itemsRepository.update({ id: update.id }, { tags: update.tags }),
        ),
      );
    }

    await this.markStageAsProcessed('tags');
    this.logger.log({
      logTag,
      count: updates.length,
      message: 'Tags stage completed',
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Parse JSON field that might be string or already parsed
   */
  private parseJsonField(field: any): any[] {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return Array.isArray(field) ? field : [];
  }

  /**
   * Batch add asset class to multiple items
   */
  private async batchAddAssetClass(
    itemIds: number[],
    assetClass: VALUATION_TYPE,
  ): Promise<void> {
    if (itemIds.length === 0) return;

    // Remove duplicates
    const uniqueIds = [...new Set(itemIds)];

    // Process in batches
    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      const chunk = uniqueIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map((itemId) => this.addAssetClassToItem(itemId, assetClass)),
      );
    }
  }

  /**
   * Build tags for a single item
   */
  private buildTagsForItem(item: ItemsEntity): string[] {
    const tagsSet = new Set<string>(item.tags || []);

    // Add various item properties as tags
    const fieldsToTag = [
      item.expansion,
      item.professionClass,
      item.itemClass,
      item.itemSubClass,
      item.quality,
    ];

    fieldsToTag.forEach((field) => {
      if (field) tagsSet.add(field.toLowerCase());
    });

    // Add asset classes as tags
    if (item.assetClass) {
      item.assetClass.forEach((ac) => tagsSet.add(ac.toLowerCase()));
    }

    // Add ticker parts as tags
    if (item.ticker) {
      item.ticker.split('.').forEach((ticker) => {
        tagsSet.add(ticker.toLowerCase());
      });
    }

    return Array.from(tagsSet);
  }

  /**
   * Helper method to add an asset class to an item
   */
  private async addAssetClassToItem(
    itemId: number,
    assetClass: VALUATION_TYPE,
  ): Promise<void> {
    const item = await this.itemsRepository.findOne({ where: { id: itemId } });

    if (!item) {
      return;
    }

    const currentAssetClasses = item.assetClass || [];

    if (!currentAssetClasses.includes(assetClass)) {
      await this.itemsRepository.update(
        { id: itemId },
        { assetClass: [...currentAssetClasses, assetClass] },
      );
    }
  }
}
