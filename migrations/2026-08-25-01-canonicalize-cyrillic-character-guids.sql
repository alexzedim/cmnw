-- Migration: 2026-08-25-01 canonicalize Cyrillic character GUIDs
--
-- Problem:
--   28,866 characters.guid rows carry a Russian localized realm slug in the
--   realm part (e.g. 'итодори@гордунни'), byte-equal to realms.locale_slug.
--   They were produced by legacy ingestion paths: warcraft-logs before fix
--   3af388f7 (28,679 rows, 2025-10-25..2026-03-16) and one-off addon scan /
--   migration imports from RU game clients (187 rows, 2026-04-12).
--   The canonical form is '<name>@<realms.slug>'.
--   26,716 of these rows duplicate an existing canonical row (same name part
--   and realm_id); ~2,150 are the only row for that character.
--
-- What this does:
--   1. Builds an old_guid -> new_guid map via realms.slug (join on realm_id).
--   2. Rewrites child references. Conflict-aware where character_guid is
--      UNIQUE (hash_block_members) or a PK (characters_profile.guid):
--      blocked duplicates are dropped instead of moved.
--   3. Preserves guild fields from dirty duplicate rows onto canonical twins.
--   4. Deletes duplicate dirty rows, renames the remaining ones.
--
-- Expected effect (measured 2026-08-25):
--   ~26,716 characters deleted, ~2,150 renamed,
--   ~151 hash_block_members refs moved (conflicting memberships dropped),
--   ~30 characters_profile rows moved, ~4 characters_guilds_logs and
--   ~4 hash_block_logs rows rewritten, 0 refs in mounts/pets/professions/
--   guild_members.
--
-- Run with character-writing workers (osint, warcraft-logs) stopped:
--   psql "$DATABASE_URL" -f migrations/2026-08-25-01-canonicalize-cyrillic-character-guids.sql

BEGIN;

CREATE TEMP TABLE _cyrillic_guid_map ON COMMIT DROP AS
SELECT
  c.guid AS old_guid,
  split_part(c.guid, '@', 1) || '@' || r.slug AS new_guid
FROM characters c
JOIN realms r ON r.id = c.realm_id
WHERE split_part(c.guid, '@', 2) ~ '[\u0400-\u04FF]';

-- 1. hash_block_members: character_guid is UNIQUE (uq__hash_block_members__character_guid)
UPDATE hash_block_members m
SET character_guid = map.new_guid
FROM _cyrillic_guid_map map
WHERE m.character_guid = map.old_guid
  AND NOT EXISTS (SELECT 1 FROM hash_block_members x WHERE x.character_guid = map.new_guid);

DELETE FROM hash_block_members m
USING _cyrillic_guid_map map
WHERE m.character_guid = map.old_guid;

-- 2. characters_profile: guid is PK
UPDATE characters_profile p
SET guid = map.new_guid
FROM _cyrillic_guid_map map
WHERE p.guid = map.old_guid
  AND NOT EXISTS (SELECT 1 FROM characters_profile x WHERE x.guid = map.new_guid);

DELETE FROM characters_profile p
USING _cyrillic_guid_map map
WHERE p.guid = map.old_guid;

-- 3. tables without guid uniqueness: plain rewrites
UPDATE characters_guilds_logs t SET character_guid = map.new_guid FROM _cyrillic_guid_map map WHERE t.character_guid = map.old_guid;
UPDATE hash_block_logs t SET character_guid = map.new_guid FROM _cyrillic_guid_map map WHERE t.character_guid = map.old_guid;
UPDATE characters_guild_members t SET character_guid = map.new_guid FROM _cyrillic_guid_map map WHERE t.character_guid = map.old_guid;
UPDATE characters_mounts t SET character_guid = map.new_guid FROM _cyrillic_guid_map map WHERE t.character_guid = map.old_guid;
UPDATE characters_pets t SET character_guid = map.new_guid FROM _cyrillic_guid_map map WHERE t.character_guid = map.old_guid;
UPDATE characters_professions t SET character_guid = map.new_guid FROM _cyrillic_guid_map map WHERE t.character_guid = map.old_guid;

-- 4. preserve guild fields from dirty rows onto their canonical twins
UPDATE characters t
SET guild_guid = d.guild_guid,
    guild = d.guild,
    guild_id = d.guild_id,
    guild_rank = d.guild_rank
FROM _cyrillic_guid_map map
JOIN characters d ON d.guid = map.old_guid
WHERE t.guid = map.new_guid
  AND t.guild_guid IS NULL
  AND d.guild_guid IS NOT NULL;

-- 5. delete dirty rows that duplicate a canonical row
DELETE FROM characters c
USING _cyrillic_guid_map map
WHERE c.guid = map.old_guid
  AND EXISTS (SELECT 1 FROM characters x WHERE x.guid = map.new_guid);

-- 6. rename the remaining dirty rows to canonical guids
UPDATE characters c
SET guid = map.new_guid
FROM _cyrillic_guid_map map
WHERE c.guid = map.old_guid
  AND NOT EXISTS (SELECT 1 FROM characters x WHERE x.guid = map.new_guid);

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM characters
  WHERE split_part(guid, '@', 2) ~ '[\u0400-\u04FF]';

  IF remaining > 0 THEN
    RAISE EXCEPTION 'canonicalization incomplete: % cyrillic-realm guids remain', remaining;
  END IF;
END $$;

COMMIT;
