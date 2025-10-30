# Foreign Key Policy Analysis

## Current State: ❌ NO FOREIGN KEYS

Your database currently has **ZERO** foreign key constraints defined, which means no referential integrity is enforced at the database level.

## Impact

### Pros (Current Approach)
- ✅ Maximum flexibility for data operations
- ✅ No cascading delete concerns
- ✅ Faster bulk operations (no constraint checking)
- ✅ Can insert data in any order

### Cons (Current Issues)
- ❌ **Orphaned Records**: 541,480+ orphaned references found
- ❌ **Data Integrity**: No database-level validation
- ❌ **Application Burden**: Must handle all referential integrity in code
- ❌ **Query Performance**: Can't rely on DB optimizer understanding relationships

## Orphaned Records Analysis

Based on analysis of 5.6M+ character records:

| Relationship | Total | Orphaned | % |
|--------------|-------|----------|---|
| characters.guild_id → guilds.id | 4,489,293 | 326,726 | 7.3% |
| characters.guild_guid → guilds.guid | 4,366,322 | 214,754 | 4.9% |
| characters_guild_members.character_guid → characters.guid | 3,791,737 | 221 | 0.01% |
| characters.realm_id → realms.id | 5,676,040 | 0 | 0% ✅ |
| characters.realm → realms.slug | 5,676,040 | 0 | 0% ✅ |

## Recommended Foreign Key Strategy

### Approach A: Strict Foreign Keys (Not Recommended for Your Use Case)
```sql
ON DELETE CASCADE  -- Deletes child records when parent is deleted
ON UPDATE CASCADE  -- Updates references when parent key changes
```
**Risk**: Could accidentally delete millions of character records if a guild is deleted.

### Approach B: Soft Foreign Keys with SET NULL (RECOMMENDED)
```sql
ON DELETE SET NULL  -- Sets reference to NULL when parent is deleted
ON UPDATE CASCADE   -- Updates references when parent key changes
```
**Benefits**: 
- Preserves historical data
- Prevents orphaned IDs
- Safe for your use case where characters/guilds may be temporarily unlinked

### Approach C: NO ACTION (Current - Application Managed)
```sql
-- No constraints at database level
```
**Benefits**:
- Full application control
- Handles complex business logic
- Works with current codebase without changes

## Proposed Foreign Keys

### Core Relationships (High Priority)

```sql
-- 1. Characters → Realms (Perfect integrity - 0 orphans)
ALTER TABLE characters 
ADD CONSTRAINT fk_characters_realm_id 
FOREIGN KEY (realm_id) REFERENCES realms(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE characters 
ADD CONSTRAINT fk_characters_realm 
FOREIGN KEY (realm) REFERENCES realms(slug) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Guild Members → Guilds (Perfect integrity - 0 orphans)
ALTER TABLE characters_guild_members 
ADD CONSTRAINT fk_guild_members_guild_guid 
FOREIGN KEY (guild_guid) REFERENCES guilds(guid) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Guild Members → Characters (221 orphans - need cleanup first)
-- Clean orphans first, then add:
ALTER TABLE characters_guild_members 
ADD CONSTRAINT fk_guild_members_character_guid 
FOREIGN KEY (character_guid) REFERENCES characters(guid) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Characters → Guilds (Soft reference)
ALTER TABLE characters 
ADD CONSTRAINT fk_characters_guild_id 
FOREIGN KEY (guild_id) REFERENCES guilds(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE characters 
ADD CONSTRAINT fk_characters_guild_guid 
FOREIGN KEY (guild_guid) REFERENCES guilds(guid) 
ON DELETE SET NULL ON UPDATE CASCADE;
```

### Item Relationships

```sql
-- Characters Mounts → Mounts
ALTER TABLE characters_mounts 
ADD CONSTRAINT fk_characters_mounts_mount_id 
FOREIGN KEY (mount_id) REFERENCES mounts(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Characters Mounts → Characters
ALTER TABLE characters_mounts 
ADD CONSTRAINT fk_characters_mounts_character_guid 
FOREIGN KEY (character_guid) REFERENCES characters(guid) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Characters Pets → Pets
ALTER TABLE characters_pets 
ADD CONSTRAINT fk_characters_pets_pet_id 
FOREIGN KEY (pet_id) REFERENCES pets(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Characters Pets → Characters
ALTER TABLE characters_pets 
ADD CONSTRAINT fk_characters_pets_character_guid 
FOREIGN KEY (character_guid) REFERENCES characters(guid) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Market → Items
ALTER TABLE market 
ADD CONSTRAINT fk_market_item_id 
FOREIGN KEY (item_id) REFERENCES items(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Pricing → (no item_id found in entity)
```

### Guild Relationships

```sql
-- Guilds → Realms
ALTER TABLE guilds 
ADD CONSTRAINT fk_guilds_realm_id 
FOREIGN KEY (realm_id) REFERENCES realms(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE guilds 
ADD CONSTRAINT fk_guilds_realm 
FOREIGN KEY (realm) REFERENCES realms(slug) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Guild Logs → Guilds
ALTER TABLE characters_guilds_logs 
ADD CONSTRAINT fk_guild_logs_guild_guid 
FOREIGN KEY (guild_guid) REFERENCES guilds(guid) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Guild Logs → Characters
ALTER TABLE characters_guilds_logs 
ADD CONSTRAINT fk_guild_logs_character_guid 
FOREIGN KEY (character_guid) REFERENCES characters(guid) 
ON DELETE SET NULL ON UPDATE CASCADE;
```

## TypeORM Entity Recommendations

Currently, your TypeORM entities have NO relationship decorators (`@ManyToOne`, `@OneToMany`, etc.).

### Benefits of Adding TypeORM Relations:
- ✅ Better developer experience with eager/lazy loading
- ✅ Automatic JOIN queries
- ✅ Type-safe relationships
- ✅ Can sync with database constraints

### Example Implementation:

```typescript
// guilds.entity.ts
@Entity({ name: CMNW_ENTITY_ENUM.GUILDS })
export class GuildsEntity {
  // ... existing fields ...
  
  @ManyToOne(() => RealmsEntity, { nullable: false })
  @JoinColumn({ name: 'realm_id' })
  realmEntity?: RealmsEntity;
  
  @OneToMany(() => CharactersEntity, character => character.guild)
  characters?: CharactersEntity[];
  
  @OneToMany(() => CharactersGuildsMembersEntity, member => member.guild)
  members?: CharactersGuildsMembersEntity[];
}

// characters.entity.ts
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS })
export class CharactersEntity {
  // ... existing fields ...
  
  @ManyToOne(() => GuildsEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'guild_id' })
  guild?: GuildsEntity;
  
  @ManyToOne(() => RealmsEntity, { nullable: false })
  @JoinColumn({ name: 'realm_id' })
  realm?: RealmsEntity;
}
```

## Migration Strategy

### Phase 1: Analysis & Cleanup (DONE)
- ✅ Identified all potential foreign keys
- ✅ Found orphaned records
- ⏭️ Clean up orphaned records

### Phase 2: Add Safe Foreign Keys
1. Start with perfect integrity (0 orphans):
   - characters → realms
   - guild_members → guilds
   
2. Clean orphans, then add:
   - guild_members → characters (221 orphans)
   - guild_logs → guilds (1 orphan)
   - guild_logs → characters (127 orphans)

### Phase 3: Add Soft Foreign Keys
1. Characters → Guilds (with SET NULL)
   - Handle 326k+ orphaned guild_id references
   - Handle 214k+ orphaned guild_guid references

### Phase 4: TypeORM Relations (Optional)
1. Add @ManyToOne/@OneToMany decorators
2. Update services to use relations
3. Test with synchronize: false

## Decision: NO FOREIGN KEYS (Application-Level Integrity)

**✅ APPROVED APPROACH: No database-level foreign keys**

### Rationale

For OSINT data aggregation from external sources (Blizzard API), foreign keys would be problematic because:

1. **External Data Control**: Can't control when Blizzard deletes guilds/characters
2. **Out-of-Order Data**: Data may arrive in any sequence from various workers
3. **Historical Preservation**: Need to keep records even if parent entities are deleted upstream
4. **Performance**: High-throughput data ingestion without constraint checking overhead
5. **Flexibility**: Can handle partial/incomplete data from API failures

### Expected Orphan Rate

**7-8% orphaned guild references is NORMAL and EXPECTED** for this use case:
- Guilds disbanded in Blizzard's system
- Characters transferred between guilds/realms  
- Historical snapshots of deleted entities
- API inconsistencies/timing issues

### Application-Level Integrity Strategy

✅ **Indexes**: Maintain all performance indexes on foreign key columns
✅ **Validation**: Handle referential integrity in service layer
✅ **Cleanup Jobs**: Periodic cleanup of stale orphaned records (optional)
✅ **Monitoring**: Track orphan percentage to detect anomalies
✅ **Documentation**: This document serves as the policy reference

### Benefits of This Approach

- ✅ Maximum flexibility for data operations
- ✅ No cascading delete concerns
- ✅ Faster bulk insert/update operations
- ✅ Can process data in any order
- ✅ Handles upstream data deletions gracefully
- ✅ Preserves historical snapshots
- ✅ Resilient to API inconsistencies

## Files

- Analysis Script: `migrations/check-all-foreign-keys.js`
- This Document: `docs/FOREIGN_KEY_POLICY.md`
