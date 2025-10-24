import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealmsEntity } from '@app/pg';
import { toSlug } from '../utils';

/**
 * In-memory cache service for realm lookups.
 * Loads all realms (~257) into memory on startup (~460KB total).
 * Provides O(1) lookup by name, slug, localeName, or localeSlug.
 */
@Injectable()
export class RealmsCacheService implements OnModuleInit {
  private readonly logger = new Logger(RealmsCacheService.name, { timestamp: true });
  
  private realmsById = new Map<number, RealmsEntity>();
  private realmsByName = new Map<string, RealmsEntity>();
  private realmsBySlug = new Map<string, RealmsEntity>();
  private realmsByLocaleName = new Map<string, RealmsEntity>();
  private realmsByLocaleSlug = new Map<string, RealmsEntity>();
  
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  async onModuleInit() {
    await this.loadRealms();
  }

  /**
   * Load all realms from database into memory cache
   */
  private async loadRealms(): Promise<void> {
    const logTag = 'loadRealms';
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const startTime = Date.now();
        const realms = await this.realmsRepository.find();
        
        // Clear existing maps
        this.realmsById.clear();
        this.realmsByName.clear();
        this.realmsBySlug.clear();
        this.realmsByLocaleName.clear();
        this.realmsByLocaleSlug.clear();

        // Build lookup maps
        for (const realm of realms) {
          this.realmsById.set(realm.id, realm);
          
          if (realm.name) {
            this.realmsByName.set(realm.name, realm);
            this.realmsByName.set(realm.name.toLowerCase(), realm);
          }
          
          if (realm.slug) {
            this.realmsBySlug.set(realm.slug, realm);
            this.realmsBySlug.set(realm.slug.toLowerCase(), realm);
          }
          
          if (realm.localeName) {
            this.realmsByLocaleName.set(realm.localeName, realm);
            this.realmsByLocaleName.set(realm.localeName.toLowerCase(), realm);
          }
          
          if (realm.localeSlug) {
            this.realmsByLocaleSlug.set(realm.localeSlug, realm);
            this.realmsByLocaleSlug.set(realm.localeSlug.toLowerCase(), realm);
          }
        }

        this.isInitialized = true;
        const duration = Date.now() - startTime;
        const memoryUsageKB = Math.round((realms.length * 450) / 1024);
        
        this.logger.log({
          logTag,
          realmCount: realms.length,
          duration,
          estimatedMemoryKB: memoryUsageKB,
          message: `Loaded ${realms.length} realms into memory cache in ${duration}ms (~${memoryUsageKB}KB)`
        });
      } catch (errorOrException) {
        this.logger.error({ logTag, errorOrException });
        this.isInitialized = false;
        this.initializationPromise = null;
        throw errorOrException;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Reload realms from database (useful after updates)
   */
  async reload(): Promise<void> {
    this.initializationPromise = null;
    this.isInitialized = false;
    await this.loadRealms();
  }

  /**
   * Find realm by any identifier (name, slug, localeName, localeSlug)
   * Returns null if not found
   */
  async findRealm(query: string): Promise<RealmsEntity | null> {
    if (!this.isInitialized) {
      await this.loadRealms();
    }

    if (!query) return null;

    // Try exact matches first
    let realm = this.realmsByName.get(query) 
      || this.realmsBySlug.get(query)
      || this.realmsByLocaleName.get(query)
      || this.realmsByLocaleSlug.get(query);

    if (realm) return realm;

    // Try with slug transformation
    const slug = toSlug(query);
    realm = this.realmsBySlug.get(slug) || this.realmsByLocaleSlug.get(slug);

    if (realm) return realm;

    // Try lowercase variations
    const lowerQuery = query.toLowerCase();
    realm = this.realmsByName.get(lowerQuery)
      || this.realmsBySlug.get(lowerQuery)
      || this.realmsByLocaleName.get(lowerQuery)
      || this.realmsByLocaleSlug.get(lowerQuery);

    return realm || null;
  }

  /**
   * Get realm by ID
   */
  async findById(id: number): Promise<RealmsEntity | null> {
    if (!this.isInitialized) {
      await this.loadRealms();
    }
    return this.realmsById.get(id) || null;
  }

  /**
   * Get realm by connected realm ID
   */
  async findByConnectedRealmId(connectedRealmId: number): Promise<RealmsEntity | null> {
    if (!this.isInitialized) {
      await this.loadRealms();
    }
    
    for (const realm of this.realmsById.values()) {
      if (realm.connectedRealmId === connectedRealmId) {
        return realm;
      }
    }
    return null;
  }

  /**
   * Get all realms
   */
  async getAll(): Promise<RealmsEntity[]> {
    if (!this.isInitialized) {
      await this.loadRealms();
    }
    return Array.from(this.realmsById.values());
  }

  /**
   * Check if cache is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      realmCount: this.realmsById.size,
      nameMapSize: this.realmsByName.size,
      slugMapSize: this.realmsBySlug.size,
      localeNameMapSize: this.realmsByLocaleName.size,
      localeSlugMapSize: this.realmsByLocaleSlug.size,
      estimatedMemoryKB: Math.round((this.realmsById.size * 450) / 1024),
    };
  }
}
