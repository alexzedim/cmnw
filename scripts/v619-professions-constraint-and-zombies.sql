-- v6.19.0: professions natural-key constraint + zombie tables drop.
--
-- 1) characters_professions: replace the plain index on the natural key with a
--    UNIQUE index (NULLS NOT DISTINCT — tier_id is nullable for tierless
--    professions; without it ON CONFLICT would never match NULL tiers and
--    duplicates would accumulate). Enables the upsert in syncCharacterProfessions
--    and ends the unconditional delete+save churn (~11M row-ops/day).
-- 2) characters_pets / characters_mounts: zombie tables, zero writers since the
--    farmhash refactor (live=0), removed from the entity list in v6.19.0.
--
-- Run order: section 1 (pre-checks) -> section 2 (transaction) -> section 3 (verification).
-- All sections are idempotent — re-running after a partial execution is safe.
-- Timing: safe to run while the OLD osint code is still deployed (delete+save is
-- compatible with the constraint). After the zombie DROP, do NOT restart any
-- pre-v6.19.0 image (synchronize would recreate the tables at boot); deploying
-- v6.19.0 immediately after is the intended flow.

-- =============================================================================
-- 1. PRE-CHECKS (read-only)
-- =============================================================================

-- 1.1 Duplicate natural keys (delete+save made these practically impossible;
--     NULLs group together here, matching NULLS NOT DISTINCT semantics)
SELECT character_guid, profession_id, tier_id, count(*) AS copies
FROM characters_professions
GROUP BY character_guid, profession_id, tier_id
HAVING count(*) > 1
ORDER BY copies DESC
LIMIT 20;

-- 1.2 Zombie tables row counts (expected 0; proves no writer remains)
SELECT 'characters_pets' AS table_name, count(*) AS rows FROM characters_pets
UNION ALL
SELECT 'characters_mounts', count(*) FROM characters_mounts;

-- 1.3 Current professions index shape
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'characters_professions' AND indexname = 'ix__cp__character_profession_tier';

-- =============================================================================
-- 2. TRANSACTION
-- =============================================================================

BEGIN;

-- 2.1 Deduplicate if 1.1 found any (keep latest updated_at; uuid tiebreak keeps exactly one)
DELETE FROM characters_professions
WHERE uuid IN (
  SELECT uuid FROM (
    SELECT uuid, row_number() OVER (
      PARTITION BY character_guid, profession_id, tier_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, uuid
    ) AS rn
    FROM characters_professions
  ) ranked
  WHERE rn > 1
);

-- 2.2 Plain index -> UNIQUE (NULLS NOT DISTINCT), same name
DROP INDEX IF EXISTS ix__cp__character_profession_tier;

CREATE UNIQUE INDEX ix__cp__character_profession_tier
  ON characters_professions (character_guid, profession_id, tier_id)
  NULLS NOT DISTINCT;

-- 2.3 Zombie tables away
DROP TABLE IF EXISTS characters_pets;
DROP TABLE IF EXISTS characters_mounts;

COMMIT;

-- =============================================================================
-- 3. VERIFICATION (read-only)
-- =============================================================================

-- 3.1 Unique index in place
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'characters_professions' AND indexname = 'ix__cp__character_profession_tier';

-- 3.2 Zero duplicates remain
SELECT count(*) AS duplicate_groups FROM (
  SELECT character_guid, profession_id, tier_id
  FROM characters_professions
  GROUP BY character_guid, profession_id, tier_id
  HAVING count(*) > 1
) d;

-- 3.3 Zombie tables gone
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('characters_pets', 'characters_mounts');
