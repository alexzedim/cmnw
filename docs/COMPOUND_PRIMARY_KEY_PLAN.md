# Compound Primary Key Implementation Plan
## CharactersGuildsMembersEntity Migration

### Overview
Migrate from UUID-based primary key to a composite primary key using `(guild_id, character_id, realm_id)`.

### Current State
- **Entity File**: `libs/pg/src/entity/characters-guilds-members.entity.ts`
- **Primary Key**: `uuid` (auto-generated UUID)
- **Target Primary Key**: Composite of `guild_id` + `character_id` + `realm_id`
- **Database**: PostgreSQL with TypeORM synchronize enabled
- **Approach**: Manual data cleanup, then TypeORM synchronize

### Implementation Steps

#### Phase 1: Data Preparation (Manual)
1. Identify and handle duplicate entries in the database
   - Query: `SELECT guild_id, character_id, realm_id, COUNT(*) FROM characters_guilds_members GROUP BY guild_id, character_id, realm_id HAVING COUNT(*) > 1`
   - Action: Keep the most recent entry (by `created_at` or `last_modified`), delete others
   
2. Ensure no NULL values in the composite key columns
   - All three columns (`guild_id`, `character_id`, `realm_id`) must be NOT NULL

#### Phase 2: Entity Update
1. Update `libs/pg/src/entity/characters-guilds-members.entity.ts`:
   - Remove: `@PrimaryGeneratedColumn('uuid')` and `readonly uuid: string;`
   - Add: `@PrimaryColumn('int', { name: 'guild_id' })` to `guildId`
   - Add: `@PrimaryColumn('int', { name: 'character_id' })` to `characterId`
   - Add: `@PrimaryColumn('int', { name: 'realm_id' })` to `realmId`
   - Update column decorators to remove `name` property from these three columns (they'll be inferred)

#### Phase 3: Code Review & Updates
1. Search for any references to `.uuid` property in:
   - Services (guild-member.service, guild-master.service, etc.)
   - DAOs
   - Controllers
   - Tests
   
2. Update any queries that select or filter by UUID

#### Phase 4: Database Migration
1. TypeORM will automatically:
   - Drop the `uuid` column
   - Create the composite primary key constraint
   - Update indexes as needed

2. Verify the migration:
   - Check table structure: `\d characters_guilds_members`
   - Verify primary key: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='characters_guilds_members' AND constraint_type='PRIMARY KEY'`

#### Phase 5: Testing
1. Run existing tests to ensure no breakage
2. Verify data integrity:
   - No duplicate (guild_id, character_id, realm_id) combinations
   - All primary key columns are NOT NULL
   - Foreign key relationships still work

### Rollback Plan
If issues occur:
1. Restore from database backup
2. Revert entity changes
3. Investigate root cause

### Files to Modify
- `libs/pg/src/entity/characters-guilds-members.entity.ts` - Entity definition
- Any service/DAO files that reference `.uuid` property
- Test files if they mock the entity

### Estimated Impact
- **Low Risk**: The UUID is not used in business logic (code uses `characterId` for keying)
- **Medium Effort**: Requires careful data cleanup and testing
- **High Benefit**: Better data integrity with natural composite key

### Notes
- TypeORM's `synchronize: true` will handle schema changes automatically
- The composite key naturally enforces uniqueness of guild memberships
- Existing indexes on `guildGuid`, `characterGuid`, and `realm` will remain
