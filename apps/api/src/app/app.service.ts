import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CharactersEntity, GuildsEntity, ItemsEntity } from '@app/pg';
import { AppHealthPayload, SearchQueryDto } from '@app/resources';

@Injectable()
export class AppService {
  private readonly version: string;
  private readonly logger = new Logger(AppService.name, { timestamp: true });

  constructor(
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
  ) {
    this.version = this.loadVersion();
  }

  getHealth(): AppHealthPayload {
    return {
      status: 'ok',
      version: this.version,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }

  async indexSearch(input: SearchQueryDto): Promise<{
    characters: CharactersEntity[];
    guilds: GuildsEntity[];
    items: ItemsEntity[];
    hashMatches: { count: number };
  }> {
    const logTag = 'indexSearch';
    try {
      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        message: `Performing universal search: ${input.searchQuery}`,
      });

      const searchPattern = `${input.searchQuery}%`;
      const hashTypeChar = input.searchQuery.charAt(0).toLowerCase();
      const isHashQuery = /^[ab]$/.test(hashTypeChar) && input.searchQuery.length > 1;
      const hashValue = isHashQuery ? input.searchQuery.slice(1) : null;
      const isNumericQuery = /^\d+$/.test(input.searchQuery);
      const itemIdQuery = isNumericQuery ? parseInt(input.searchQuery, 10) : null;

      const [characters, guilds, items, hashMatches] = await Promise.all([
        this.charactersRepository.find({
          where: {
            guid: ILike(searchPattern),
          },
          take: 100,
        }),
        this.guildsRepository.find({
          where: {
            guid: ILike(searchPattern),
          },
          take: 100,
        }),
        this.itemsRepository
          .createQueryBuilder('items')
          .where('LOWER(items.name) LIKE LOWER(:searchPattern)', {
            searchPattern,
          })
          .orWhere('LOWER(items.names::text) LIKE LOWER(:searchPattern)', {
            searchPattern,
          })
          .orWhere('items.id = :searchQuery', { searchQuery: itemIdQuery })
          .take(100)
          .getMany(),
        isHashQuery
          ? this.charactersRepository
              .createQueryBuilder('c')
              .select('COUNT(*) as count')
              .where(
                hashTypeChar === 'a'
                  ? 'c.hashA = :hashValue'
                  : 'c.hashB = :hashValue',
                { hashValue },
              )
              .getRawOne()
          : Promise.resolve({ count: 0 }),
      ]);

      const hashMatchCount = Number(hashMatches?.count ?? 0);

      this.logger.log({
        logTag,
        searchQuery: input.searchQuery,
        characterCount: characters.length,
        guildCount: guilds.length,
        itemCount: items.length,
        hashMatchCount,
        message: `Search completed: ${characters.length} characters, ${guilds.length} guilds, ${items.length} items, ${hashMatchCount} hash matches`,
      });

      return {
        characters,
        guilds,
        items,
        hashMatches: {
          count: hashMatchCount,
        },
      };
    } catch (errorOrException) {
      this.logger.error({
        logTag,
        searchQuery: input.searchQuery,
        errorOrException,
        message: `Error performing universal search: ${input.searchQuery}`,
      });

      throw new ServiceUnavailableException(
        `Error performing search for ${input.searchQuery}`,
      );
    }
  }

  private loadVersion(): string {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
      const { version } = JSON.parse(packageJsonContent);
      return version ?? 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
}
