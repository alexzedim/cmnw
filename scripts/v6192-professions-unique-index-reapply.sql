-- v6.19.2: re-apply the professions natural-key UNIQUE index.
--
-- Why a re-run is needed: v6.19.0 created this index UNIQUE NULLS NOT DISTINCT
-- (scripts/v619-professions-constraint-and-zombies.sql), but the entity metadata
-- kept declaring the index as NON-unique. With synchronize: true
-- (libs/configuration/src/postgres.config.ts), TypeORM's shouldDropIndices
-- downgraded it to a plain btree at the first boot of the v6.19.x images, and
-- syncCharacterProfessions started failing with "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification"
-- (~76K failures per 6h observed 2026-10-12).
--
-- The index is renamed to uq__cp__character_profession_tier: unique indexes in
-- this repo follow the uq__* convention, and the entity now declares
-- @Index('uq__cp__character_profession_tier', ..., { unique: true }) — a live
-- UNIQUE NULLS NOT DISTINCT index introspects as isUnique = true, so
-- synchronize sees a match and never touches it again.
--
-- Run order: section 1 (pre-checks) -> section 2 (index swap) -> section 3 (verification).
-- NOT a transaction: CREATE INDEX CONCURRENTLY cannot run inside one.
-- No write lock: the new index builds alongside the old one; the upsert keeps
-- failing only until the swap completes.
-- Safe to run while v6.19.1 images are live (running processes never re-sync;
-- only boots do). After the swap, do NOT boot any pre-v6.19.2 image: its
-- metadata expects ix__cp__character_profession_tier and would drop
-- uq__cp__character_profession_tier, recreating the broken plain index.
-- Deploying v6.19.2 right after is the intended flow.

-- =============================================================================
-- 1. PRE-CHECKS (read-only)
-- =============================================================================

-- 1.1 Current state: expect the downgraded PLAIN btree under the old name,
--     no uq__ index yet
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'characters_professions'
  AND indexname IN ('ix__cp__character_profession_tier', 'uq__cp__character_profession_tier');

-- 1.2 Duplicate natural keys must be 0 (NULLs group together here, matching
--     NULLS NOT DISTINCT semantics). If > 0, STOP and run the v6.19.0 dedup
--     (scripts/v619-professions-constraint-and-zombies.sql section 2.1) first.
SELECT count(*) AS duplicate_groups FROM (
  SELECT character_guid, profession_id, tier_id
  FROM characters_professions
  GROUP BY character_guid, profession_id, tier_id
  HAVING count(*) > 1
) d;

-- =============================================================================
-- 2. INDEX SWAP (no transaction)
-- =============================================================================

-- 2.1 Build the unique index without blocking writes; takes minutes on ~76M rows.
--     If this errors, a leftover INVALID index may remain — clean it with
--       DROP INDEX CONCURRENTLY IF EXISTS uq__cp__character_profession_tier;
--     then re-run this statement.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq__cp__character_profession_tier
  ON characters_professions (character_guid, profession_id, tier_id)
  NULLS NOT DISTINCT;

-- 2.2 Must show indisvalid = t and indisready = t before dropping the old index
SELECT c.relname, i.indisvalid, i.indisready, i.indisunique, i.indnullsnotdistinct
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relname = 'uq__cp__character_profession_tier';

-- 2.3 Old plain index away (brief metadata lock, fast)
DROP INDEX IF EXISTS ix__cp__character_profession_tier;

-- =============================================================================
-- 3. VERIFICATION (read-only)
-- =============================================================================

-- 3.1 Exactly one index on the natural key left: UNIQUE, NULLS NOT DISTINCT, valid
SELECT c.relname AS indexname, i.indisvalid, i.indisunique, i.indnullsnotdistinct,
       pg_get_indexdef(i.indexrelid) AS indexdef
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
WHERE t.relname = 'characters_professions'
  AND c.relname IN ('ix__cp__character_profession_tier', 'uq__cp__character_profession_tier');

-- 3.2 ON CONFLICT smoke test — proves the conflict target is inferable again
--     (this exact INSERT throws the production error when the index is missing;
--     no row survives, the transaction only rolls back)
BEGIN;
INSERT INTO characters_professions (character_guid, profession_id, tier_id, is_primary)
VALUES ('__smoke__@__smoke__', 0, NULL, false)
ON CONFLICT (character_guid, profession_id, tier_id) DO UPDATE SET updated_at = now();
ROLLBACK;
