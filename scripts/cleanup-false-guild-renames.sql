-- Cleanup: false guild rename events, round 2.
--
-- Bug: detectAndLogChanges compared guild names with a strict `!==`. Names stored at
-- guild creation come from capitalize(slug) or differently-cased external sources
-- (WoW Progress JSON, addon scans, guid re-splits), while the Blizzard guild summary
-- returns the canonical casing and spacing. On the first successful summary the raw
-- compare flagged the difference as a rename. The August 2026 guild backfill created
-- ~15k such events (e.g. "Just-for-fun" -> "Just for Fun", "Lords of draenor" ->
-- "Lords of Draenor"). A handful are also BullMQ retry triples (log written before
-- guild save, identical created_at).
--
-- A rename event is false when both names are equal after slug normalization
-- (lowercase, whitespace collapsed) — the same rule the fixed TypeScript detection
-- now applies. These events never re-pointed logs: equal slugs mean equal guids,
-- so updateGuildGuidForAllLogs was a no-op. Plain DELETE, no restoration needed.
--
-- Run order: section 1 (pre-checks) -> section 2 (transaction) -> section 3 (verification).

-- =============================================================================
-- 1. PRE-CHECKS (read-only)
-- =============================================================================

-- 1.1 Slug-normalized name expression used throughout (mirrors @app/resources toSlug:
--     trim, whitespace -> dash, collapse dashes, strip leading dash, lowercase)
-- 1.2 False NAME events to delete: names equal after slug normalization
WITH ev AS (
  SELECT * FROM characters_guilds_logs
  WHERE action = 'NAME' AND guild_guid IS NOT NULL
)
SELECT count(*) AS slug_equal_events_to_delete
FROM ev
WHERE lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''));

-- 1.3 Eyeball sample of what will be deleted
SELECT guild_guid, original, updated, created_at
FROM characters_guilds_logs
WHERE action = 'NAME' AND guild_guid IS NOT NULL
  AND lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
ORDER BY created_at DESC
LIMIT 50;

-- 1.4 Residual round-1 class (Blizzard id mismatch steal), expected 0 after the
--     2026-09-01 cleanup — re-check in case new ones slipped in
SELECT count(*) AS id_mismatch_false_events
FROM characters_guilds_logs ev
JOIN guilds g ON g.guid = ev.guild_guid
JOIN guilds o ON o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id;

-- =============================================================================
-- 2. TRANSACTION: delete false rename events
-- =============================================================================

BEGIN;

DELETE FROM characters_guilds_logs
WHERE action = 'NAME'
  AND guild_guid IS NOT NULL
  AND lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''));

DELETE FROM characters_guilds_logs ev
USING guilds g, guilds o
WHERE ev.action = 'NAME'
  AND ev.guild_guid IS NOT NULL
  AND g.guid = ev.guild_guid
  AND o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
  AND o.id IS DISTINCT FROM g.id;

-- Check the reported row counts against section 1, then:
COMMIT;
-- or ROLLBACK; if anything looks off.

-- =============================================================================
-- 3. VERIFICATION (after commit)
-- =============================================================================

-- 3.1 Remaining NAME events where names differ only by slug-irrelevant formatting
--    (expected 0)
SELECT count(*) AS remaining_slug_equal_events
FROM characters_guilds_logs
WHERE action = 'NAME' AND guild_guid IS NOT NULL
  AND lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''));

-- 3.2 Overall NAME event health after cleanup
SELECT count(*) AS remaining_name_events, count(DISTINCT guild_guid) AS guilds_with_renames
FROM characters_guilds_logs
WHERE action = 'NAME' AND guild_guid IS NOT NULL;

-- 3.3 Spot-check a previously affected guild page
SELECT guild_guid, original, updated, created_at
FROM characters_guilds_logs
WHERE guild_guid = 'департация@gordunni' AND action = 'NAME';
