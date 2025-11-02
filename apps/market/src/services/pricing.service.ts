import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { S3Service } from '@app/s3';
import { InjectQueue } from '@nestjs/bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Queue } from 'bullmq';
import csv from 'async-csv';
import { Cron, CronExpression } from '@nestjs/schedule';
import { get } from 'lodash';
import { DISENCHANTING, MILLING, PROSPECTING } from '../libs';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  KeysEntity,
  PricingEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
} from '@app/pg';
import { Repository } from 'typeorm';
import { dmaConfig } from '@app/configuration';
import {
  DMA_SOURCE,
  EXPANSION_TICKER,
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
  isResponseError,
  isBnetProfessionIndexResponse,
  isBnetProfessionDetailResponse,
  isBnetSkillTierDetailResponse,
  hasBnetSkillTiers,
  hasBnetCategories,
  hasBnetRecipes,
} from '@app/resources';

@Injectable()
export class PricingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PricingService.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
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
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Helper method to read CSV files from S3 cmnw bucket
   */
  private async readCsvFile(fileName: string): Promise<string> {
    const logTag = 'readCsvFile';
    try {
      return await this.s3Service.readFile(fileName, 'cmnw');
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        fileName,
        bucket: 'cmnw',
        errorOrException,
        message: `CSV file not found in S3 bucket: ${fileName}`,
      });
      throw new Error(`CSV file not found in S3: ${fileName}`);
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexPricing(GLOBAL_DMA_KEY, dmaConfig.isItemsPricingInit);

    await this.libPricing(dmaConfig.isItemsPricingLab, true, true, true);

    await this.buildSkillLine(dmaConfig.isItemsPricingBuild);
    await this.buildSpellEffect(dmaConfig.isItemsPricingBuild);
    await this.buildSpellReagents(dmaConfig.isItemsPricingBuild);
  }

  async libPricing(
    isItemsPricingLab: boolean = true,
    isProspect: boolean = false,
    isDisenchant: boolean = false,
    isMilling: boolean = false,
  ): Promise<void> {
    const logTag = this.libPricing.name;
    try {
      if (!isItemsPricingLab) {
        this.logger.debug({
          logTag,
          isItemsPricingLab,
          message: `Items pricing lab disabled: ${isItemsPricingLab}`,
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
        await this.libPricingProspect();
      }

      if (isMilling) {
        await this.libPricingMilling();
      }

      if (isDisenchant) {
        await this.libPricingDisenchant();
      }
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error processing lib pricing',
      });
    }
  }

  private async libPricingProspect(): Promise<void> {
    const logTag = 'libPricingProspect';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: PROSPECTING.name,
        media:
          'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_gem_bloodgem_01.jpg',
        spellId: 31252,
        profession: 'PROFESSION',
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
      this.logger.error({
        logTag,
        method: PROSPECTING.name,
        errorOrException,
        message: 'Error processing prospecting pricing',
      });
    }
  }

  private async libPricingMilling(): Promise<void> {
    const logTag = 'libPricingMilling';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: MILLING.name,
        media:
          'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg',
        spellId: 51005,
        profession: 'PROFESSION',
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
      this.logger.error({
        logTag,
        method: MILLING.name,
        errorOrException,
        message: 'Error processing milling pricing',
      });
    }
  }

  private async libPricingDisenchant(): Promise<void> {
    const logTag = 'libPricingDisenchant';
    try {
      const reversePricingMethod = this.pricingRepository.create({
        ticker: DISENCHANTING.name,
        media:
          'https://render-eu.worldofwarcraft.com/icons/56/inv_enchant_disenchant.jpg',
        spellId: 13262,
        profession: 'PROFESSION',
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
      this.logger.error({
        logTag,
        method: DISENCHANTING.name,
        errorOrException,
        message: 'Error processing disenchanting pricing',
      });
    }
  }

  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_10AM)
  async indexPricing(
    clearance: string = GLOBAL_DMA_KEY,
    isItemsPricingInit: boolean = true,
  ): Promise<void> {
    const logTag = this.indexPricing.name;
    try {
      if (!isItemsPricingInit) {
        this.logger.log({
          logTag,
          isItemsPricingInit,
          message: `Items pricing init disabled: ${isItemsPricingInit}`,
        });
        return;
      }

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
      this.logger.error({
        logTag: logTag,
        error: errorOrException,
      });
    }
  }

  async buildSkillLine(buildSkillLine: boolean = true): Promise<void> {
    const logTag = this.buildSkillLine.name;
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
        'skilllineability.csv',
      );

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
        /**
         * SkillLine
         *
         * SkillLine - professionID
         * Spell - spellID
         * SupersedesSpell - determines RANK of currentSpell, supersedes weak rank
         * MinSkillLineRank - require skill points
         * Flags: 0 or 16 ??????
         * NumSkillUps - skill points up, on craft
         * TrivialSkillLineRankHigh - greenCraftQ
         * TrivialSkillLineRankLow - yellowCraftQ
         * SkillUpSkillLineID represent subCategory in professions, for expansionTicker
         */
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
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error building skill line',
      });
    }
  }

  async buildSpellEffect(isItemsPricingBuild: boolean = true): Promise<void> {
    const logTag = this.buildSpellEffect.name;
    if (!isItemsPricingBuild) {
      this.logger.debug({
        logTag,
        isItemsPricingBuild,
        message: `Spell effect build disabled: ${isItemsPricingBuild}`,
      });
      return;
    }

    try {
      const spellEffectCsv = await this.readCsvFile('spelleffect.csv');

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
        /**
         *  SpellEffectDB
         *
         *  Effect - effect flag
         *  EffectItemType - itemId
         *  EffectBasePointsF - item_quantity
         *  spellID - spellId
         */
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
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error building spell effect',
      });
    }
  }

  async buildSpellReagents(isItemsPricingBuild: boolean = true): Promise<void> {
    const logTag = this.buildSpellReagents.name;
    if (!isItemsPricingBuild) {
      this.logger.debug({
        logTag,
        isItemsPricingBuild,
        message: `Spell reagents build disabled: ${isItemsPricingBuild}`,
      });
      return;
    }

    try {
      const spellReagentsCsv = await this.readCsvFile('spellreagents.csv');

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
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        errorOrException,
        message: 'Error building spell reagents',
      });
    }
  }
}
