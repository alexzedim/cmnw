-- Migration: 2026-08-25-03 clean non-canonical guild_guid references
--
-- Problem:
--   30 characters rows (all ravencrest, sourced from OSINT-WARCRAFT-LOGS)
--   carry a mojibake guild reference:
--     guild_guid = '¹²³@¼±¶÷¾‡¥¦•‰°¢¤¨½ª§®©™@¼±¶÷¾‡¥¦•‰°¢¤¨½ª§®©™'
--   A guild name containing '@' and control-range characters produced a
--   multi-@ guid whose realm part matches no realms.slug.
--
-- What this does:
--   Nulls guild/guild_id/guild_guid/guild_rank for every characters row whose
--   guild_guid realm part is not a canonical realms.slug (measured 2026-08-25:
--   exactly the 30 mojibake rows). The characters worker re-attaches the real
--   guild on the next summary refresh.
--
--   psql "$DATABASE_URL" -f migrations/2026-08-25-03-clean-noncanonical-guild-guids.sql

BEGIN;

UPDATE characters c
SET guild = NULL,
    guild_id = NULL,
    guild_guid = NULL,
    guild_rank = NULL
WHERE c.guild_guid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM realms r
    WHERE r.slug = split_part(c.guild_guid, '@', 2)
  );

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM characters c
  WHERE c.guild_guid IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM realms r
      WHERE r.slug = split_part(c.guild_guid, '@', 2)
    );

  IF remaining > 0 THEN
    RAISE EXCEPTION 'guild_guid cleanup incomplete: % non-canonical refs remain', remaining;
  END IF;
END $$;

COMMIT;
