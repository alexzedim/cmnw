-- Migration: 2026-08-25-02 normalize characters.realm / realm_name
--
-- Problem:
--   characters.realm holds three formats: canonical realms.slug (~6.4M rows),
--   display names written by the legacy guild-roster DAO path ('Silvermoon',
--   'Tarren Mill' — 1,857,430 rows, all of them without avatar data), and
--   accented localized slugs that are already canonical Battle.net slugs
--   ('pozzo-delleternità' — unchanged by this migration).
--   characters.realm_name mixed realms.name with realms.localeName.
--
-- What this does:
--   Normalizes characters.realm -> realms.slug and characters.realm_name ->
--   realms.name by realm_id, plus characters_profile.realm -> realms.slug.
--
-- Notes:
--   Touches ~1.9M rows in one transaction. Run off-peak with workers stopped;
--   expect table rewrite load and follow-up autovacuum on characters.
--
--   psql "$DATABASE_URL" -f migrations/2026-08-25-02-normalize-characters-realm.sql

BEGIN;

UPDATE characters c
SET realm = r.slug,
    realm_name = r.name
FROM realms r
WHERE c.realm_id = r.id
  AND (c.realm IS DISTINCT FROM r.slug OR c.realm_name IS DISTINCT FROM r.name);

UPDATE characters_profile p
SET realm = r.slug
FROM realms r
WHERE p.realm_id = r.id
  AND p.realm IS DISTINCT FROM r.slug;

DO $$
DECLARE
  mismatched int;
BEGIN
  SELECT COUNT(*) INTO mismatched
  FROM characters c
  JOIN realms r ON r.id = c.realm_id
  WHERE c.realm IS DISTINCT FROM r.slug
     OR c.realm_name IS DISTINCT FROM r.name;

  IF mismatched > 0 THEN
    RAISE EXCEPTION 'realm normalization incomplete: % rows mismatch', mismatched;
  END IF;
END $$;

COMMIT;
